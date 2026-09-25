import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { logAuditEvent } from './audit.js';
import crypto from 'node:crypto';

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  industry: string;
  enabledModules: string[];
  branchId?: string;
  userId?: string;
  employeeId?: string;
  actorId: string;
  role: string;
  permissions: string[];
  isImpersonating?: boolean;
  superAdminId?: string;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

// Canonical granular permissions mapping for standard enterprise roles
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  OWNER: ['*'],
  SHOP_ADMIN: [
    'sales.read',
    'sales.create',
    'sales.refund',
    'sales.void',
    'sales.cost_price.read',
    'inventory.read',
    'inventory.create',
    'inventory.adjust',
    'inventory.cost.read',
    'customers.read',
    'customers.manage',
    'suppliers.read',
    'suppliers.manage',
    'reports.read',
    'reports.financial',
    'employees.read',
    'employees.manage',
    'finance.expenses',
    'appointments.read',
    'appointments.manage',
    'healthcare.patient.read',
    'healthcare.patient.write',
    'healthcare.medical_record.read',
    'healthcare.medical_record.write',
    'healthcare.doctor.manage',
    'gym.member.read',
    'gym.member.write',
    'gym.attendance.manage',
    'gym.plans.manage',
    'restaurant.tables.manage',
    'restaurant.orders.manage',
    'restaurant.kot.manage',
    'repair.jobs.read',
    'repair.jobs.write',
    'rental.assets.manage',
    'rental.bookings.manage',
    'services.manage',
    'tenant.settings.manage',
  ],
  SHIFT_LEAD: [
    'sales.read',
    'sales.create',
    'sales.refund',
    'sales.void',
    'inventory.read',
    'inventory.adjust',
    'customers.read',
    'customers.manage',
    'reports.read',
    'appointments.read',
    'appointments.manage',
    'healthcare.patient.read',
    'healthcare.appointment.manage',
    'gym.member.read',
    'gym.attendance.manage',
    'restaurant.tables.manage',
    'restaurant.orders.manage',
    'repair.jobs.read',
    'rental.assets.manage',
  ],
  CASHIER: [
    'sales.read',
    'sales.create',
    'inventory.read', // Note: sales.cost_price.read is intentionally OMITTED for cashier security
    'customers.read',
    'customers.manage',
    'appointments.read',
    'restaurant.tables.manage',
    'restaurant.orders.manage',
  ],
  DOCTOR: [
    'healthcare.patient.read',
    'healthcare.patient.write',
    'healthcare.medical_record.read',
    'healthcare.medical_record.write',
    'healthcare.appointment.manage',
    'appointments.read',
    'appointments.manage',
  ],
  NURSE: [
    'healthcare.patient.read',
    'healthcare.patient.write',
    'healthcare.medical_record.read',
    'healthcare.appointment.manage',
    'appointments.read',
    'appointments.manage',
  ],
  RECEPTIONIST: [
    'healthcare.patient.read',
    'healthcare.patient.write',
    'healthcare.appointment.manage',
    'appointments.read',
    'appointments.manage',
    'customers.read',
    'customers.manage',
    'sales.read',
    'sales.create',
  ],
  FITNESS_COACH: [
    'gym.member.read',
    'gym.attendance.manage',
    'appointments.read',
  ],
  WAITER: [
    'restaurant.tables.manage',
    'restaurant.orders.manage',
  ],
  TECHNICIAN: [
    'repair.jobs.read',
    'repair.jobs.write',
    'inventory.read',
  ],
};

/**
 * Resolves permissions for a given role
 */
export function getPermissionsForRole(role: string): string[] {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['CASHIER'] || [];
}

/**
 * Check if given permissions include a required permission
 */
export function hasPermission(granted: string[], required: string): boolean {
  if (granted.includes('*')) return true;
  if (granted.includes(required)) return true;
  const [reqModule] = required.split('.');
  if (granted.includes(`${reqModule}.*`)) return true;
  return false;
}

/**
 * Core Tenant Context Resolution Middleware
 * CLIENT REQUESTS. SERVER AUTHORIZES. DATABASE ENFORCES.
 * 
 * Enforces:
 * 1. Authentication requirement.
 * 2. Resolution of authorized tenant strictly from authenticated identity & active membership.
 * 3. Complete rejection of unauthenticated client-controlled overrides (e.g. x-business-id header).
 * 4. Verification that tenant exists and is not suspended.
 * 5. Feature entitlement loading from database.
 */
export function resolveTenantContext(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    return res.status(401).json({ error: 'Authentication required. No active session token found.' });
  }

  // 1. Super Admin special elevation
  if (req.auth.role === 'SUPER_ADMIN') {
    // If super admin is impersonating or targeting a specific shop
    const targetShopId = req.auth.shopId || (req.headers['x-target-tenant'] as string);
    if (targetShopId) {
      const biz = db.prepare('SELECT * FROM businesses WHERE id = ?').get(targetShopId) as any
        || db.prepare('SELECT * FROM shops WHERE id = ?').get(targetShopId) as any;

      if (!biz) {
        return res.status(404).json({ error: `Target tenant ${targetShopId} does not exist.` });
      }

      const enabledModules = parseJsonArray(biz.enabled_modules, [
        'POS', 'INVENTORY', 'CRM', 'HEALTHCARE', 'GYM', 'RESTAURANT', 'RENTAL', 'REPAIR', 'SERVICES', 'APPOINTMENTS', 'EXPENSES', 'REPORTS'
      ]);

      req.tenantContext = {
        tenantId: biz.id,
        tenantName: biz.name,
        industry: (biz.industry || biz.shop_type || 'RETAIL').toUpperCase(),
        enabledModules,
        userId: req.auth.userId,
        actorId: req.auth.userId || 'SUPER_ADMIN',
        role: 'SUPER_ADMIN',
        permissions: ['*'],
        isImpersonating: Boolean(req.auth.isImpersonating),
        superAdminId: req.auth.superAdminId || req.auth.userId,
      };
      return next();
    } else {
      // Super admin in platform-wide mode
      req.tenantContext = {
        tenantId: 'platform_root',
        tenantName: 'LUMORA Platform Super Admin',
        industry: 'PLATFORM',
        enabledModules: ['*'],
        userId: req.auth.userId,
        actorId: req.auth.userId || 'SUPER_ADMIN',
        role: 'SUPER_ADMIN',
        permissions: ['*'],
      };
      return next();
    }
  }

  // 2. Standard authenticated user / employee
  const tenantId = req.auth.shopId;
  if (!tenantId) {
    return res.status(403).json({ error: 'Access denied: No tenant bound to active session.' });
  }

  // 3. Verify Active Membership in user_tenant_memberships
  const actorId = req.auth.userId || req.auth.employeeId;
  if (!actorId) {
    return res.status(401).json({ error: 'Invalid authentication identity.' });
  }

  const membership = db.prepare(`
    SELECT * FROM user_tenant_memberships
    WHERE user_id = ? AND tenant_id = ? AND status = 'ACTIVE'
  `).get(actorId, tenantId) as any;

  // Fallback: If migration is seeding or employee was authenticated against shop directly
  if (!membership) {
    // Check if employee or user actually belongs to this shop in the canonical database
    let directBelongs = false;
    if (req.auth.userId) {
      const u = db.prepare('SELECT shop_id FROM users WHERE id = ?').get(req.auth.userId) as any;
      if (u && u.shop_id === tenantId) directBelongs = true;
    } else if (req.auth.employeeId) {
      const e = db.prepare('SELECT shop_id, status FROM employees WHERE id = ?').get(req.auth.employeeId) as any;
      if (e && e.shop_id === tenantId && e.status === 'ACTIVE') directBelongs = true;
    }

    if (!directBelongs) {
      return res.status(403).json({
        error: 'Forbidden: You do not possess an active membership for this tenant.',
        tenantId,
      });
    }

    // Auto-heal membership table for consistency
    try {
      const now = new Date().toISOString();
      const memId = 'mem_' + crypto.randomBytes(6).toString('hex');
      db.prepare(`
        INSERT OR IGNORE INTO user_tenant_memberships (id, user_id, tenant_id, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
      `).run(memId, actorId, tenantId, req.auth.role, now, now);
    } catch {
      // ignore insert conflict
    }
  }

  // 4. Fetch Tenant Details & Enabled Capabilities
  let tenant = db.prepare('SELECT * FROM businesses WHERE id = ?').get(tenantId) as any;
  if (!tenant) {
    // Look up in shops table and bridge
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(tenantId) as any;
    if (!shop) {
      return res.status(404).json({ error: 'Tenant record not found in system.' });
    }
    tenant = {
      id: shop.id,
      name: shop.name,
      industry: (shop.shop_type || 'RETAIL').toUpperCase(),
      status: shop.status,
      enabled_modules: JSON.stringify(['POS', 'INVENTORY', 'CRM', 'BILLING', 'EXPENSES', 'REPORTS', (shop.shop_type || 'RETAIL').toUpperCase()]),
    };
  }

  if (tenant.status === 'SUSPENDED') {
    return res.status(403).json({
      error: 'Tenant account is currently suspended. Please contact platform administration.',
      tenantId,
    });
  }

  // Parse enabled modules
  const rawModules = parseJsonArray(tenant.enabled_modules, []);
  // Normalize module names to uppercase
  const normalizedModules = Array.from(new Set([
    ...rawModules.map((m: string) => m.toUpperCase()),
    tenant.industry.toUpperCase(),
    'DASHBOARD',
    'SETTINGS',
    'REPORTS',
  ]));

  const effectiveRole = membership?.role || req.auth.role;
  const permissions = getPermissionsForRole(effectiveRole);

  req.tenantContext = {
    tenantId: tenant.id,
    tenantName: tenant.name,
    industry: tenant.industry.toUpperCase(),
    enabledModules: normalizedModules,
    branchId: membership?.branch_id,
    userId: req.auth.userId,
    employeeId: req.auth.employeeId,
    actorId,
    role: effectiveRole,
    permissions,
    isImpersonating: Boolean(req.auth.isImpersonating),
    superAdminId: req.auth.superAdminId,
  };

  next();
}

/**
 * Middleware: Require Active Tenant Context
 */
export function requireTenantContext(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantContext) {
    return resolveTenantContext(req, res, () => {
      if (!req.tenantContext) {
        return res.status(403).json({ error: 'Tenant context resolution required.' });
      }
      next();
    });
  }
  next();
}

/**
 * Middleware: Feature Entitlement Guard
 * Backend independently enforces module availability regardless of client UI.
 * e.g., requireModule('HEALTHCARE') rejects a Grocery tenant with 403 Forbidden.
 */
export function requireModule(moduleName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantContext) {
      return requireTenantContext(req, res, () => {
        checkModuleEntitlement(req, res, next, moduleName);
      });
    }
    checkModuleEntitlement(req, res, next, moduleName);
  };
}

function checkModuleEntitlement(req: Request, res: Response, next: NextFunction, moduleName: string) {
  const ctx = req.tenantContext!;
  if (ctx.role === 'SUPER_ADMIN') {
    return next();
  }

  const modUpper = moduleName.toUpperCase();
  const isEntitled = ctx.enabledModules.includes('*') ||
    ctx.enabledModules.includes(modUpper) ||
    ctx.industry === modUpper;

  if (!isEntitled) {
    return res.status(403).json({
      error: `Feature Entitlement Error: The '${moduleName}' module is not enabled for tenant '${ctx.tenantName}' (${ctx.tenantId}).`,
      tenantId: ctx.tenantId,
      industry: ctx.industry,
      requiredModule: moduleName,
      enabledModules: ctx.enabledModules,
    });
  }

  next();
}

/**
 * Middleware: Granular Permission Guard
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantContext) {
      return requireTenantContext(req, res, () => {
        checkPermission(req, res, next, permission);
      });
    }
    checkPermission(req, res, next, permission);
  };
}

function checkPermission(req: Request, res: Response, next: NextFunction, permission: string) {
  const ctx = req.tenantContext!;
  if (hasPermission(ctx.permissions, permission)) {
    return next();
  }

  return res.status(403).json({
    error: `Access Denied: You do not possess the required permission '${permission}'.`,
    role: ctx.role,
    requiredPermission: permission,
  });
}

/**
 * Access Auditing for Sensitive Records (e.g. Healthcare EHR & Financial Modifications)
 */
export function logSensitiveDataAccess(params: {
  tenantId: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: any;
}) {
  try {
    const now = new Date().toISOString();
    const id = 'aud_' + crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO audit_log (id, actor_id, actor_role, shop_id, action, target_type, target_id, before, after, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `).run(
      id,
      params.actorId,
      params.actorRole,
      params.tenantId,
      params.action,
      params.targetType,
      params.targetId,
      params.details ? JSON.stringify(params.details) : null,
      now
    );
  } catch (err) {
    console.error('Failed to write sensitive access log:', err);
  }
}

function parseJsonArray(val: any, fallback: string[]): string[] {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
