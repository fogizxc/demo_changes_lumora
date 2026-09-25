import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import crypto from 'node:crypto';

export const tenantsRouter = Router();

// Helper to get active business id
export function getActiveBusinessId(req: Request, targetIndustry?: string): string {
  // 1. If request has explicit header or session override
  const headerBiz = req.headers['x-business-id'] as string;
  if (headerBiz) return headerBiz;

  // 2. Infer industry from targetIndustry argument OR request URL path
  let industry = targetIndustry;
  if (!industry && req.originalUrl) {
    if (req.originalUrl.includes('/api/healthcare')) industry = 'HEALTHCARE';
    else if (req.originalUrl.includes('/api/gym')) industry = 'GYM';
    else if (req.originalUrl.includes('/api/restaurant')) industry = 'RESTAURANT';
    else if (req.originalUrl.includes('/api/repair')) industry = 'REPAIR';
    else if (req.originalUrl.includes('/api/rental')) industry = 'RENTAL';
  }

  // 3. If authenticated user has matching industry shop
  if (req.auth?.shopId) {
    if (!industry) return req.auth.shopId;
    const userBiz = db.prepare('SELECT industry FROM businesses WHERE id = ?').get(req.auth.shopId) as any;
    if (userBiz && userBiz.industry === industry) {
      return req.auth.shopId;
    }
    const userShop = db.prepare('SELECT shop_type FROM shops WHERE id = ?').get(req.auth.shopId) as any;
    if (userShop) {
      const st = (userShop.shop_type || '').toUpperCase();
      if (
        st.includes(industry) ||
        (industry === 'HEALTHCARE' && (st.includes('HOSPITAL') || st.includes('CLINIC'))) ||
        (industry === 'GYM' && (st.includes('FITNESS') || st.includes('WORKOUT'))) ||
        (industry === 'RESTAURANT' && (st.includes('DINING') || st.includes('CAFE') || st.includes('FOOD'))) ||
        (industry === 'RENTAL' && (st.includes('FLEET') || st.includes('EQUIPMENT'))) ||
        (industry === 'REPAIR' && (st.includes('SERVICE') || st.includes('WORKSHOP')))
      ) {
        return req.auth.shopId;
      }
    }
  }

  // 4. Return matching seeded business for that industry
  if (industry) {
    const indBiz = db.prepare('SELECT id FROM businesses WHERE industry = ? LIMIT 1').get(industry) as any;
    if (indBiz) return indBiz.id;
  }

  return 'shp_urbanmart_01';
}

// 1. List all available businesses
tenantsRouter.get('/businesses', (req: Request, res: Response) => {
  const businesses = db.prepare(`
    SELECT * FROM businesses ORDER BY created_at ASC
  `).all().map((b: any) => ({
    ...b,
    enabled_modules: JSON.parse(b.enabled_modules || '[]'),
    tax_configuration: JSON.parse(b.tax_configuration || '{}'),
    settings: JSON.parse(b.settings || '{}'),
  }));

  res.json({ businesses });
});

// 2. Get current active business & branches
tenantsRouter.get('/current', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(bizId) as any;

  if (!business) {
    return res.status(404).json({ error: 'Business not found' });
  }

  const branches = db.prepare('SELECT * FROM branches WHERE business_id = ? ORDER BY created_at ASC').all(bizId);

  res.json({
    business: {
      ...business,
      enabled_modules: JSON.parse(business.enabled_modules || '[]'),
      tax_configuration: JSON.parse(business.tax_configuration || '{}'),
      settings: JSON.parse(business.settings || '{}'),
    },
    branches,
  });
});

// 3. Switch active business in session
tenantsRouter.post('/switch', (req: Request, res: Response) => {
  const { businessId } = req.body;
  if (!businessId) {
    return res.status(400).json({ error: 'Business ID is required' });
  }

  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(businessId) as any;
  if (!business) {
    return res.status(404).json({ error: 'Selected business does not exist' });
  }

  // If user has a token, update the token's shop_id to the new business
  if (req.auth?.token) {
    db.prepare('UPDATE auth_tokens SET shop_id = ? WHERE token = ?').run(businessId, req.auth.token);
  }

  const branches = db.prepare('SELECT * FROM branches WHERE business_id = ?').all(businessId);

  res.json({
    success: true,
    business: {
      ...business,
      enabled_modules: JSON.parse(business.enabled_modules || '[]'),
      tax_configuration: JSON.parse(business.tax_configuration || '{}'),
      settings: JSON.parse(business.settings || '{}'),
    },
    branches,
  });
});

// 4. Onboard New Business (9-Step complete onboarding)
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
        modules = ['PATIENTS', 'DOCTORS', 'DEPARTMENTS', 'APPOINTMENTS', 'MEDICAL_RECORDS', 'BILLING', 'PAYMENTS', 'REPORTS'];
        break;
      case 'GYM':
        modules = ['MEMBERS', 'PLANS', 'MEMBERSHIPS', 'ATTENDANCE', 'CLASSES', 'BILLING', 'REPORTS'];
        break;
      case 'RESTAURANT':
        modules = ['TABLES', 'MENU', 'ORDERS', 'KOT', 'KITCHEN', 'BILLING', 'PAYMENTS'];
        break;
      case 'REPAIR':
        modules = ['JOB_CARDS', 'TECHNICIANS', 'DIAGNOSIS', 'PARTS', 'ESTIMATES', 'BILLING'];
        break;
      case 'RENTAL':
        modules = ['RENTAL_ASSETS', 'BOOKINGS', 'DEPOSITS', 'INSPECTION', 'LATE_FEES'];
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

  // Also synchronize to 'shops' table for POS backward compatibility
  db.prepare(`
    INSERT OR IGNORE INTO shops (id, name, gst_number, vat_number, phone, address, short_note, shop_type, tax_state, status, created_at, updated_at)
    VALUES (?, ?, 'GST-PENDING', NULL, ?, ?, 'Multi-industry initialized', ?, 'INTRA_STATE', 'ACTIVE', ?, ?)
  `).run(id, name, phone || '0000000000', address || 'HQ', industry.toLowerCase(), now, now);

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

// 5. Get list of branches
tenantsRouter.get('/branches', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const branches = db.prepare('SELECT * FROM branches WHERE business_id = ? ORDER BY created_at ASC').all(bizId);
  res.json({ branches });
});

// 6. Create new branch
tenantsRouter.post('/branches', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
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
      { id: 'MANAGER', name: 'Department Manager', description: 'Supervises staff, scheduling & inventory' },
      { id: 'STAFF', name: 'Operational Staff', description: 'Daily task execution & patient/customer handling' },
      { id: 'CASHIER', name: 'Billing / Cashier', description: 'Point of sale, payment collection & tills' },
    ],
    professions: [
      { id: 'DOCTOR', name: 'Physician / Medical Doctor', industry: 'HEALTHCARE' },
      { id: 'NURSE', name: 'Nurse / Triage Specialist', industry: 'HEALTHCARE' },
      { id: 'FITNESS_TRAINER', name: 'Personal Trainer / Coach', industry: 'GYM' },
      { id: 'CHEF', name: 'Executive Chef / Line Cook', industry: 'RESTAURANT' },
      { id: 'TECHNICIAN', name: 'Hardware / Diagnostic Tech', industry: 'REPAIR' },
      { id: 'STYLIST', name: 'Hair & Aesthetic Stylist', industry: 'SALON' },
    ],
  });
});
