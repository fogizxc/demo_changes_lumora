import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { logAuditEvent, logImpersonationEvent } from './audit.js';
import { checkAndEnforceShopStatus } from './commission.js';
import { AnyRole, EmployeeTier, UserRole } from '../../src/types.js';

export interface AuthenticatedContext {
  token: string;
  role: AnyRole;
  userId?: string;
  employeeId?: string;
  shopId?: string;
  isImpersonating?: boolean;
  superAdminId?: string;
  impersonationLogId?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedContext;
    }
  }
}

export function generateToken(): string {
  return 'tok_' + crypto.randomBytes(32).toString('hex');
}

export function createAuthSession(params: {
  userId?: string;
  employeeId?: string;
  role: AnyRole;
  shopId?: string | null;
  isImpersonating?: boolean;
  superAdminId?: string;
  expiresInDays?: number;
}): string {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (params.expiresInDays || 7) * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO auth_tokens (token, user_id, employee_id, role, shop_id, is_impersonating, super_admin_id, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    token,
    params.userId || null,
    params.employeeId || null,
    params.role,
    params.shopId || null,
    params.isImpersonating ? 1 : 0,
    params.superAdminId || null,
    expiresAt,
    now.toISOString()
  );

  return token;
}

export function getAuthContext(token: string): AuthenticatedContext | null {
  if (!token) return null;
  const row = db.prepare(`
    SELECT * FROM auth_tokens
    WHERE token = ?
  `).get(token) as any;

  if (!row) return null;

  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(token);
    return null;
  }

  return {
    token: row.token,
    role: row.role as AnyRole,
    userId: row.user_id || undefined,
    employeeId: row.employee_id || undefined,
    shopId: row.shop_id || undefined,
    isImpersonating: Boolean(row.is_impersonating),
    superAdminId: row.super_admin_id || undefined,
  };
}

export function revokeToken(token: string): void {
  db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(token);
}

// Authentication extraction middleware
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  const context = getAuthContext(token);
  if (context) {
    req.auth = context;
  }
  next();
}

// Middleware: Require Super Admin
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth || (req.auth.role !== 'SUPER_ADMIN' && !req.auth.superAdminId)) {
    return res.status(401).json({ error: 'Authentication required as Super Admin' });
  }
  if (req.auth.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Super Admin privileges required' });
  }
  next();
}

// Middleware: Require Shop Admin (either genuine Shop Admin or Super Admin in Support View-As mode)
export function requireShopAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.auth.role === 'SHOP_ADMIN') {
    if (!req.auth.shopId) {
      return res.status(403).json({ error: 'No shop associated with this Shop Admin' });
    }
    return next();
  }

  if (req.auth.role === 'SUPER_ADMIN' && req.auth.isImpersonating && req.auth.shopId) {
    return next();
  }

  return res.status(403).json({ error: 'Shop Admin authorization required' });
}

// Middleware: Require POS Employee (CASHIER or SHIFT_LEAD, or SHOP_ADMIN operating the till)
export function requireEmployee(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    return res.status(401).json({ error: 'Employee login required' });
  }

  // Permit CASHIER, SHIFT_LEAD, SHOP_ADMIN, or SUPER_ADMIN in view-as/demo mode
  const allowedRoles = ['CASHIER', 'SHIFT_LEAD', 'SHOP_ADMIN', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(req.auth.role)) {
    return res.status(403).json({ error: 'POS terminal requires Employee or Shop Admin authorization' });
  }

  // If no shop context (e.g. Super Admin opening till), associate with first active shop
  if (!req.auth.shopId) {
    const firstShop = db.prepare('SELECT id FROM shops LIMIT 1').get() as any;
    if (firstShop) {
      req.auth.shopId = firstShop.id;
    } else {
      return res.status(403).json({ error: 'No active shop configured for this terminal' });
    }
  }

  // If no employeeId (e.g. Shop Admin or Super Admin), find or create an employee context for sale attribution
  if (!req.auth.employeeId) {
    let emp = db.prepare("SELECT id FROM employees WHERE shop_id = ? AND tier = 'SHIFT_LEAD' LIMIT 1").get(req.auth.shopId) as any;
    if (!emp) {
      emp = db.prepare("SELECT id FROM employees WHERE shop_id = ? LIMIT 1").get(req.auth.shopId) as any;
    }
    if (!emp) {
      const newEmpId = 'emp_' + crypto.randomUUID().substring(0, 8);
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO employees (id, shop_id, employee_id, name, tier, authentication_reference, status, created_at, updated_at)
        VALUES (?, ?, 'LEAD-01', 'Store Lead', 'SHIFT_LEAD', ?, 'ACTIVE', ?, ?)
      `).run(newEmpId, req.auth.shopId, bcrypt.hashSync('1234', 10), now, now);
      emp = { id: newEmpId };
    }
    req.auth.employeeId = emp.id;
  }

  // Check shop suspension
  const shopStatus = checkAndEnforceShopStatus(req.auth.shopId!);
  if (shopStatus.isPosSuspended) {
    return res.status(403).json({
      error: 'POS terminal access is suspended due to overdue commission payment or admin suspension.',
      shopStatus: shopStatus.shopStatus,
      amountDue: shopStatus.amountDue,
    });
  }

  next();
}

// Middleware: Require Shift Lead (authorized for voids and discounts)
export function requireShiftLead(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    return res.status(401).json({ error: 'Employee login required' });
  }

  // Allow Shop Admin or Shift Lead
  if (req.auth.role === 'SHIFT_LEAD' || req.auth.role === 'SHOP_ADMIN') {
    return next();
  }

  return res.status(403).json({
    error: 'Shift Lead authorization required for this restricted operation',
    requiredTier: 'SHIFT_LEAD',
    currentRole: req.auth.role,
  });
}
