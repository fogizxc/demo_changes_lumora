import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import crypto from 'node:crypto';
import { resolveTenantContext, requireTenantContext } from '../services/tenantContext.js';
import { logAuditEvent } from '../services/audit.js';

export const tenantsRouter = Router();

/**
 * Enterprise Canonical Tenant Resolver:
 * CLIENT REQUESTS. SERVER AUTHORIZES. DATABASE ENFORCES.
 * 
 * Tenant identity MUST be derived from:
 * Authenticated Identity -> Tenant Membership -> Authorized Tenant
 * 
 * NEVER trust client x-business-id headers or unauthenticated fallbacks.
 */
export function getActiveBusinessId(req: Request, targetIndustry?: string): string {
  // 1. If TenantContext is already resolved on request
  if (req.tenantContext?.tenantId && req.tenantContext.tenantId !== 'platform_root') {
    return req.tenantContext.tenantId;
  }

  // 2. If authenticated session has shopId / tenantId bound to token
  if (req.auth?.shopId) {
    // If client supplied x-business-id header, verify it strictly matches authorized token
    const clientHeader = req.headers['x-business-id'] as string;
    if (clientHeader && clientHeader !== req.auth.shopId && req.auth.role !== 'SUPER_ADMIN') {
      // Hostile attempt to spoof tenant ID: enforce authorized tenant identity
      console.warn(`[SECURITY WARNING] Client attempted tenant spoofing with header ${clientHeader}, enforcing authorized ${req.auth.shopId}`);
    }
    return req.auth.shopId;
  }

  // 3. Super Admin elevation with explicit target tenant
  if (req.auth?.role === 'SUPER_ADMIN') {
    const clientHeader = req.headers['x-business-id'] as string;
    if (clientHeader) {
      const exists = db.prepare('SELECT id FROM businesses WHERE id = ?').get(clientHeader) as any;
      if (exists) return exists.id;
    }
    const firstBiz = db.prepare('SELECT id FROM businesses LIMIT 1').get() as any;
    if (firstBiz) return firstBiz.id;
  }

  throw new Error('Tenant authorization failed: No valid tenant identity bound to authenticated context.');
}

// 1. List accessible businesses for authenticated user (or all if Super Admin)
tenantsRouter.get('/businesses', (req: Request, res: Response) => {
  if (!req.auth) {
    // Unauthenticated: return only public basic list without sensitive settings
    const publicList = db.prepare(`
      SELECT id, name, industry, business_type, status, city, country
      FROM businesses WHERE status = 'ACTIVE'
      ORDER BY name ASC
    `).all();
    return res.json({ businesses: publicList });
  }

  if (req.auth.role === 'SUPER_ADMIN') {
    const businesses = db.prepare(`
      SELECT * FROM businesses ORDER BY created_at ASC
    `).all().map((b: any) => ({
      ...b,
      enabled_modules: parseJsonSafe(b.enabled_modules, []),
      tax_configuration: parseJsonSafe(b.tax_configuration, {}),
      settings: parseJsonSafe(b.settings, {}),
    }));
    return res.json({ businesses });
  }

  // Standard user or employee: ONLY return businesses for which they hold an active membership
  const actorId = req.auth.userId || req.auth.employeeId;
  const memberships = db.prepare(`
    SELECT b.*, m.role as user_role, m.branch_id as user_branch_id
    FROM user_tenant_memberships m
    JOIN businesses b ON b.id = m.tenant_id
    WHERE m.user_id = ? AND m.status = 'ACTIVE' AND b.status = 'ACTIVE'
    ORDER BY b.name ASC
  `).all(actorId).map((b: any) => ({
    ...b,
    enabled_modules: parseJsonSafe(b.enabled_modules, []),
    tax_configuration: parseJsonSafe(b.tax_configuration, {}),
    settings: parseJsonSafe(b.settings, {}),
  }));

  res.json({ businesses: memberships });
});

// 2. Get current active business & branches (Server Authorized)
tenantsRouter.get('/current', resolveTenantContext, (req: Request, res: Response) => {
  const ctx = req.tenantContext;
  if (!ctx) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(ctx.tenantId) as any;
  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }

  const branches = db.prepare('SELECT * FROM branches WHERE business_id = ? ORDER BY created_at ASC').all(ctx.tenantId);

  res.json({
    business: {
      ...business,
      enabled_modules: ctx.enabledModules,
      tax_configuration: parseJsonSafe(business.tax_configuration, {}),
      settings: parseJsonSafe(business.settings, {}),
    },
    branches,
    userContext: {
      role: ctx.role,
      permissions: ctx.permissions,
      actorId: ctx.actorId,
    },
  });
});

// 3. Secure Tenant Switching: Strictly verifies membership before allowing switch
tenantsRouter.post('/switch', (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ error: 'Authentication required to switch tenant.' });
  }

  const { businessId } = req.body;
  if (!businessId) {
    return res.status(400).json({ error: 'Business ID is required' });
  }

  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId) as any;
  if (!business) {
    return res.status(404).json({ error: 'Target tenant does not exist' });
  }

  if (business.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Cannot switch to a suspended tenant.' });
  }

  const actorId = req.auth.userId || req.auth.employeeId;

  // STRICT MEMBERSHIP VERIFICATION:
  // Super Admin can switch to any tenant for support.
  // Standard users MUST possess an active membership in user_tenant_memberships!
  if (req.auth.role !== 'SUPER_ADMIN') {
    const membership = db.prepare(`
      SELECT * FROM user_tenant_memberships
      WHERE user_id = ? AND tenant_id = ? AND status = 'ACTIVE'
    `).get(actorId, businessId) as any;

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden: You do not possess an active membership with this tenant. Access rejected.',
        tenantId: businessId,
      });
    }
  }

  // Update token's shop_id to authorized tenant
  if (req.auth.token) {
    db.prepare('UPDATE auth_tokens SET shop_id = ? WHERE token = ?').run(businessId, req.auth.token);
  }

  logAuditEvent({
    actorId: actorId || 'UNKNOWN',
    actorRole: req.auth.role,
    shopId: businessId,
    action: 'TENANT_SWITCHED',
    targetType: 'TENANT',
    targetId: businessId,
    after: { tenantName: business.name, industry: business.industry },
  });

  const branches = db.prepare('SELECT * FROM branches WHERE business_id = ?').all(businessId);

  res.json({
    success: true,
    business: {
      ...business,
      enabled_modules: parseJsonSafe(business.enabled_modules, []),
      tax_configuration: parseJsonSafe(business.tax_configuration, {}),
      settings: parseJsonSafe(business.settings, {}),
    },
    branches,
  });
});

// 4. Onboard New Business (Full 9-Step Onboarding with Automatic Membership Creation)
tenantsRouter.post('/onboard', (req: Request, res: Response) => {
  const {
    name,
    industry,
    businessType,
    email,
    phone,
    website,
    address,
    city,
    state,
    country,
    currency,
    timezone,
    branches: initialBranches,
    enabledModules,
    taxConfiguration,
    settings,
  } = req.body;

  if (!name || !industry) {
    return res.status(400).json({ error: 'Business name and industry are required' });
  }

  const id = 'biz_' + crypto.randomBytes(6).toString('hex');
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + id.slice(-4);
  const now = new Date().toISOString();

  // Default modules mapped to industry if not specified
  let modules = enabledModules;
  if (!modules || modules.length === 0) {
    switch (industry) {
      case 'HEALTHCARE':
        modules = ['HEALTHCARE', 'PATIENTS', 'DOCTORS', 'DEPARTMENTS', 'APPOINTMENTS', 'MEDICAL_RECORDS', 'BILLING', 'PAYMENTS', 'REPORTS'];
        break;
      case 'GYM':
        modules = ['GYM', 'MEMBERS', 'PLANS', 'MEMBERSHIPS', 'ATTENDANCE', 'CLASSES', 'BILLING', 'REPORTS'];
        break;
      case 'RESTAURANT':
        modules = ['RESTAURANT', 'TABLES', 'MENU', 'ORDERS', 'KOT', 'KITCHEN', 'BILLING', 'PAYMENTS', 'REPORTS'];
        break;
      case 'REPAIR':
        modules = ['REPAIR', 'JOB_CARDS', 'TECHNICIANS', 'DIAGNOSIS', 'PARTS', 'ESTIMATES', 'BILLING', 'REPORTS'];
        break;
      case 'RENTAL':
        modules = ['RENTAL', 'RENTAL_ASSETS', 'BOOKINGS', 'DEPOSITS', 'INSPECTION', 'LATE_FEES', 'REPORTS'];
        break;
      default:
        modules = ['POS', 'INVENTORY', 'PRODUCTS', 'CUSTOMERS', 'SUPPLIERS', 'ORDERS', 'BILLING', 'EXPENSES', 'REPORTS'];
    }
  }

  // Insert business
  db.prepare(`
    INSERT INTO businesses (
      id, name, slug, industry, business_type, status, logo, email, phone, website,
      address, country, state, city, timezone, currency, tax_configuration, enabled_modules, settings, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    slug,
    industry,
    businessType || 'STANDARD',
    email || null,
    phone || null,
    website || null,
    address || null,
    country || 'India',
    state || 'Maharashtra',
    city || 'Mumbai',
    timezone || 'Asia/Kolkata',
    currency || 'INR',
    JSON.stringify(taxConfiguration || {}),
    JSON.stringify(modules),
    JSON.stringify(settings || {}),
    now,
    now
  );

  // Insert initial branch
  const branchList = Array.isArray(initialBranches) && initialBranches.length > 0
    ? initialBranches
    : [{ name: 'Main Branch', code: 'BRN-01', address: address || 'Headquarters' }];

  const createdBranches: any[] = [];
  for (let i = 0; i < branchList.length; i++) {
    const b = branchList[i];
    const branchId = 'brn_' + crypto.randomBytes(6).toString('hex');
    db.prepare(`
      INSERT INTO branches (id, business_id, name, code, address, phone, timezone, status, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', '{}', ?, ?)
    `).run(
      branchId,
      id,
      b.name || `Branch ${i + 1}`,
      b.code || `BRN-${String(i + 1).padStart(2, '0')}`,
      b.address || address || null,
      b.phone || phone || null,
      timezone || 'Asia/Kolkata',
      now,
      now
    );
    createdBranches.push({ id: branchId, business_id: id, name: b.name, code: b.code });
  }

  // Synchronize to 'shops' table for POS backward compatibility
  db.prepare(`
    INSERT OR IGNORE INTO shops (id, name, gst_number, vat_number, phone, address, short_note, shop_type, tax_state, status, created_at, updated_at)
    VALUES (?, ?, 'GST-PENDING', NULL, ?, ?, 'Multi-industry initialized', ?, 'INTRA_STATE', 'ACTIVE', ?, ?)
  `).run(id, name, phone || '0000000000', address || 'HQ', industry.toLowerCase(), now, now);

  // If creator is authenticated user, bind them as OWNER in user_tenant_memberships
  if (req.auth?.userId) {
    const memId = 'mem_' + crypto.randomBytes(6).toString('hex');
    db.prepare(`
      INSERT OR IGNORE INTO user_tenant_memberships (id, user_id, tenant_id, role, status, created_at, updated_at)
      VALUES (?, ?, ?, 'OWNER', 'ACTIVE', ?, ?)
    `).run(memId, req.auth.userId, id, now, now);
  }

  res.status(201).json({
    success: true,
    business: {
      id,
      name,
      slug,
      industry,
      business_type: businessType || 'STANDARD',
      status: 'ACTIVE',
      enabled_modules: modules,
      currency: currency || 'INR',
    },
    branches: createdBranches,
  });
});

// 5. Get list of branches for active tenant
tenantsRouter.get('/branches', resolveTenantContext, (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const branches = db.prepare('SELECT * FROM branches WHERE business_id = ? ORDER BY created_at ASC').all(bizId);
  res.json({ branches });
});

// 6. Create new branch in active tenant
tenantsRouter.post('/branches', resolveTenantContext, (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { name, code, address, phone } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Branch name and code are required' });
  }

  const id = 'brn_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO branches (id, business_id, name, code, address, phone, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `).run(id, bizId, name, code, address || null, phone || null, now, now);

  res.status(201).json({
    success: true,
    branch: { id, business_id: bizId, name, code, address, phone },
  });
});

// 7. Roles & Permissions matrix
tenantsRouter.get('/roles-permissions', (req: Request, res: Response) => {
  res.json({
    roles: [
      { id: 'OWNER', name: 'Business Owner', description: 'Full business & financial sovereignty' },
      { id: 'ADMIN', name: 'Branch Admin', description: 'Operational administration of branch' },
      { id: 'SHIFT_LEAD', name: 'Shift / Floor Lead', description: 'Supervises staff, voids, discounts & tills' },
      { id: 'CASHIER', name: 'Billing / Cashier', description: 'Point of sale, payment collection & checkouts' },
      { id: 'DOCTOR', name: 'Physician / Medical Doctor', description: 'Consultations, clinical diagnoses & prescriptions' },
      { id: 'NURSE', name: 'Staff Nurse / OPD Assistant', description: 'Triage, vital signs recording & appointments' },
      { id: 'FITNESS_COACH', name: 'Fitness Coach / Trainer', description: 'Member training & attendance tracking' },
      { id: 'WAITER', name: 'Senior Waiter / Floor Staff', description: 'Table reservations & dining orders' },
      { id: 'TECHNICIAN', name: 'Hardware Repair Specialist', description: 'Diagnostic bench testing & spare parts' },
    ],
  });
});

function parseJsonSafe(val: any, fallback: any): any {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}
