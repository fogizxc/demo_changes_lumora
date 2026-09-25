import crypto from 'node:crypto';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireSuperAdmin, createAuthSession, revokeToken } from '../services/auth.js';
import { logAuditEvent, logImpersonationEvent } from '../services/audit.js';
import { COMMISSION_RATE, GRACE_PERIOD_DAYS, calculateShopGrossSales, checkAndEnforceShopStatus, generateMonthlyInvoice } from '../services/commission.js';
import { roundCurrency } from '../services/tax.js';

export const superAdminRouter = Router();

// Apply requireSuperAdmin to all routes in this router
superAdminRouter.use(requireSuperAdmin);

// 1. Super Admin Dashboard Overview
superAdminRouter.get('/dashboard', (req: Request, res: Response) => {
  // Check and enforce statuses on all shops
  const allShops = db.prepare('SELECT id FROM shops').all() as { id: string }[];
  for (const s of allShops) {
    checkAndEnforceShopStatus(s.id);
  }

  // Total platform gross sales
  const salesAgg = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total_gross
    FROM sales
    WHERE status = 'COMPLETED'
  `).get() as { total_gross: number };
  const totalGrossSales = roundCurrency(salesAgg?.total_gross || 0);

  // Current month commission
  const now = new Date();
  const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const startOfMonth = `${currentPeriod}-01T00:00:00.000Z`;

  const monthSalesAgg = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as month_gross
    FROM sales
    WHERE status = 'COMPLETED' AND created_at >= ?
  `).get(startOfMonth) as { month_gross: number };
  const monthGrossSales = roundCurrency(monthSalesAgg?.month_gross || 0);
  const totalCommissionThisMonth = roundCurrency(monthGrossSales * COMMISSION_RATE);

  // Shop status counts
  const activeShopsCount = (db.prepare("SELECT COUNT(*) as count FROM shops WHERE status = 'ACTIVE'").get() as any)?.count || 0;
  const overdueShopsCount = (db.prepare("SELECT COUNT(*) as count FROM shops WHERE status = 'OVERDUE'").get() as any)?.count || 0;
  const suspendedShopsCount = (db.prepare("SELECT COUNT(*) as count FROM shops WHERE status = 'SUSPENDED'").get() as any)?.count || 0;

  // Commission revenue trend (last 6 months)
  const trend: { period: string; grossSales: number; commission: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const pStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const pEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const pSales = (db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as gross
      FROM sales
      WHERE status = 'COMPLETED' AND created_at >= ? AND created_at <= ?
    `).get(pStart, pEnd) as any)?.gross || 0;

    trend.push({
      period,
      grossSales: roundCurrency(pSales),
      commission: roundCurrency(pSales * COMMISSION_RATE),
    });
  }

  // Shops with overdue payments
  const overdueShopsList = db.prepare(`
    SELECT 
      s.id as shopId,
      s.name as shopName,
      COALESCE(SUM(i.commission_due), 0) as amountDue,
      MIN(i.grace_period_ends_at) as gracePeriodEndsAt
    FROM shops s
    JOIN invoices i ON s.id = i.shop_id
    WHERE i.status IN ('PENDING', 'OVERDUE') AND i.grace_period_ends_at < ?
    GROUP BY s.id, s.name
  `).all(now.toISOString()).map((row: any) => {
    const graceEnd = new Date(row.gracePeriodEndsAt);
    const daysOverdue = Math.max(1, Math.floor((now.getTime() - graceEnd.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      shopId: row.shopId,
      shopName: row.shopName,
      amountDue: roundCurrency(row.amountDue),
      gracePeriodEndsAt: row.gracePeriodEndsAt,
      daysOverdue,
    };
  });

  res.json({
    totalGrossSales,
    totalCommissionThisMonth,
    activeShopsCount,
    overdueShopsCount,
    suspendedShopsCount,
    commissionRevenueTrend: trend,
    overdueShopsList,
  });
});

// 2. Shop Directory
superAdminRouter.get('/shops', (req: Request, res: Response) => {
  const now = new Date();
  const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const startOfMonth = `${currentPeriod}-01T00:00:00.000Z`;

  const shops = db.prepare(`
    SELECT 
      s.*,
      u.id as admin_user_id,
      u.email as admin_email
    FROM shops s
    LEFT JOIN users u ON u.shop_id = s.id AND u.role = 'SHOP_ADMIN'
    ORDER BY s.created_at DESC
  `).all() as any[];

  const enrichedShops = shops.map((shop) => {
    // Check status
    checkAndEnforceShopStatus(shop.id);
    const freshShop = db.prepare('SELECT status FROM shops WHERE id = ?').get(shop.id) as any;

    // This month's sales
    const monthSales = (db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as gross
      FROM sales
      WHERE shop_id = ? AND status = 'COMPLETED' AND created_at >= ?
    `).get(shop.id, startOfMonth) as any)?.gross || 0;

    // Commission owed (unpaid invoices)
    const commOwed = (db.prepare(`
      SELECT COALESCE(SUM(commission_due), 0) as due
      FROM invoices
      WHERE shop_id = ? AND status IN ('PENDING', 'OVERDUE')
    `).get(shop.id) as any)?.due || 0;

    return {
      ...shop,
      status: freshShop.status,
      thisMonthSales: roundCurrency(monthSales),
      commissionOwed: roundCurrency(commOwed),
    };
  });

  res.json({ shops: enrichedShops });
});

// Create Shop Admin + Associated Shop (Strict 1 Shop Admin = 1 Shop)
superAdminRouter.post('/shops', (req: Request, res: Response) => {
  const {
    name,
    gstNumber,
    vatNumber,
    phone,
    address,
    shortNote,
    shopType,
    taxState,
    adminEmail,
    adminPassword,
  } = req.body;

  if (!name || !gstNumber || !phone || !address || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: 'Shop name, GST number, phone, address, admin email, and password are required' });
  }

  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail.trim().toLowerCase());
  if (existingEmail) {
    return res.status(409).json({ error: 'A user with this email address already exists' });
  }

  const now = new Date().toISOString();
  const shopId = 'shp_' + crypto.randomUUID().substring(0, 8);
  const userId = 'usr_' + crypto.randomUUID().substring(0, 8);
  const passwordHash = bcrypt.hashSync(adminPassword, 10);

  db.exec('BEGIN TRANSACTION');
  try {
    const normalizedShopType = (shopType || 'retail').toLowerCase().trim();
    let normIndustry = 'RETAIL';
    if (normalizedShopType.includes('health') || normalizedShopType.includes('hospital') || normalizedShopType.includes('clinic')) {
      normIndustry = 'HEALTHCARE';
    } else if (normalizedShopType.includes('gym') || normalizedShopType.includes('fitness')) {
      normIndustry = 'GYM';
    } else if (normalizedShopType.includes('rest') || normalizedShopType.includes('din') || normalizedShopType.includes('cafe')) {
      normIndustry = 'RESTAURANT';
    } else if (normalizedShopType.includes('rent') || normalizedShopType.includes('fleet')) {
      normIndustry = 'RENTAL';
    } else if (normalizedShopType.includes('repair') || normalizedShopType.includes('service')) {
      normIndustry = 'REPAIR';
    }

    db.prepare(`
      INSERT INTO shops (id, name, gst_number, vat_number, phone, address, short_note, shop_type, tax_state, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `).run(
      shopId,
      name.trim(),
      gstNumber.trim().toUpperCase(),
      vatNumber ? vatNumber.trim() : null,
      phone.trim(),
      address.trim(),
      shortNote ? shortNote.trim() : null,
      normalizedShopType,
      taxState || 'INTRA_STATE',
      now,
      now
    );

    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, shop_id, created_at, updated_at)
      VALUES (?, ?, ?, 'SHOP_ADMIN', ?, ?, ?)
    `).run(
      userId,
      adminEmail.trim().toLowerCase(),
      passwordHash,
      shopId,
      now,
      now
    );

    // Synchronize to multi-tenant businesses registry
    try {
      db.prepare(`
        INSERT OR REPLACE INTO businesses (
          id, name, slug, industry, business_type, status, email, phone, address, country, state, city, timezone, currency, tax_configuration, enabled_modules, settings, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 'India', 'Maharashtra', 'Mumbai', 'Asia/Kolkata', 'INR', '{}', ?, '{}', ?, ?)
      `).run(
        shopId,
        name.trim(),
        name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        normIndustry,
        normIndustry + '_ENTERPRISE',
        adminEmail.trim().toLowerCase(),
        phone.trim(),
        address.trim(),
        JSON.stringify(['DASHBOARD', normIndustry]),
        now,
        now
      );
    } catch (bizErr) {
      console.error('Error inserting into businesses table:', bizErr);
    }

    // Seed starter domain records specific to this industry
    try {
      if (normIndustry === 'HEALTHCARE') {
        const doc1 = 'doc_' + crypto.randomUUID().substring(0, 8);
        const doc2 = 'doc_' + crypto.randomUUID().substring(0, 8);
        db.prepare(`
          INSERT INTO healthcare_doctors (id, business_id, name, specialization, department, consultation_fee, phone, email, available_days, created_at)
          VALUES (?, ?, 'Dr. Ananya Roy, MD', 'Senior Cardiologist', 'Cardiology', 800, '+91 98201 12345', 'ananya.roy@health.org', 'Mon,Wed,Fri', ?)
        `).run(doc1, shopId, now);
        db.prepare(`
          INSERT INTO healthcare_doctors (id, business_id, name, specialization, department, consultation_fee, phone, email, available_days, created_at)
          VALUES (?, ?, 'Dr. Vikram Seth, MS', 'Orthopedic Surgeon', 'Orthopedics', 950, '+91 98202 23456', 'vikram.seth@health.org', 'Tue,Thu,Sat', ?)
        `).run(doc2, shopId, now);
        const pat1 = 'pat_' + crypto.randomUUID().substring(0, 8);
        db.prepare(`
          INSERT INTO healthcare_patients (id, business_id, patient_number, name, gender, blood_group, phone, email, address, medical_history, allergies, status, created_at, updated_at)
          VALUES (?, ?, 'P-101', 'Meera Kapoor', 'FEMALE', 'B+', '+91 99881 12233', 'meera.k@gmail.com', 'Andheri West, Mumbai', 'Hypertension stage 1', 'Penicillin', 'ACTIVE', ?, ?)
        `).run(pat1, shopId, now, now);
        const apt1 = 'apt_' + crypto.randomUUID().substring(0, 8);
        const todayDate = new Date().toISOString().split('T')[0];
        db.prepare(`
          INSERT INTO appointments (id, business_id, customer_id, customer_name, customer_phone, service_name, resource_id, resource_name, resource_type, date, start_time, end_time, status, payment_status, fee, created_at)
          VALUES (?, ?, ?, 'Meera Kapoor', '+91 99881 12233', 'Cardiology Consultation', ?, 'Dr. Ananya Roy, MD', 'DOCTOR', ?, '10:30', '11:00', 'CONFIRMED', 'PAID', 800, ?)
        `).run(apt1, shopId, pat1, doc1, todayDate, now);
      } else if (normIndustry === 'GYM') {
        const pln1 = 'pln_' + crypto.randomUUID().substring(0, 8);
        const pln2 = 'pln_' + crypto.randomUUID().substring(0, 8);
        db.prepare(`
          INSERT INTO gym_plans (id, business_id, name, duration_months, price, freeze_limit_days, benefits, created_at)
          VALUES (?, ?, 'Gold Pro Annual Membership', 12, 19999, 60, '["Full Weights & Cardio Access","Free Steam & Sauna","2 PT Sessions/Mo"]', ?)
        `).run(pln1, shopId, now);
        db.prepare(`
          INSERT INTO gym_plans (id, business_id, name, duration_months, price, freeze_limit_days, benefits, created_at)
          VALUES (?, ?, 'Quarterly Performance Tier', 3, 6499, 15, '["Locker Access","All Group HIIT Classes"]', ?)
        `).run(pln2, shopId, now);
        const mem1 = 'mem_' + crypto.randomUUID().substring(0, 8);
        const todayDate = new Date().toISOString().split('T')[0];
        db.prepare(`
          INSERT INTO gym_members (id, business_id, member_number, name, phone, email, emergency_contact, status, join_date, created_at)
          VALUES (?, ?, 'MEM-001', 'Arjun Khanna', '+91 98111 22334', 'arjun.khanna@gmail.com', '+91 98111 22330', 'ACTIVE', ?, ?)
        `).run(mem1, shopId, todayDate, now);
      } else if (normIndustry === 'RESTAURANT') {
        for (let i = 1; i <= 6; i++) {
          const tId = 'tbl_' + crypto.randomUUID().substring(0, 8);
          const tNum = `T-0${i}`;
          const cap = i <= 2 ? 2 : (i <= 4 ? 4 : 6);
          db.prepare(`
            INSERT INTO restaurant_tables (id, business_id, table_number, capacity, floor_section, status, current_order_id, created_at)
            VALUES (?, ?, ?, ?, 'Main Dining', 'VACANT', NULL, ?)
          `).run(tId, shopId, tNum, cap, now);
        }
      } else if (normIndustry === 'RENTAL') {
        const ast1 = 'ast_' + crypto.randomUUID().substring(0, 8);
        const ast2 = 'ast_' + crypto.randomUUID().substring(0, 8);
        db.prepare(`
          INSERT INTO rental_assets (id, business_id, name, category, daily_rate, deposit_amount, serial_number, condition_notes, status, created_at)
          VALUES (?, ?, 'Sony FX6 Cinema Camera Hardcase Kit', 'Camera', 4500, 20000, 'SN-FX6-9021', 'Pristine condition with 2x 160GB CFexpress cards', 'AVAILABLE', ?)
        `).run(ast1, shopId, now);
        db.prepare(`
          INSERT INTO rental_assets (id, business_id, name, category, daily_rate, deposit_amount, serial_number, condition_notes, status, created_at)
          VALUES (?, ?, 'Aputure 600d Pro Daylight LED Kit', 'Lighting', 2800, 10000, 'SN-AP600-4412', 'Includes Fresnel lens & heavy-duty C-Stand', 'AVAILABLE', ?)
        `).run(ast2, shopId, now);
      } else if (normIndustry === 'REPAIR') {
        const job1 = 'job_' + crypto.randomUUID().substring(0, 8);
        db.prepare(`
          INSERT INTO repair_jobs (id, business_id, job_number, customer_name, customer_phone, device_type, brand, model, serial_number, reported_fault, technician_name, status, estimated_cost, parts_cost, labor_cost, created_at, updated_at)
          VALUES (?, ?, 'JOB-101', 'Rohit Sharma', '+91 97665 44332', 'Laptop', 'Apple', 'MacBook Pro M2 14-inch', 'C02G9988MD6T', 'Screen flickering and battery health below 60%', 'Sanjay Rawat', 'DIAGNOSING', 14500, 8200, 2500, ?, ?)
        `).run(job1, shopId, now, now);
      } else {
        const pId = 'prd_' + crypto.randomUUID().substring(0, 8);
        db.prepare(`
          INSERT INTO products (id, shop_id, sku, name, category, price, cost_price, stock, low_stock_threshold, tax_rate, created_at, updated_at)
          VALUES (?, ?, 'RET-001', 'Premium Grade Roasted Almonds 500g', 'Dry Fruits', 450.00, 320.00, 35, 10, 5.0, ?, ?)
        `).run(pId, shopId, now, now);
      }
    } catch (seedErr) {
      console.error('Error seeding starter records for industry:', normIndustry, seedErr);
    }

    // Initial default employees (1 Shift Lead and 1 Staff)
    const shiftLeadId = 'emp_' + crypto.randomUUID().substring(0, 8);
    const cashierId = 'emp_' + crypto.randomUUID().substring(0, 8);
    const defaultPinHash = bcrypt.hashSync('1234', 10);

    const leadTitle = normIndustry === 'HEALTHCARE' ? 'Head Nurse / Reception Lead' :
                     normIndustry === 'GYM' ? 'Head Fitness Coach' :
                     normIndustry === 'RESTAURANT' ? 'Head Chef & Floor Lead' :
                     normIndustry === 'RENTAL' ? 'Fleet Coordinator' :
                     normIndustry === 'REPAIR' ? 'Lead Diagnostic Tech' : 'Store Lead';

    const staffTitle = normIndustry === 'HEALTHCARE' ? 'OPD Assistant' :
                      normIndustry === 'GYM' ? 'Front Desk Exec' :
                      normIndustry === 'RESTAURANT' ? 'Senior Waiter' :
                      normIndustry === 'RENTAL' ? 'Equipment Handler' :
                      normIndustry === 'REPAIR' ? 'Junior Tech' : 'Cashier';

    db.prepare(`
      INSERT INTO employees (id, shop_id, employee_id, name, tier, status, authentication_reference, created_at, updated_at)
      VALUES (?, ?, 'EMP-01', ?, 'SHIFT_LEAD', 'ACTIVE', ?, ?, ?)
    `).run(shiftLeadId, shopId, leadTitle, defaultPinHash, now, now);

    db.prepare(`
      INSERT INTO employees (id, shop_id, employee_id, name, tier, status, authentication_reference, created_at, updated_at)
      VALUES (?, ?, 'EMP-02', ?, 'CASHIER', 'ACTIVE', ?, ?, ?)
    `).run(cashierId, shopId, staffTitle, defaultPinHash, now, now);

    db.exec('COMMIT');

    logAuditEvent({
      actorId: req.auth!.userId!,
      actorRole: 'SUPER_ADMIN',
      shopId,
      action: 'SHOP_CREATED',
      targetType: 'SHOP',
      targetId: shopId,
      after: { name, gstNumber, adminEmail, shopType: normalizedShopType, industry: normIndustry },
    });

    const createdShop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId);
    res.status(201).json({
      success: true,
      shop: createdShop,
      admin: { id: userId, email: adminEmail, role: 'SHOP_ADMIN', password: adminPassword },
      industry: normIndustry,
    });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to create shop' });
  }
});

// Suspend or Reactivate Shop
superAdminRouter.patch('/shops/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be ACTIVE or SUSPENDED' });
  }

  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(id) as any;
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE shops SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);

  logAuditEvent({
    actorId: req.auth!.userId!,
    actorRole: 'SUPER_ADMIN',
    shopId: id,
    action: status === 'SUSPENDED' ? 'SHOP_SUSPENDED' : 'SHOP_REACTIVATED',
    targetType: 'SHOP',
    targetId: id,
    before: { status: shop.status },
    after: { status },
  });

  res.json({ success: true, shopId: id, status });
});

// Remove Shop Admin
superAdminRouter.delete('/shops/:id/admin', (req: Request, res: Response) => {
  const { id } = req.params;
  const admin = db.prepare("SELECT * FROM users WHERE shop_id = ? AND role = 'SHOP_ADMIN'").get(id) as any;
  if (!admin) {
    return res.status(404).json({ error: 'No Shop Admin found for this shop' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(admin.id);

  logAuditEvent({
    actorId: req.auth!.userId!,
    actorRole: 'SUPER_ADMIN',
    shopId: id,
    action: 'SHOP_ADMIN_REMOVED',
    targetType: 'USER',
    targetId: admin.id,
    before: { email: admin.email },
  });

  res.json({ success: true, message: 'Shop Admin removed successfully' });
});

// 3. Super Admin Support Access ("View Shop As")
superAdminRouter.post('/impersonate/:shopId', (req: Request, res: Response) => {
  const { shopId } = req.params;
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId) as any;
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  const shopAdmin = db.prepare("SELECT * FROM users WHERE shop_id = ? AND role = 'SHOP_ADMIN'").get(shopId) as any;
  if (!shopAdmin) {
    return res.status(404).json({ error: 'No Shop Admin configured for this shop to impersonate' });
  }

  // Record start in impersonation_log
  const impersonationLogId = logImpersonationEvent({
    superAdminId: req.auth!.userId!,
    targetShopAdminId: shopAdmin.id,
    shopId,
    action: 'START',
  });

  // Log in audit log
  logAuditEvent({
    actorId: req.auth!.userId!,
    actorRole: 'SUPER_ADMIN',
    shopId,
    action: 'IMPERSONATION_STARTED',
    targetType: 'SHOP',
    targetId: shopId,
    after: { targetShopAdmin: shopAdmin.email, impersonationLogId },
  });

  // Issue special support session token
  const supportToken = createAuthSession({
    userId: shopAdmin.id,
    role: 'SHOP_ADMIN',
    shopId,
    isImpersonating: true,
    superAdminId: req.auth!.userId!,
  });

  res.json({
    token: supportToken,
    role: 'SHOP_ADMIN',
    isImpersonating: true,
    superAdminId: req.auth!.userId!,
    impersonationLogId,
    user: {
      id: shopAdmin.id,
      email: shopAdmin.email,
      role: 'SHOP_ADMIN',
      shop_id: shopId,
    },
    shop,
  });
});

// Exit Impersonation Mode
superAdminRouter.post('/exit-impersonation', (req: Request, res: Response) => {
  const { impersonationLogId } = req.body;
  if (impersonationLogId) {
    logImpersonationEvent({
      superAdminId: req.auth?.superAdminId || req.auth?.userId || 'UNKNOWN',
      targetShopAdminId: req.auth?.userId || '',
      shopId: req.auth?.shopId || '',
      action: 'END',
      impersonationId: impersonationLogId,
    });
  }

  if (req.auth) {
    logAuditEvent({
      actorId: req.auth.superAdminId || req.auth.userId || 'SUPER_ADMIN',
      actorRole: 'SUPER_ADMIN',
      shopId: req.auth.shopId,
      action: 'IMPERSONATION_ENDED',
      targetType: 'SHOP',
      targetId: req.auth.shopId || '',
    });
    revokeToken(req.auth.token);
  }

  res.json({ success: true, message: 'Exited support view-as mode' });
});

// 4. Invoices & Billing Management
superAdminRouter.get('/invoices', (req: Request, res: Response) => {
  const { status, shopId } = req.query;
  let query = `
    SELECT 
      i.*,
      s.name as shop_name
    FROM invoices i
    JOIN shops s ON s.id = i.shop_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) {
    query += ' AND i.status = ?';
    params.push(status);
  }

  if (shopId) {
    query += ' AND i.shop_id = ?';
    params.push(shopId);
  }

  query += ' ORDER BY i.created_at DESC';

  const invoices = db.prepare(query).all(...params);
  res.json({ invoices });
});

// Mark invoice as paid (Manual payment)
superAdminRouter.post('/invoices/:id/mark-paid', (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  if (invoice.status === 'PAID') {
    return res.status(400).json({ error: 'Invoice is already marked as paid' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE invoices
    SET status = 'PAID', paid_at = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, id);

  // Check if shop has any remaining overdue invoices; if none, reactivate shop
  checkAndEnforceShopStatus(invoice.shop_id);

  logAuditEvent({
    actorId: req.auth!.userId!,
    actorRole: 'SUPER_ADMIN',
    shopId: invoice.shop_id,
    action: 'INVOICE_MARKED_PAID',
    targetType: 'INVOICE',
    targetId: id,
    before: { status: invoice.status, commission_due: invoice.commission_due },
    after: { status: 'PAID', paid_at: now },
  });

  const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  res.json({ success: true, invoice: updated });
});

// Generate Monthly Platform Invoices (Manual Monthly Invoicing)
superAdminRouter.post('/invoices/generate', (req: Request, res: Response) => {
  const { billingPeriod, shopId } = req.body;
  if (!billingPeriod || !/^\d{4}-\d{2}$/.test(billingPeriod)) {
    return res.status(400).json({ error: 'Valid billing period in YYYY-MM format is required (e.g. 2026-09)' });
  }

  const generatedInvoices: any[] = [];

  if (shopId && shopId !== 'ALL') {
    const shop = db.prepare('SELECT id, name FROM shops WHERE id = ?').get(shopId) as any;
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    const inv = generateMonthlyInvoice(shop.id, billingPeriod);
    generatedInvoices.push({ ...inv, shop_name: shop.name });
  } else {
    // Generate for all shops
    const shops = db.prepare('SELECT id, name FROM shops').all() as { id: string; name: string }[];
    for (const shop of shops) {
      const inv = generateMonthlyInvoice(shop.id, billingPeriod);
      generatedInvoices.push({ ...inv, shop_name: shop.name });
    }
  }

  logAuditEvent({
    actorId: req.auth!.userId!,
    actorRole: 'SUPER_ADMIN',
    action: 'INVOICES_GENERATED',
    targetType: 'BILLING',
    targetId: billingPeriod,
    after: { billingPeriod, count: generatedInvoices.length, shopId: shopId || 'ALL' },
  });

  res.json({
    success: true,
    message: `Generated ${generatedInvoices.length} monthly invoice(s) for period ${billingPeriod}`,
    invoices: generatedInvoices,
  });
});

// 5. All Transactions (Server-side paginated & filtered)
superAdminRouter.get('/transactions', (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(5, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;

  const { shopId, employeeId, startDate, endDate, status } = req.query;

  let whereClauses = ['1=1'];
  const params: any[] = [];

  if (shopId) {
    whereClauses.push('s.shop_id = ?');
    params.push(shopId);
  }

  if (employeeId) {
    whereClauses.push('s.employee_id = ?');
    params.push(employeeId);
  }

  if (startDate) {
    whereClauses.push('s.created_at >= ?');
    params.push(startDate);
  }

  if (endDate) {
    whereClauses.push('s.created_at <= ?');
    params.push(endDate);
  }

  if (status) {
    whereClauses.push('s.status = ?');
    params.push(status);
  }

  const whereStr = whereClauses.join(' AND ');

  const countQuery = `
    SELECT COUNT(s.id) as count
    FROM sales s
    WHERE ${whereStr}
  `;
  const totalCount = (db.prepare(countQuery).get(...params) as any)?.count || 0;

  const listQuery = `
    SELECT 
      s.*,
      shp.name as shop_name,
      e.name as employee_name,
      e.tier as employee_tier
    FROM sales s
    JOIN shops shp ON shp.id = s.shop_id
    JOIN employees e ON e.id = s.employee_id
    WHERE ${whereStr}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const transactions = db.prepare(listQuery).all(...params, limit, offset);

  res.json({
    transactions,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
});

// 6. Platform Audit Log (Filterable)
superAdminRouter.get('/audit-log', (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string) || 30));
  const offset = (page - 1) * limit;

  const { action, shopId } = req.query;
  let whereClauses = ['1=1'];
  const params: any[] = [];

  if (action) {
    whereClauses.push('a.action = ?');
    params.push(action);
  }

  if (shopId) {
    whereClauses.push('a.shop_id = ?');
    params.push(shopId);
  }

  const whereStr = whereClauses.join(' AND ');

  const totalCount = (db.prepare(`SELECT COUNT(id) as count FROM audit_log a WHERE ${whereStr}`).get(...params) as any)?.count || 0;

  const logs = db.prepare(`
    SELECT 
      a.*,
      s.name as shop_name
    FROM audit_log a
    LEFT JOIN shops s ON s.id = a.shop_id
    WHERE ${whereStr}
    ORDER BY a.timestamp DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    logs,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
});

// Impersonation history
superAdminRouter.get('/impersonation-log', (req: Request, res: Response) => {
  const logs = db.prepare(`
    SELECT 
      i.*,
      s.name as shop_name,
      u1.email as super_admin_email,
      u2.email as target_shop_admin_email
    FROM impersonation_log i
    JOIN shops s ON s.id = i.shop_id
    JOIN users u1 ON u1.id = i.super_admin_id
    JOIN users u2 ON u2.id = i.target_shop_admin_id
    ORDER BY i.start_time DESC
    LIMIT 50
  `).all();
  res.json({ logs });
});
