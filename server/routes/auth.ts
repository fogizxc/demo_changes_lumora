import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { createAuthSession, revokeToken } from '../services/auth.js';
import { logAuditEvent } from '../services/audit.js';
import { checkAndEnforceShopStatus } from '../services/commission.js';
import { checkRateLimit, recordFailedAttempt, resetRateLimit, recordSecurityEvent } from '../services/security.js';

export const authRouter = Router();

// Public list of active shops for POS terminal login
authRouter.get('/shops-list', (req: Request, res: Response) => {
  const shops = db.prepare(`
    SELECT id, name, shop_type, status, gst_number
    FROM shops
    ORDER BY name ASC
  `).all();
  res.json({ shops });
});

// Admin Login (Super Admin & Shop Admin)
authRouter.post('/login-admin', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const rateLimitKey = `admin_login:${normalizedEmail}`;
  const ipKey = `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;

  // 1. Check Rate Limit & Lockout Status
  const emailLimit = checkRateLimit(rateLimitKey, 5, 900); // 5 attempts, 15 min lock
  const ipLimit = checkRateLimit(ipKey, 20, 900);

  if (!emailLimit.allowed) {
    recordSecurityEvent({
      eventType: 'BRUTE_FORCE_BLOCKED',
      severity: 'HIGH',
      ipAddress: req.ip,
      details: { email: normalizedEmail, lockedUntil: emailLimit.lockedUntil },
    });
    return res.status(429).json({
      error: `Account temporarily locked due to excessive failed attempts. Please retry in ${emailLimit.lockMinutesRemaining} minutes.`,
      lockout: true,
      retryAfterMinutes: emailLimit.lockMinutesRemaining,
    });
  }

  if (!ipLimit.allowed) {
    return res.status(429).json({
      error: `Too many requests from this network. Please retry in ${ipLimit.lockMinutesRemaining} minutes.`,
      lockout: true,
    });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    const failureResult = recordFailedAttempt(rateLimitKey, 5, 900);
    recordFailedAttempt(ipKey, 20, 900);

    recordSecurityEvent({
      eventType: 'FAILED_ADMIN_LOGIN',
      severity: failureResult.locked ? 'HIGH' : 'WARN',
      ipAddress: req.ip,
      details: { email: normalizedEmail, attempts: failureResult.attempts, locked: failureResult.locked },
    });

    if (failureResult.locked) {
      return res.status(429).json({
        error: `Account locked due to 5 consecutive failed login attempts. Retry in ${failureResult.lockMinutesRemaining} minutes.`,
        lockout: true,
      });
    }

    return res.status(401).json({
      error: 'Invalid email or password',
      remainingAttempts: Math.max(0, 5 - failureResult.attempts),
    });
  }

  // Login succeeded: reset rate limit counters
  resetRateLimit(rateLimitKey);
  resetRateLimit(ipKey);

  let shop: any = null;
  if (user.role === 'SHOP_ADMIN') {
    if (!user.shop_id) {
      return res.status(403).json({ error: 'No shop associated with this Shop Admin account' });
    }
    shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(user.shop_id);
    if (!shop) {
      return res.status(404).json({ error: 'Associated shop not found' });
    }
    // Check shop suspension/overdue
    checkAndEnforceShopStatus(user.shop_id);
    shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(user.shop_id);
  }

  const token = createAuthSession({
    userId: user.id,
    role: user.role,
    shopId: user.shop_id,
  });

  logAuditEvent({
    actorId: user.id,
    actorRole: user.role,
    shopId: user.shop_id,
    action: 'LOGIN',
    targetType: 'USER',
    targetId: user.id,
    after: { email: user.email, role: user.role },
  });

  res.json({
    token,
    role: user.role,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      shop_id: user.shop_id,
      created_at: user.created_at,
    },
    shop,
  });
});

// Employee Login (POS Terminal: Cashier / Shift Lead)
authRouter.post('/login-employee', (req: Request, res: Response) => {
  const { shopId, employeeId, pin } = req.body;
  if (!shopId || !employeeId || !pin) {
    return res.status(400).json({ error: 'Shop ID, Employee ID, and PIN are required' });
  }

  const normalizedEmpId = employeeId.trim().toUpperCase();
  const pinLockoutKey = `emp_pin:${shopId}:${normalizedEmpId}`;

  // 1. Check PIN brute force rate limit (Max 5 attempts, 15 minute lock)
  const pinLimit = checkRateLimit(pinLockoutKey, 5, 900);
  if (!pinLimit.allowed) {
    recordSecurityEvent({
      eventType: 'PIN_BRUTE_FORCE_BLOCKED',
      severity: 'HIGH',
      tenantId: shopId,
      actorId: normalizedEmpId,
      ipAddress: req.ip,
      details: { shopId, employeeId: normalizedEmpId, lockedUntil: pinLimit.lockedUntil },
    });
    return res.status(429).json({
      error: `Terminal account is locked due to 5 consecutive failed PIN attempts. Please notify your Store Manager or retry in ${pinLimit.lockMinutesRemaining} minutes.`,
      lockout: true,
      retryAfterMinutes: pinLimit.lockMinutesRemaining,
    });
  }

  // 2. Check shop existence and status
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId) as any;
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  const enforcement = checkAndEnforceShopStatus(shopId);
  if (enforcement.isPosSuspended) {
    return res.status(403).json({
      error: `POS access is suspended for ${shop.name} due to an overdue commission payment or administrative suspension. Please contact the Shop Admin or Super Admin.`,
      shopStatus: enforcement.shopStatus,
      amountDue: enforcement.amountDue,
    });
  }

  // 3. Query employee
  const employee = db.prepare(`
    SELECT * FROM employees
    WHERE shop_id = ? AND employee_id = ?
  `).get(shopId, normalizedEmpId) as any;

  if (!employee) {
    return res.status(401).json({ error: 'Employee not found in this shop' });
  }

  if (employee.status === 'DEACTIVATED') {
    return res.status(403).json({ error: 'Employee account has been deactivated. Please contact your Shop Admin.' });
  }

  // 4. Verify PIN with brute force detection
  if (!bcrypt.compareSync(pin, employee.authentication_reference)) {
    const failureResult = recordFailedAttempt(pinLockoutKey, 5, 900);

    recordSecurityEvent({
      eventType: 'FAILED_PIN_LOGIN',
      severity: failureResult.locked ? 'HIGH' : 'WARN',
      tenantId: shopId,
      actorId: employee.id,
      ipAddress: req.ip,
      details: { shopId, employeeId: normalizedEmpId, attempts: failureResult.attempts, locked: failureResult.locked },
    });

    if (failureResult.locked) {
      return res.status(429).json({
        error: `Terminal account locked: 5 consecutive incorrect PIN entries. Retry in ${failureResult.lockMinutesRemaining} minutes.`,
        lockout: true,
      });
    }

    return res.status(401).json({
      error: 'Invalid PIN or credentials',
      remainingAttempts: Math.max(0, 5 - failureResult.attempts),
    });
  }

  // Successful PIN authentication: reset brute force counter
  resetRateLimit(pinLockoutKey);

  // 3. Create or reuse active POS Session
  let session = db.prepare(`
    SELECT * FROM sessions
    WHERE employee_id = ? AND shop_id = ? AND status = 'ACTIVE'
  `).get(employee.id, shopId) as any;

  const now = new Date().toISOString();
  if (!session) {
    const sessionId = 'ses_' + Math.random().toString(36).substring(2, 9);
    db.prepare(`
      INSERT INTO sessions (id, employee_id, shop_id, login_at, logout_at, status)
      VALUES (?, ?, ?, ?, NULL, 'ACTIVE')
    `).run(sessionId, employee.id, shopId, now);

    session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  }

  const token = createAuthSession({
    employeeId: employee.id,
    role: employee.tier,
    shopId,
  });

  logAuditEvent({
    actorId: employee.id,
    actorRole: employee.tier,
    shopId,
    action: 'LOGIN',
    targetType: 'EMPLOYEE',
    targetId: employee.id,
    after: { employee_id: employee.employee_id, name: employee.name, tier: employee.tier, session_id: session.id },
  });

  res.json({
    token,
    role: employee.tier,
    employee: {
      id: employee.id,
      shop_id: employee.shop_id,
      employee_id: employee.employee_id,
      name: employee.name,
      tier: employee.tier,
      status: employee.status,
      created_at: employee.created_at,
    },
    session,
    shop,
  });
});

// Logout
authRouter.post('/logout', (req: Request, res: Response) => {
  if (req.auth) {
    // If employee session, close active session
    if (req.auth.employeeId && req.auth.shopId) {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE sessions
        SET status = 'CLOSED', logout_at = ?
        WHERE employee_id = ? AND shop_id = ? AND status = 'ACTIVE'
      `).run(now, req.auth.employeeId, req.auth.shopId);

      logAuditEvent({
        actorId: req.auth.employeeId,
        actorRole: req.auth.role,
        shopId: req.auth.shopId,
        action: 'LOGOUT',
        targetType: 'EMPLOYEE',
        targetId: req.auth.employeeId,
      });
    } else if (req.auth.userId) {
      logAuditEvent({
        actorId: req.auth.userId,
        actorRole: req.auth.role,
        shopId: req.auth.shopId,
        action: 'LOGOUT',
        targetType: 'USER',
        targetId: req.auth.userId,
      });
    }

    revokeToken(req.auth.token);
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

// Current Authenticated Context
authRouter.get('/me', (req: Request, res: Response) => {
  if (!req.auth) {
    return res.status(401).json({ authenticated: false });
  }

  let user: any = null;
  let employee: any = null;
  let shop: any = null;
  let session: any = null;

  if (req.auth.userId) {
    user = db.prepare('SELECT id, email, role, shop_id, created_at FROM users WHERE id = ?').get(req.auth.userId);
  }

  if (req.auth.employeeId) {
    employee = db.prepare('SELECT id, shop_id, employee_id, name, tier, status, created_at FROM employees WHERE id = ?').get(req.auth.employeeId);
    if (req.auth.shopId) {
      session = db.prepare("SELECT * FROM sessions WHERE employee_id = ? AND shop_id = ? AND status = 'ACTIVE'").get(req.auth.employeeId, req.auth.shopId);
    }
  }

  if (req.auth.shopId) {
    shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.auth.shopId);
  }

  res.json({
    authenticated: true,
    token: req.auth.token,
    role: req.auth.role,
    user,
    employee,
    shop,
    session,
    isImpersonating: req.auth.isImpersonating,
    superAdminId: req.auth.superAdminId,
  });
});
