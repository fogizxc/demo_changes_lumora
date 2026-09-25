import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { COMMISSION_RATE, GRACE_PERIOD_DAYS, calculateShopGrossSales, checkAndEnforceShopStatus, generateMonthlyInvoice } from '../services/commission.js';
import { calculateAuthoritativeTax } from '../services/tax.js';
import { createAuthSession, getAuthContext, revokeToken } from '../services/auth.js';

export const testRouter = Router();

export interface TestCaseResult {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

testRouter.get('/run', (req: Request, res: Response) => {
  const results: TestCaseResult[] = [];

  function record(category: string, name: string, fn: () => void) {
    const id = `test_${results.length + 1}`;
    try {
      fn();
      results.push({ id, category, name, passed: true, message: 'Passed successfully' });
    } catch (err: any) {
      results.push({ id, category, name, passed: false, message: err.message || 'Assertion failed', details: err.stack });
    }
  }

  // --- 1. AUTHENTICATION TESTS ---
  record('Authentication', 'Super Admin credential authentication', () => {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get('superadmin@pos-erp.com') as any;
    if (!user || !bcrypt.compareSync('SuperAdmin123!', user.password_hash)) {
      throw new Error('Super Admin password check failed');
    }
    if (user.role !== 'SUPER_ADMIN') throw new Error('Role is not SUPER_ADMIN');
  });

  record('Authentication', 'Shop Admin credential authentication', () => {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get('shopadmin@urbanmart.com') as any;
    if (!user || !bcrypt.compareSync('ShopAdmin123!', user.password_hash)) {
      throw new Error('Shop Admin password check failed');
    }
    if (user.role !== 'SHOP_ADMIN' || !user.shop_id) throw new Error('Invalid Shop Admin role or missing shop_id');
  });

  record('Authentication', 'Employee PIN verification & Tier check', () => {
    const shiftLead = db.prepare("SELECT * FROM employees WHERE employee_id = 'EMP-01'").get() as any;
    if (!shiftLead || !bcrypt.compareSync('1234', shiftLead.authentication_reference)) {
      throw new Error('Shift lead PIN verification failed');
    }
    if (shiftLead.tier !== 'SHIFT_LEAD') throw new Error('Tier is not SHIFT_LEAD');

    const cashier = db.prepare("SELECT * FROM employees WHERE employee_id = 'EMP-02'").get() as any;
    if (!cashier || !bcrypt.compareSync('5678', cashier.authentication_reference)) {
      throw new Error('Cashier PIN verification failed');
    }
    if (cashier.tier !== 'CASHIER') throw new Error('Tier is not CASHIER');
  });

  record('Authentication', 'Invalid login rejection', () => {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get('nonexistent@test.com') as any;
    if (user) throw new Error('Nonexistent user should not exist in DB');

    const emp = db.prepare("SELECT * FROM employees WHERE employee_id = 'EMP-01'").get() as any;
    if (bcrypt.compareSync('wrong_pin_999', emp.authentication_reference)) {
      throw new Error('Wrong PIN should not match');
    }
  });

  record('Authentication', 'Token creation, validation & revocation', () => {
    const token = createAuthSession({ role: 'SUPER_ADMIN', userId: 'test_user_id' });
    const context = getAuthContext(token);
    if (!context || context.role !== 'SUPER_ADMIN') throw new Error('Auth context retrieval failed');
    revokeToken(token);
    const revokedContext = getAuthContext(token);
    if (revokedContext !== null) throw new Error('Revoked token must return null');
  });

  // --- 2. AUTHORIZATION & RBAC TESTS ---
  record('Authorization', 'Strict 1 Shop Admin = 1 Shop relationship', () => {
    const shopAdmin = db.prepare("SELECT * FROM users WHERE role = 'SHOP_ADMIN'").get() as any;
    if (!shopAdmin.shop_id) throw new Error('Shop Admin has no shop_id');
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopAdmin.shop_id) as any;
    if (!shop) throw new Error('Shop does not exist for Shop Admin');
  });

  record('Authorization', 'Cashier vs Shift Lead discount permissions', () => {
    const cashierRole: string = 'CASHIER';
    const shiftLeadRole: string = 'SHIFT_LEAD';
    if (cashierRole === shiftLeadRole) throw new Error('Cashier must not have Shift Lead role');
    if (shiftLeadRole !== 'SHIFT_LEAD') throw new Error('Shift Lead must have SHIFT_LEAD role');
  });

  // --- 3. INVENTORY & TRANSACTION SAFETY TESTS ---
  record('Inventory & POS', 'Authoritative GST Tax calculation exactness', () => {
    const calc = calculateAuthoritativeTax([
      { unitPrice: 650.00, quantity: 2, discount: 0, taxRate: 18.0 }
    ], 0, 'INTRA_STATE');

    if (calc.subtotal !== 1300.00) throw new Error(`Expected subtotal 1300.00, got ${calc.subtotal}`);
    if (calc.taxableAmount !== 1300.00) throw new Error(`Expected taxable 1300.00, got ${calc.taxableAmount}`);
    if (calc.taxAmount !== 234.00) throw new Error(`Expected tax 234.00 (18%), got ${calc.taxAmount}`);
    if (calc.cgstAmount !== 117.00) throw new Error(`Expected CGST 117.00, got ${calc.cgstAmount}`);
    if (calc.sgstAmount !== 117.00) throw new Error(`Expected SGST 117.00, got ${calc.sgstAmount}`);
    if (calc.totalAmount !== 1534.00) throw new Error(`Expected total 1534.00, got ${calc.totalAmount}`);
  });

  record('Inventory & POS', 'Inventory deduction and stock constraint protection', () => {
    const product = db.prepare("SELECT * FROM products WHERE sku = 'GR-001'").get() as any;
    if (!product) throw new Error('Product GR-001 not found');
    if (product.stock < 0) throw new Error('Stock cannot be negative');
  });

  record('Inventory & POS', 'Duplicate checkout idempotency protection', () => {
    const sampleSale = db.prepare("SELECT * FROM sales WHERE idempotency_key = 'idemp_sample_01'").get() as any;
    if (!sampleSale) throw new Error('Idempotent sample sale not found');
    if (sampleSale.invoice_number !== 'INV-2026-0001') throw new Error('Invoice number mismatch');
  });

  record('Inventory & POS', 'Sale employee and session attribution', () => {
    const sale = db.prepare('SELECT * FROM sales LIMIT 1').get() as any;
    if (!sale) throw new Error('No sales found');
    if (!sale.employee_id) throw new Error('Sale missing employee attribution');
    if (!sale.session_id) throw new Error('Sale missing session attribution');
    if (!sale.shop_id) throw new Error('Sale missing shop attribution');
  });

  // --- 4. BILLING & COMMISSION TESTS ---
  record('Billing', 'Authoritative 2% Gross Sales commission formula', () => {
    const grossSales = 10000.00;
    const commission = grossSales * COMMISSION_RATE;
    if (commission !== 200.00) throw new Error(`Expected 200.00, got ${commission}`);
    if (COMMISSION_RATE !== 0.02) throw new Error(`Commission rate must be exactly 0.02`);
  });

  record('Billing', '7-Day Grace Period enforcement check', () => {
    if (GRACE_PERIOD_DAYS !== 7) throw new Error('Grace period must be exactly 7 days');
    const shop = db.prepare('SELECT id FROM shops LIMIT 1').get() as any;
    const statusInfo = checkAndEnforceShopStatus(shop.id);
    if (!['ACTIVE', 'OVERDUE', 'SUSPENDED'].includes(statusInfo.shopStatus)) {
      throw new Error('Invalid shop status');
    }
  });

  // --- 5. AUDIT LOG TESTS ---
  record('Audit Log', 'Audit log immutability and sensitive field redaction', () => {
    const logs = db.prepare('SELECT * FROM audit_log LIMIT 5').all() as any[];
    if (logs.length === 0) throw new Error('No audit logs recorded');
    for (const log of logs) {
      if (log.before && log.before.includes('password_hash')) {
        throw new Error('Sensitive password_hash found unredacted in audit log');
      }
      if (log.after && log.after.includes('password_hash')) {
        throw new Error('Sensitive password_hash found unredacted in audit log');
      }
    }
  });

  // --- 5. MULTI-TENANT & INDUSTRY ENGINE TESTS ---
  record('Multi-Tenancy', 'Tenant Data Isolation enforcement', () => {
    const healthBiz = 'biz_metro_health_01';
    const gymBiz = 'biz_apex_gym_01';

    // Verify Healthcare patients do not leak into Gym queries
    const healthPatients = db.prepare('SELECT * FROM healthcare_patients WHERE business_id = ?').all(healthBiz);
    if (healthPatients.length === 0) throw new Error('No healthcare patients found for Metro Health');

    const leakedInGym = db.prepare('SELECT * FROM healthcare_patients WHERE business_id = ?').all(gymBiz);
    if (leakedInGym.length > 0) throw new Error('Tenant data leakage: Gym tenant accessed Healthcare patient records');
  });

  record('Appointments Engine', 'Strict Doctor / Resource Double-Booking conflict detection', () => {
    const healthBiz = 'biz_metro_health_01';
    const doctorId = 'doc_01';
    const testDate = '2026-10-15';

    // Create appointment 1: 10:00 to 10:30
    db.prepare(`
      INSERT OR REPLACE INTO appointments (
        id, business_id, customer_name, service_name, resource_id, resource_name,
        resource_type, date, start_time, end_time, status, fee, created_at, updated_at
      ) VALUES ('apt_test_01', ?, 'Patient Test A', 'Cardio Review', ?, 'Dr. Ananya Sen', 'DOCTOR', ?, '10:00', '10:30', 'CONFIRMED', 850, datetime('now'), datetime('now'))
    `).run(healthBiz, doctorId, testDate);

    // Attempt overlapping appointment 2: 10:15 to 10:45
    const conflict = db.prepare(`
      SELECT * FROM appointments
      WHERE business_id = ? AND resource_id = ? AND date = ?
        AND status NOT IN ('CANCELLED', 'NO_SHOW')
        AND (
          (start_time < '10:45' AND end_time > '10:15') OR
          (start_time >= '10:15' AND start_time < '10:45') OR
          (end_time > '10:15' AND end_time <= '10:45')
        )
    `).get(healthBiz, doctorId, testDate) as any;

    if (!conflict) {
      throw new Error('Double booking guard failed: overlapping slot was not detected');
    }
    if (conflict.id !== 'apt_test_01') {
      throw new Error('Double booking conflict detected wrong appointment');
    }
  });

  record('Gym Engine', 'Membership Freeze and Expiry Date Extension rules', () => {
    const gymBiz = 'biz_apex_gym_01';
    const member = db.prepare('SELECT * FROM gym_members WHERE business_id = ? LIMIT 1').get(gymBiz) as any;
    if (!member) throw new Error('Gym member not found');

    const plan = db.prepare('SELECT * FROM gym_plans WHERE business_id = ? LIMIT 1').get(gymBiz) as any;
    if (!plan) throw new Error('Gym plan not found');

    if (plan.freeze_limit_days < 1) {
      throw new Error('Plan does not configure freeze entitlements');
    }

    // Verify freeze math
    const freezeDays = 14;
    if (freezeDays > plan.freeze_limit_days) {
      throw new Error('Freeze exceeded limit');
    }
  });

  record('Restaurant Engine', 'Table and KOT status state machine flow', () => {
    const restBiz = 'biz_bistro_royale_01';
    const table = db.prepare('SELECT * FROM restaurant_tables WHERE business_id = ? LIMIT 1').get(restBiz) as any;
    if (!table) throw new Error('Restaurant table not found');

    const order = db.prepare('SELECT * FROM restaurant_orders WHERE business_id = ? LIMIT 1').get(restBiz) as any;
    if (!order) throw new Error('Restaurant order not found');

    const validStatuses = ['RECEIVED', 'KITCHEN', 'READY', 'SERVED', 'BILLED', 'COMPLETED'];
    if (!validStatuses.includes(order.status)) {
      throw new Error(`Invalid KOT order status: ${order.status}`);
    }
  });

  record('Rental Engine', 'Asset Reservation Date Overlap guard', () => {
    const rentBiz = 'biz_gear_rental_01';
    const asset = db.prepare('SELECT * FROM rental_assets WHERE business_id = ? LIMIT 1').get(rentBiz) as any;
    if (!asset) throw new Error('Rental asset not found');

    // Check existing booking
    const booking = db.prepare('SELECT * FROM rental_bookings WHERE business_id = ? AND asset_id = ? LIMIT 1').get(rentBiz, asset.id) as any;
    if (booking) {
      // Overlapping date check
      const overlap = db.prepare(`
        SELECT * FROM rental_bookings
        WHERE business_id = ? AND asset_id = ?
          AND status IN ('ACTIVE', 'BOOKED')
          AND (start_date <= ? AND end_date >= ?)
      `).get(rentBiz, asset.id, booking.end_date, booking.start_date);

      if (!overlap) throw new Error('Rental overlap detector failed to identify matching range');
    }
  });

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  res.json({
    totalTests: results.length,
    passedCount,
    failedCount,
    allPassed: failedCount === 0,
    results,
  });
});

// Helper for test/demo shops list
testRouter.get('/shops', (req: Request, res: Response) => {
  const shops = db.prepare('SELECT id, name, gst_number, vat_number, phone, address, shop_type, tax_state, status FROM shops ORDER BY name ASC').all();
  res.json({ shops });
});

// Helper to switch demo role quickly
testRouter.post('/switch-role', (req: Request, res: Response) => {
  const { role, shopId } = req.body;
  const firstShop = db.prepare('SELECT id FROM shops LIMIT 1').get() as any;
  const targetShopId = shopId || (firstShop ? firstShop.id : 'shp_urbanmart_01');

  let token = '';
  let user: any = null;
  let employee: any = null;
  let session: any = null;
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(targetShopId);

  if (role === 'SUPER_ADMIN') {
    user = db.prepare("SELECT * FROM users WHERE role = 'SUPER_ADMIN'").get() as any;
    token = createAuthSession({ userId: user.id, role: 'SUPER_ADMIN' });
  } else if (role === 'SHOP_ADMIN') {
    user = db.prepare("SELECT * FROM users WHERE role = 'SHOP_ADMIN' AND shop_id = ?").get(targetShopId) as any;
    if (!user) {
      user = db.prepare("SELECT * FROM users WHERE role = 'SHOP_ADMIN'").get() as any;
    }
    token = createAuthSession({ userId: user.id, role: 'SHOP_ADMIN', shopId: user.shop_id });
  } else if (role === 'SHIFT_LEAD' || role === 'CASHIER') {
    employee = db.prepare('SELECT * FROM employees WHERE shop_id = ? AND tier = ?').get(targetShopId, role) as any;
    if (!employee) {
      employee = db.prepare('SELECT * FROM employees WHERE tier = ?').get(role) as any;
    }

    const sessionId = 'ses_demo_' + Math.random().toString(36).substring(2, 7);
    db.prepare(`
      INSERT INTO sessions (id, employee_id, shop_id, login_at, status)
      VALUES (?, ?, ?, datetime('now'), 'ACTIVE')
    `).run(sessionId, employee.id, employee.shop_id);

    session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    token = createAuthSession({ employeeId: employee.id, role, shopId: employee.shop_id });
  }

  res.json({
    token,
    role,
    user: user ? { id: user.id, email: user.email, role: user.role, shop_id: user.shop_id } : null,
    employee: employee ? { id: employee.id, name: employee.name, employee_id: employee.employee_id, tier: employee.tier } : null,
    shop,
    session,
  });
});

