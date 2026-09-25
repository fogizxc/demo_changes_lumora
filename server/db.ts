import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Type definitions for node:sqlite
interface StatementSync {
  all(...params: any[]): any[];
  get(...params: any[]): any;
  run(...params: any[]): { changes: number | bigint; lastInsertRowid: number | bigint };
}

export interface DatabaseSyncInstance {
  exec(sql: string): void;
  prepare(sql: string): StatementSync;
  close(): void;
  transaction<T extends (...args: any[]) => any>(fn: T): T;
}

// Load node:sqlite safely for both ESM and CJS bundle
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(process.cwd(), 'pos_erp.sqlite');
const rawDb = new DatabaseSync(DB_PATH);

// Provide transaction helper compatible with better-sqlite3 signature
(rawDb as any).transaction = function<T extends (...args: any[]) => any>(fn: T): T {
  return function(...args: any[]) {
    rawDb.exec('BEGIN IMMEDIATE;');
    try {
      const result = fn(...args);
      rawDb.exec('COMMIT;');
      return result;
    } catch (err) {
      try {
        rawDb.exec('ROLLBACK;');
      } catch {
        // ignore rollback failure if transaction already aborted
      }
      throw err;
    }
  } as T;
};

export const db: DatabaseSyncInstance = rawDb as unknown as DatabaseSyncInstance;

// Enable foreign key constraints
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gst_number TEXT NOT NULL,
      vat_number TEXT,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      short_note TEXT,
      shop_type TEXT NOT NULL DEFAULT 'retail',
      tax_state TEXT NOT NULL DEFAULT 'INTRA_STATE',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      shop_id TEXT REFERENCES shops(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL,
      name TEXT NOT NULL,
      tier TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      authentication_reference TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(shop_id, employee_id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL REFERENCES employees(id),
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      login_at TEXT NOT NULL,
      logout_at TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      sku TEXT NOT NULL,
      barcode TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT,
      description TEXT,
      price REAL NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      mrp REAL,
      stock INTEGER NOT NULL DEFAULT 0,
      low_stock_threshold INTEGER NOT NULL DEFAULT 5,
      tax_rate REAL NOT NULL DEFAULT 18.0,
      unit TEXT NOT NULL DEFAULT 'PCS',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      has_expiry INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(shop_id, sku)
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      gst_number TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      supplier_id TEXT REFERENCES suppliers(id),
      purchase_number TEXT NOT NULL,
      invoice_reference TEXT,
      total_amount REAL NOT NULL,
      items_count INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity REAL NOT NULL,
      cost_price REAL NOT NULL,
      line_total REAL NOT NULL,
      batch_number TEXT,
      expiry_date TEXT
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      movement_type TEXT NOT NULL,
      quantity_change REAL NOT NULL,
      previous_stock REAL NOT NULL,
      new_stock REAL NOT NULL,
      cost_price REAL,
      reference_id TEXT,
      reference_note TEXT,
      actor_id TEXT NOT NULL,
      actor_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_batches (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      batch_number TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      received_at TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(shop_id, product_id, batch_number)
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL REFERENCES employees(id),
      session_id TEXT NOT NULL REFERENCES sessions(id),
      invoice_number TEXT UNIQUE NOT NULL,
      idempotency_key TEXT UNIQUE,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      taxable_amount REAL NOT NULL,
      tax_amount REAL NOT NULL,
      cgst_amount REAL NOT NULL DEFAULT 0,
      sgst_amount REAL NOT NULL DEFAULT 0,
      igst_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      void_reason TEXT,
      voided_by TEXT REFERENCES employees(id),
      voided_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL,
      line_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      amount_received REAL,
      change_due REAL,
      reference_note TEXT,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS held_bills (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL REFERENCES employees(id),
      session_id TEXT NOT NULL REFERENCES sessions(id),
      reference_label TEXT NOT NULL,
      customer_name TEXT,
      cart_data TEXT NOT NULL,
      items_count INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      total_estimate REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'HELD',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL REFERENCES employees(id),
      session_id TEXT NOT NULL REFERENCES sessions(id),
      refund_invoice_number TEXT UNIQUE NOT NULL,
      subtotal REAL NOT NULL,
      tax_amount REAL NOT NULL,
      total_refund_amount REAL NOT NULL,
      reason TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refund_items (
      id TEXT PRIMARY KEY,
      refund_id TEXT NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
      sale_item_id TEXT NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      tax REAL NOT NULL,
      refund_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
      billing_period TEXT NOT NULL,
      gross_sales REAL NOT NULL,
      commission_rate REAL NOT NULL DEFAULT 0.02,
      commission_due REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      sent_at TEXT NOT NULL,
      grace_period_ends_at TEXT NOT NULL,
      paid_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      shop_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      before TEXT,
      after TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS impersonation_log (
      id TEXT PRIMARY KEY,
      super_admin_id TEXT NOT NULL,
      target_shop_admin_id TEXT NOT NULL,
      shop_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      actions TEXT
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      token TEXT PRIMARY KEY,
      user_id TEXT,
      employee_id TEXT,
      role TEXT NOT NULL,
      shop_id TEXT,
      is_impersonating INTEGER DEFAULT 0,
      super_admin_id TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- =========================================================================
    -- LUMORA MULTI-TENANT CORE + MODULAR INDUSTRY ENGINES
    -- =========================================================================

    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      industry TEXT NOT NULL DEFAULT 'RETAIL',
      business_type TEXT NOT NULL DEFAULT 'STANDARD',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      logo TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      address TEXT,
      country TEXT DEFAULT 'India',
      state TEXT DEFAULT 'Maharashtra',
      city TEXT DEFAULT 'Mumbai',
      timezone TEXT DEFAULT 'Asia/Kolkata',
      currency TEXT DEFAULT 'INR',
      tax_configuration TEXT DEFAULT '{}',
      enabled_modules TEXT DEFAULT '[]',
      settings TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      timezone TEXT DEFAULT 'Asia/Kolkata',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      settings TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      business_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      is_system INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      branch_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 30,
      price REAL NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 18.0,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      branch_id TEXT,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      service_id TEXT,
      service_name TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      resource_name TEXT NOT NULL,
      resource_type TEXT NOT NULL DEFAULT 'STAFF',
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      fee REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS healthcare_patients (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      patient_number TEXT NOT NULL,
      name TEXT NOT NULL,
      date_of_birth TEXT,
      gender TEXT,
      blood_group TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      emergency_contact TEXT,
      medical_history TEXT,
      allergies TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS healthcare_doctors (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      specialization TEXT NOT NULL,
      department TEXT NOT NULL,
      qualification TEXT,
      license_number TEXT,
      consultation_fee REAL NOT NULL DEFAULT 500,
      phone TEXT,
      email TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      available_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS healthcare_consultations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      appointment_id TEXT,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      symptoms TEXT,
      diagnosis TEXT,
      vital_signs TEXT,
      prescriptions TEXT,
      lab_tests TEXT,
      doctor_notes TEXT,
      follow_up_date TEXT,
      fee REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'PAID',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gym_members (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      member_number TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      emergency_contact TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      join_date TEXT NOT NULL,
      trainer_name TEXT,
      fitness_goal TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gym_plans (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      duration_months INTEGER NOT NULL,
      price REAL NOT NULL,
      benefits TEXT,
      usage_limit INTEGER DEFAULT 0,
      freeze_limit_days INTEGER DEFAULT 14,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gym_memberships (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      freeze_status TEXT DEFAULT 'NORMAL',
      frozen_until TEXT,
      price_paid REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gym_attendance (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      check_in_time TEXT NOT NULL,
      workout_type TEXT DEFAULT 'GENERAL',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS restaurant_tables (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      table_number TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      floor_section TEXT NOT NULL DEFAULT 'Main Dining',
      status TEXT NOT NULL DEFAULT 'VACANT',
      current_order_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS restaurant_orders (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      table_id TEXT,
      table_number TEXT,
      order_number TEXT NOT NULL,
      order_type TEXT NOT NULL DEFAULT 'DINE_IN',
      items_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'RECEIVED',
      subtotal REAL NOT NULL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      waiter_name TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS repair_jobs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      job_number TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      device_type TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      serial_number TEXT,
      reported_fault TEXT NOT NULL,
      diagnosis TEXT,
      technician_name TEXT,
      status TEXT NOT NULL DEFAULT 'RECEIVED',
      estimated_cost REAL NOT NULL DEFAULT 0,
      parts_cost REAL NOT NULL DEFAULT 0,
      labor_cost REAL NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      delivery_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rental_assets (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      serial_number TEXT,
      daily_rate REAL NOT NULL,
      deposit_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      condition_notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rental_bookings (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      asset_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      daily_rate REAL NOT NULL,
      deposit_paid REAL NOT NULL,
      total_rent REAL NOT NULL,
      late_fee REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      returned_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      branch_id TEXT,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      vendor TEXT,
      date TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS education_courses (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      duration_weeks INTEGER NOT NULL,
      fee REAL NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS education_students (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      course_id TEXT NOT NULL,
      batch_name TEXT NOT NULL,
      fee_total REAL NOT NULL,
      fee_paid REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      enrollment_date TEXT NOT NULL
    );

    -- Indices for high performance
    CREATE INDEX IF NOT EXISTS idx_sales_shop_id ON sales(shop_id);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_employee_id ON sales(employee_id);
    CREATE INDEX IF NOT EXISTS idx_products_shop_category ON products(shop_id, category);
    CREATE INDEX IF NOT EXISTS idx_audit_shop ON audit_log(shop_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_shop ON invoices(shop_id);
    CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id);
    CREATE INDEX IF NOT EXISTS idx_payments_shop ON payments(shop_id);
    CREATE INDEX IF NOT EXISTS idx_held_bills_shop ON held_bills(shop_id, status);
    CREATE INDEX IF NOT EXISTS idx_refunds_sale ON refunds(sale_id);
    CREATE INDEX IF NOT EXISTS idx_refunds_shop ON refunds(shop_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_shop ON purchases(shop_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
    CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON purchase_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(shop_id, product_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(shop_id, movement_type);
    CREATE INDEX IF NOT EXISTS idx_product_batches_expiry ON product_batches(shop_id, product_id, expiry_date);
    CREATE INDEX IF NOT EXISTS idx_biz_industry ON businesses(industry);
    CREATE INDEX IF NOT EXISTS idx_branches_biz ON branches(business_id);
    CREATE INDEX IF NOT EXISTS idx_appts_biz_date ON appointments(business_id, date);
    CREATE INDEX IF NOT EXISTS idx_appts_resource ON appointments(business_id, resource_id, date);
    CREATE INDEX IF NOT EXISTS idx_health_patients ON healthcare_patients(business_id);
    CREATE INDEX IF NOT EXISTS idx_health_docs ON healthcare_doctors(business_id);
    CREATE INDEX IF NOT EXISTS idx_gym_members ON gym_members(business_id);
    CREATE INDEX IF NOT EXISTS idx_gym_memberships ON gym_memberships(business_id, member_id);
    CREATE INDEX IF NOT EXISTS idx_rest_tables ON restaurant_tables(business_id);
    CREATE INDEX IF NOT EXISTS idx_rest_orders ON restaurant_orders(business_id, status);
    CREATE INDEX IF NOT EXISTS idx_repair_jobs ON repair_jobs(business_id, status);
    CREATE INDEX IF NOT EXISTS idx_rental_bookings ON rental_bookings(business_id, asset_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_biz ON expenses(business_id, category);
  `);

  // Migration: verify/add columns in products table
  try {
    const cols = db.prepare("PRAGMA table_info(products)").all() as any[];
    const colNames = new Set(cols.map((c: any) => c.name));

    if (!colNames.has('barcode')) {
      db.exec('ALTER TABLE products ADD COLUMN barcode TEXT;');
    }
    if (!colNames.has('brand')) {
      db.exec('ALTER TABLE products ADD COLUMN brand TEXT;');
    }
    if (!colNames.has('description')) {
      db.exec('ALTER TABLE products ADD COLUMN description TEXT;');
    }
    if (!colNames.has('cost_price')) {
      db.exec('ALTER TABLE products ADD COLUMN cost_price REAL NOT NULL DEFAULT 0;');
    }
    if (!colNames.has('mrp')) {
      db.exec('ALTER TABLE products ADD COLUMN mrp REAL;');
    }
    if (!colNames.has('unit')) {
      db.exec("ALTER TABLE products ADD COLUMN unit TEXT NOT NULL DEFAULT 'PCS';");
    }
    if (!colNames.has('status')) {
      db.exec("ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';");
    }
    if (!colNames.has('has_expiry')) {
      db.exec('ALTER TABLE products ADD COLUMN has_expiry INTEGER NOT NULL DEFAULT 0;');
    }

    db.exec('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(shop_id, barcode);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_products_status ON products(shop_id, status);');
  } catch (err) {
    console.error('Migration warning (products columns):', err);
  }

  // Migration: verify/add columns in suppliers table
  try {
    const supCols = db.prepare("PRAGMA table_info(suppliers)").all() as any[];
    const supColNames = new Set(supCols.map((c: any) => c.name));
    if (!supColNames.has('status')) {
      db.exec("ALTER TABLE suppliers ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';");
    }
    db.exec('CREATE INDEX IF NOT EXISTS idx_suppliers_shop ON suppliers(shop_id, status);');
  } catch (err) {
    console.error('Migration warning (suppliers columns):', err);
  }

  // Migration: verify/add columns in shops table
  try {
    const shopCols = db.prepare("PRAGMA table_info(shops)").all() as any[];
    const shopColNames = new Set(shopCols.map((c: any) => c.name));
    if (!shopColNames.has('shop_type')) db.exec("ALTER TABLE shops ADD COLUMN shop_type TEXT NOT NULL DEFAULT 'retail';");
    if (!shopColNames.has('tax_state')) db.exec("ALTER TABLE shops ADD COLUMN tax_state TEXT NOT NULL DEFAULT 'INTRA_STATE';");
    if (!shopColNames.has('status')) db.exec("ALTER TABLE shops ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';");
    if (!shopColNames.has('vat_number')) db.exec("ALTER TABLE shops ADD COLUMN vat_number TEXT;");
  } catch (err) {
    console.error('Migration warning (shops columns):', err);
  }

  // Migration: verify/add columns in sales table
  try {
    const saleCols = db.prepare("PRAGMA table_info(sales)").all() as any[];
    const saleColNames = new Set(saleCols.map((c: any) => c.name));
    if (!saleColNames.has('cgst_amount')) db.exec("ALTER TABLE sales ADD COLUMN cgst_amount REAL NOT NULL DEFAULT 0;");
    if (!saleColNames.has('sgst_amount')) db.exec("ALTER TABLE sales ADD COLUMN sgst_amount REAL NOT NULL DEFAULT 0;");
    if (!saleColNames.has('igst_amount')) db.exec("ALTER TABLE sales ADD COLUMN igst_amount REAL NOT NULL DEFAULT 0;");
  } catch (err) {
    console.error('Migration warning (sales columns):', err);
  }

  // Populate default barcodes & cost prices for demo products
  const productDefaults: Record<string, { barcode: string; costPrice: number; brand: string; unit: string; hasExpiry?: number }> = {
    'GR-001': { barcode: '8901030383012', costPrice: 480.00, brand: 'Nature Heritage', unit: 'BAG', hasExpiry: 1 },
    'GR-002': { barcode: '8901030383029', costPrice: 155.00, brand: 'PureGold', unit: 'BOTTLE' },
    'BV-001': { barcode: '8901030383036', costPrice: 290.00, brand: 'Blue Mountain', unit: 'PACK' },
    'BV-002': { barcode: '8901030383043', costPrice: 65.00, brand: 'Himalayan Waters', unit: 'BOTTLE' },
    'SN-001': { barcode: '8901030383050', costPrice: 245.00, brand: 'NuttyDelight', unit: 'PACK' },
    'SN-002': { barcode: '8901030383067', costPrice: 195.00, brand: 'ChocoArtisan', unit: 'BOX', hasExpiry: 1 },
    'PC-001': { barcode: '8901030383074', costPrice: 115.00, brand: 'AyurCare', unit: 'BOTTLE' },
    'PC-002': { barcode: '8901030383081', costPrice: 90.00, brand: 'BioDent', unit: 'TUBE' },
    'DA-001': { barcode: '8901030383098', costPrice: 62.00, brand: 'DesiFarm', unit: 'L', hasExpiry: 1 },
    'DA-002': { barcode: '8901030383104', costPrice: 230.00, brand: 'Fromagerie', unit: 'PACK', hasExpiry: 1 },
  };

  try {
    for (const [sku, def] of Object.entries(productDefaults)) {
      db.prepare(`
        UPDATE products 
        SET 
          barcode = CASE WHEN barcode IS NULL OR barcode = '' THEN ? ELSE barcode END,
          cost_price = CASE WHEN cost_price IS NULL OR cost_price = 0 THEN ? ELSE cost_price END,
          brand = CASE WHEN brand IS NULL OR brand = '' THEN ? ELSE brand END,
          unit = CASE WHEN unit IS NULL OR unit = '' THEN ? ELSE unit END,
          has_expiry = CASE WHEN has_expiry IS NULL THEN ? ELSE has_expiry END
        WHERE sku = ?
      `).run(def.barcode, def.costPrice, def.brand, def.unit, def.hasExpiry || 0, sku);
    }
  } catch (err) {
    console.error('Product defaults update warning:', err);
  }

  // Ensure sample payments exist for sample sales
  try {
    const payCount = (db.prepare('SELECT COUNT(*) as count FROM payments').get() as any)?.count || 0;
    if (payCount === 0) {
      const sale1 = db.prepare("SELECT * FROM sales WHERE id = 'sal_sample_01'").get() as any;
      if (sale1) {
        db.prepare(`
          INSERT INTO payments (id, sale_id, shop_id, method, amount, amount_received, change_due, reference_note, status, created_at)
          VALUES ('pay_sample_01', 'sal_sample_01', ?, 'CASH', ?, 1200.00, ?, 'Cash Till', 'COMPLETED', ?)
        `).run(sale1.shop_id, sale1.total_amount, 1200.00 - sale1.total_amount, sale1.created_at);
      }
      const sale2 = db.prepare("SELECT * FROM sales WHERE id = 'sal_sample_02'").get() as any;
      if (sale2) {
        db.prepare(`
          INSERT INTO payments (id, sale_id, shop_id, method, amount, amount_received, change_due, reference_note, status, created_at)
          VALUES ('pay_sample_02', 'sal_sample_02', ?, 'CARD', ?, ?, 0.00, 'POS Terminal Card Auth #4928', 'COMPLETED', ?)
        `).run(sale2.shop_id, sale2.total_amount, sale2.total_amount, sale2.created_at);
      }
    }
  } catch (err) {
    console.error('Sample payments warning:', err);
  }

  // Ensure default suppliers exist for demo shop
  try {
    const supCount = (db.prepare("SELECT COUNT(*) as count FROM suppliers WHERE shop_id = 'shp_urbanmart_01'").get() as any)?.count || 0;
    if (supCount === 0) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO suppliers (id, shop_id, name, contact_person, phone, email, address, gst_number, status, notes, created_at, updated_at)
        VALUES 
          ('sup_01', 'shp_urbanmart_01', 'Green Valley Organics Ltd', 'Rajesh Sharma', '+91 98200 11223', 'orders@greenvalley.in', 'APMC Market Yard, Navi Mumbai', '27AABCG1234F1Z1', 'ACTIVE', 'Primary supplier for organic staples and pulses', ?, ?),
          ('sup_02', 'shp_urbanmart_01', 'Himalayan Artisan Roasters', 'Priya Nair', '+91 98211 44556', 'supply@himalayancoffee.com', 'Industrial Area, Chikmagalur, KA', '29AAACH5566G1Z2', 'ACTIVE', 'Artisan coffee bean supply and tea imports', ?, ?),
          ('sup_03', 'shp_urbanmart_01', 'Metro FMCG & Personal Care', 'Sunil Mehta', '+91 98333 77889', 'contact@metrofmcg.com', 'Bhiwandi Logistics Park, MH', '27AACCM9988H1Z3', 'ACTIVE', 'Daily personal care and packaged snack distributor', ?, ?)
      `).run(now, now, now, now, now, now);
    }
  } catch (err) {
    console.error('Supplier seed warning:', err);
  }

  // Ensure initial stock movements exist if none
  try {
    const movCount = (db.prepare("SELECT COUNT(*) as count FROM stock_movements WHERE shop_id = 'shp_urbanmart_01'").get() as any)?.count || 0;
    if (movCount === 0) {
      const products = db.prepare("SELECT id, stock, cost_price FROM products WHERE shop_id = 'shp_urbanmart_01'").all() as any[];
      const now = new Date().toISOString();
      for (const p of products) {
        if (p.stock > 0) {
          db.prepare(`
            INSERT INTO stock_movements (id, shop_id, product_id, movement_type, quantity_change, previous_stock, new_stock, cost_price, reference_id, reference_note, actor_id, actor_name, created_at)
            VALUES (?, 'shp_urbanmart_01', ?, 'PURCHASE', ?, 0, ?, ?, 'PO-INIT-01', 'Initial Opening Stock / Supplier Inward', 'usr_shopadmin_01', 'Shop Admin', ?)
          `).run('sm_init_' + p.id, p.id, p.stock, p.stock, p.cost_price || 0, now);
        }
      }
    }
  } catch (err) {
    console.error('Stock movements seed warning:', err);
  }

  // Ensure default batches exist for perishable goods (Milk, Truffles, Basmati)
  try {
    const batchCount = (db.prepare("SELECT COUNT(*) as count FROM product_batches WHERE shop_id = 'shp_urbanmart_01'").get() as any)?.count || 0;
    if (batchCount === 0) {
      const now = new Date();
      const nowIso = now.toISOString();
      const d5 = new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0];
      const d25 = new Date(now.getTime() + 25 * 86400000).toISOString().split('T')[0];
      const d180 = new Date(now.getTime() + 180 * 86400000).toISOString().split('T')[0];
      const d365 = new Date(now.getTime() + 365 * 86400000).toISOString().split('T')[0];

      db.prepare(`
        INSERT INTO product_batches (id, shop_id, product_id, batch_number, quantity, cost_price, received_at, expiry_date, status, created_at, updated_at)
        VALUES 
          ('pb_01', 'shp_urbanmart_01', 'prd_09', 'BATCH-MLK-01', 15, 62.00, ?, ?, 'ACTIVE', ?, ?),
          ('pb_02', 'shp_urbanmart_01', 'prd_09', 'BATCH-MLK-02', 25, 62.00, ?, ?, 'ACTIVE', ?, ?),
          ('pb_03', 'shp_urbanmart_01', 'prd_06', 'BATCH-TRF-01', 18, 195.00, ?, ?, 'ACTIVE', ?, ?),
          ('pb_04', 'shp_urbanmart_01', 'prd_01', 'BATCH-RCE-01', 45, 480.00, ?, ?, 'ACTIVE', ?, ?)
      `).run(nowIso, d5, nowIso, nowIso, nowIso, d25, nowIso, nowIso, nowIso, d180, nowIso, nowIso, nowIso, d365, nowIso, nowIso);
    }
  } catch (err) {
    console.error('Batches seed warning:', err);
  }

  seedDefaultData();
  seedMultiTenantData();
  seedIndustryShopAccounts();
}

function seedIndustryShopAccounts() {
  const now = new Date().toISOString();

  const industryShops = [
    {
      id: 'biz_metro_health_01',
      name: 'Metro City Clinic & Hospital',
      gst: '27AAACH9988H1Z1',
      phone: '+91 22 2844 9900',
      address: 'Healthcare Complex, SV Road, Malad West, Mumbai 400064',
      short_note: 'Multi-specialty tertiary care hospital with 24/7 OPD & Diagnostics',
      shop_type: 'healthcare',
      email: 'hospital@lumora.com',
      password: 'Hospital123!',
      userId: 'usr_hospital_01',
    },
    {
      id: 'biz_apex_gym_01',
      name: 'Apex Pro Fitness & Gym',
      gst: '27AAACG7766G1Z2',
      phone: '+91 99887 66554',
      address: '3rd Floor, Infinity Tower, Link Road, Andheri West, Mumbai 400053',
      short_note: 'State-of-the-art strength, cardio & functional athletic center',
      shop_type: 'gym',
      email: 'gym@lumora.com',
      password: 'Gym123!',
      userId: 'usr_gym_01',
    },
    {
      id: 'biz_bistro_royale_01',
      name: 'Bistro Royale Dining & Cafe',
      gst: '27AAACR5544R1Z3',
      phone: '+91 22 2288 4400',
      address: 'Bakehouse Lane, Kala Ghoda, Fort, Mumbai 400001',
      short_note: 'Artisan bakery, fine dining cuisine & specialty coffee lounge',
      shop_type: 'restaurant',
      email: 'restaurant@lumora.com',
      password: 'Restaurant123!',
      userId: 'usr_restaurant_01',
    },
    {
      id: 'biz_gear_rental_01',
      name: 'GearRent Pro Equipment & Fleet',
      gst: '27AAACF3322F1Z4',
      phone: '+91 98199 00881',
      address: 'Unit 8, Film City Hub, Goregaon East, Mumbai 400065',
      short_note: 'Professional cinema camera, lighting gear & event audio fleet',
      shop_type: 'rental',
      email: 'rental@lumora.com',
      password: 'Rental123!',
      userId: 'usr_rental_01',
    },
    {
      id: 'biz_techfix_01',
      name: 'TechFix Pro Service Lab',
      gst: '27AAACT1100T1Z5',
      phone: '+91 98200 99112',
      address: 'Shop 4B, Lamington Road, Grant Road East, Mumbai 400007',
      short_note: 'Apple & multi-brand hardware diagnostics, motherboard & screen repair lab',
      shop_type: 'repair',
      email: 'repair@lumora.com',
      password: 'Repair123!',
      userId: 'usr_repair_01',
    },
  ];

  for (const item of industryShops) {
    try {
      // 1. Ensure shop exists
      const existingShop = db.prepare('SELECT id FROM shops WHERE id = ?').get(item.id);
      if (!existingShop) {
        db.prepare(`
          INSERT INTO shops (id, name, gst_number, vat_number, phone, address, short_note, shop_type, tax_state, status, created_at, updated_at)
          VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 'INTRA_STATE', 'ACTIVE', ?, ?)
        `).run(item.id, item.name, item.gst, item.phone, item.address, item.short_note, item.shop_type, now, now);
      } else {
        db.prepare('UPDATE shops SET shop_type = ? WHERE id = ?').run(item.shop_type, item.id);
      }

      // 2. Ensure user credentials exist
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(item.email);
      if (!existingUser) {
        const passwordHash = bcrypt.hashSync(item.password, 10);
        db.prepare(`
          INSERT INTO users (id, email, password_hash, role, shop_id, created_at, updated_at)
          VALUES (?, ?, ?, 'SHOP_ADMIN', ?, ?, ?)
        `).run(item.userId, item.email, passwordHash, item.id, now, now);
      }
    } catch (e) {
      console.error('Error seeding industry shop:', item.id, e);
    }
  }
}

function seedMultiTenantData() {
  const checkBiz = db.prepare("SELECT id FROM businesses WHERE id = 'biz_metro_health_01'").get();
  if (checkBiz) {
    return; // Multi-tenant dataset already seeded
  }

  const now = new Date().toISOString();

  // 1. Synchronize existing 'shops' into 'businesses' table
  try {
    const existingShops = db.prepare('SELECT * FROM shops').all() as any[];
    for (const s of existingShops) {
      db.prepare(`
        INSERT OR IGNORE INTO businesses (
          id, name, slug, industry, business_type, status, logo, email, phone, website,
          address, country, state, city, timezone, currency, tax_configuration, enabled_modules, settings, created_at, updated_at
        ) VALUES (
          ?, ?, ?, 'RETAIL', 'SUPERMARKET', 'ACTIVE', NULL, 'contact@urbanmart.com', ?, 'https://urbanmart.com',
          ?, 'India', 'Maharashtra', 'Mumbai', 'Asia/Kolkata', 'INR',
          ?, '["POS","INVENTORY","PRODUCTS","CUSTOMERS","SUPPLIERS","ORDERS","BILLING","EXPENSES","REPORTS"]',
          ?, ?, ?
        )
      `).run(
        s.id, s.name, 'urban-mart-retail', s.phone, s.address,
        JSON.stringify({ gst: s.gst_number, tax_state: s.tax_state }),
        JSON.stringify({ short_note: s.short_note }),
        s.created_at || now, s.updated_at || now
      );

      // Create primary branches for Urban Mart
      db.prepare(`
        INSERT OR IGNORE INTO branches (id, business_id, name, code, address, phone, timezone, status, settings, created_at, updated_at)
        VALUES 
          ('brn_urban_01', ?, 'Main Flagship Store - Bandra West', 'UM-BND-01', ?, ?, 'Asia/Kolkata', 'ACTIVE', '{}', ?, ?),
          ('brn_urban_02', ?, 'Metro Express - Andheri East', 'UM-AND-02', 'Shop 12, Metro Junction, Andheri East, Mumbai', '+91 98765 11223', 'Asia/Kolkata', 'ACTIVE', '{}', ?, ?)
      `).run(s.id, s.address, s.phone, now, now, s.id, now, now);
    }
  } catch (err) {
    console.error('Error syncing shops to businesses:', err);
  }

  // 2. HEALTHCARE TENANT: Metro City Clinic & Hospital
  try {
    const healthBizId = 'biz_metro_health_01';
    db.prepare(`
      INSERT OR IGNORE INTO businesses (
        id, name, slug, industry, business_type, status, logo, email, phone, website,
        address, country, state, city, timezone, currency, tax_configuration, enabled_modules, settings, created_at, updated_at
      ) VALUES (
        ?, 'Metro City Clinic & Hospital', 'metro-city-hospital', 'HEALTHCARE', 'CLINIC_HOSPITAL', 'ACTIVE', NULL,
        'reception@metrohealth.org', '+91 22 2844 9900', 'https://metrohealth.org',
        'Healthcare Complex, SV Road, Malad West, Mumbai 400064', 'India', 'Maharashtra', 'Mumbai', 'Asia/Kolkata', 'INR',
        '{"exempt_tax": true}',
        '["PATIENTS","DOCTORS","DEPARTMENTS","APPOINTMENTS","MEDICAL_RECORDS","BILLING","PAYMENTS","REPORTS"]',
        '{"specialties":["Cardiology","General Medicine","Pediatrics","Orthopedics"]}',
        ?, ?
      )
    `).run(healthBizId, now, now);

    db.prepare(`
      INSERT OR IGNORE INTO branches (id, business_id, name, code, address, phone, status, created_at, updated_at)
      VALUES ('brn_health_01', ?, 'Main OPD & Diagnostics Block', 'MCH-OPD-01', 'Healthcare Complex, SV Road, Mumbai', '+91 22 2844 9901', 'ACTIVE', ?, ?)
    `).run(healthBizId, now, now);

    // Doctors
    db.prepare(`
      INSERT OR IGNORE INTO healthcare_doctors (id, business_id, name, specialization, department, qualification, license_number, consultation_fee, phone, email, status, available_days, created_at)
      VALUES 
        ('doc_01', ?, 'Dr. Ananya Sen', 'Senior Cardiologist', 'Cardiology', 'MBBS, MD (Cardiology), DM', 'MMC-2012-4491', 850.00, '+91 98200 88771', 'drananya@metrohealth.org', 'ACTIVE', 'Mon,Wed,Fri,Sat', ?),
        ('doc_02', ?, 'Dr. Vikram Roy', 'Consultant Physician', 'General Medicine', 'MBBS, DNB Internal Medicine', 'MMC-2015-8821', 500.00, '+91 98201 33442', 'drvikram@metrohealth.org', 'ACTIVE', 'Mon,Tue,Wed,Thu,Fri', ?),
        ('doc_03', ?, 'Dr. Meera Deshmukh', 'Pediatric Specialist', 'Pediatrics', 'MBBS, MD (Pediatrics), DCH', 'MMC-2018-1190', 600.00, '+91 98202 55663', 'drmeera@metrohealth.org', 'ACTIVE', 'Tue,Thu,Sat', ?)
    `).run(healthBizId, now, healthBizId, now, healthBizId, now);

    // Patients
    db.prepare(`
      INSERT OR IGNORE INTO healthcare_patients (id, business_id, patient_number, name, date_of_birth, gender, blood_group, phone, email, address, emergency_contact, medical_history, allergies, status, created_at, updated_at)
      VALUES 
        ('pt_01', ?, 'PT-1001', 'Rahul Verma', '1988-04-12', 'MALE', 'B+', '+91 98201 55667', 'rahul.verma@example.com', 'Flat 402, Sea Breeze, Bandra, Mumbai', 'Pooja Verma (+91 98201 55668)', 'Mild Hypertension, Dyslipidemia', 'Penicillin', 'ACTIVE', ?, ?),
        ('pt_02', ?, 'PT-1002', 'Sangeeta Sharma', '1975-09-22', 'FEMALE', 'O+', '+91 98190 22334', 'sangeeta.sharma@example.com', 'A-12, Green Acres, Juhu, Mumbai', 'Ramesh Sharma (+91 98190 22330)', 'Type 2 Diabetes, Thyroidectomy', 'Sulfa drugs', 'ACTIVE', ?, ?),
        ('pt_03', ?, 'PT-1003', 'Aarav Mehta', '2018-01-15', 'MALE', 'A+', '+91 98205 99881', 'mehta.parents@example.com', '104, Sunrise Towers, Andheri, Mumbai', 'Nita Mehta (+91 98205 99881)', 'Childhood Bronchitis', 'None known', 'ACTIVE', ?, ?),
        ('pt_04', ?, 'PT-1004', 'Priya Nair', '1995-11-04', 'FEMALE', 'AB+', '+91 98333 44551', 'priya.nair@example.com', 'B-302, Palm Beach, Navi Mumbai', 'Dev Nair (+91 98333 44550)', 'Seasonal Allergic Rhinitis', 'Dust, Pollen', 'ACTIVE', ?, ?)
    `).run(healthBizId, now, now, healthBizId, now, now, healthBizId, now, now, healthBizId, now, now);

    // Today's Appointments
    const todayStr = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT OR IGNORE INTO appointments (id, business_id, branch_id, customer_id, customer_name, customer_phone, service_id, service_name, resource_id, resource_name, resource_type, date, start_time, end_time, status, payment_status, fee, notes, created_at, updated_at)
      VALUES 
        ('apt_01', ?, 'brn_health_01', 'pt_01', 'Rahul Verma', '+91 98201 55667', 'srv_cardio', 'Cardiology Consultation', 'doc_01', 'Dr. Ananya Sen', 'DOCTOR', ?, '10:00', '10:30', 'COMPLETED', 'PAID', 850.00, 'Follow-up for stress ECG report', ?, ?),
        ('apt_02', ?, 'brn_health_01', 'pt_02', 'Sangeeta Sharma', '+91 98190 22334', 'srv_genmed', 'Routine Health & Blood Sugar Checkup', 'doc_02', 'Dr. Vikram Roy', 'DOCTOR', ?, '11:30', '12:00', 'IN_PROGRESS', 'PAID', 500.00, 'Fasting glucose 134 mg/dL', ?, ?),
        ('apt_03', ?, 'brn_health_01', 'pt_03', 'Aarav Mehta', '+91 98205 99881', 'srv_pedia', 'Pediatric Vaccination & Assessment', 'doc_03', 'Dr. Meera Deshmukh', 'DOCTOR', ?, '14:00', '14:30', 'CONFIRMED', 'PENDING', 600.00, 'Annual booster dose check', ?, ?)
    `).run(healthBizId, todayStr, now, now, healthBizId, todayStr, now, now, healthBizId, todayStr, now, now);

    // Clinical Consultation & Electronic Health Record (EHR)
    db.prepare(`
      INSERT OR IGNORE INTO healthcare_consultations (
        id, business_id, appointment_id, patient_id, doctor_id, visit_date,
        symptoms, diagnosis, vital_signs, prescriptions, lab_tests, doctor_notes, follow_up_date, fee, payment_status, created_at
      ) VALUES (
        'con_01', ?, 'apt_01', 'pt_01', 'doc_01', ?,
        'Chest heaviness post brisk walking, mild fatigue',
        'Class 1 Exertional Angina, Sinus Rhythm Preserved',
        '{"bp":"128/82","hr":"72 bpm","spo2":"99%","temp":"98.4 F","weight":"76 kg"}',
        '[{"medicine":"Tab Metoprolol Succinate","dosage":"25mg","frequency":"1-0-0 (Morning)","duration":"30 Days","instructions":"After breakfast"},{"medicine":"Tab Rosuvastatin","dosage":"10mg","frequency":"0-0-1 (Night)","duration":"30 Days","instructions":"Before sleep"}]',
        '["Lipid Profile Comprehensive","2D Echocardiogram With Doppler"]',
        'Patient advised low sodium Mediterranean diet, 30 min daily walking, avoid heavy lifting.',
        '2026-10-22', 850.00, 'PAID', ?
      )
    `).run(healthBizId, todayStr, now);
  } catch (err) {
    console.error('Healthcare seed error:', err);
  }

  // 3. GYM & FITNESS TENANT: Apex Pro Fitness & Gym
  try {
    const gymBizId = 'biz_apex_gym_01';
    db.prepare(`
      INSERT OR IGNORE INTO businesses (
        id, name, slug, industry, business_type, status, logo, email, phone, website,
        address, country, state, city, timezone, currency, tax_configuration, enabled_modules, settings, created_at, updated_at
      ) VALUES (
        ?, 'Apex Pro Fitness & Gym', 'apex-pro-fitness', 'GYM', 'FITNESS_CENTER', 'ACTIVE', NULL,
        'info@apexfitness.in', '+91 99887 66554', 'https://apexfitness.in',
        '3rd Floor, Infinity Tower, Link Road, Andheri West, Mumbai', 'India', 'Maharashtra', 'Mumbai', 'Asia/Kolkata', 'INR',
        '{"tax_rate": 18.0}',
        '["MEMBERS","PLANS","MEMBERSHIPS","ATTENDANCE","CLASSES","BILLING","REPORTS"]',
        '{"equipment":["Hammer Strength","Life Fitness Cardio","Olympic Lifting Platforms"]}',
        ?, ?
      )
    `).run(gymBizId, now, now);

    db.prepare(`
      INSERT OR IGNORE INTO branches (id, business_id, name, code, address, phone, status, created_at, updated_at)
      VALUES ('brn_gym_01', ?, 'Apex Arena West', 'APX-AND-01', '3rd Floor, Infinity Tower, Link Road, Mumbai', '+91 99887 66554', 'ACTIVE', ?, ?)
    `).run(gymBizId, now, now);

    // Membership Plans
    db.prepare(`
      INSERT OR IGNORE INTO gym_plans (id, business_id, name, description, duration_months, price, benefits, usage_limit, freeze_limit_days, status, created_at)
      VALUES 
        ('gpl_01', ?, 'Gold Annual Elite', 'Unlimited gym floor, wet area, sauna, 2 PT sessions/month, 30-day freeze entitlement', 12, 22000.00, 'All access + Steam & Sauna + Locker', 0, 30, 'ACTIVE', ?),
        ('gpl_02', ?, 'Silver Quarterly Strength', 'Full strength floor & cardio equipment, 7-day freeze', 3, 6800.00, 'Gym floor + Cardio + Group HIIT', 0, 7, 'ACTIVE', ?),
        ('gpl_03', ?, 'Monthly Flexi Pass', 'Standard month-to-month access, no lock-in contract', 1, 2600.00, 'Gym floor & Cardio Zone', 0, 0, 'ACTIVE', ?)
    `).run(gymBizId, now, gymBizId, now, gymBizId, now);

    // Members
    db.prepare(`
      INSERT OR IGNORE INTO gym_members (id, business_id, member_number, name, phone, email, emergency_contact, status, join_date, trainer_name, fitness_goal, created_at)
      VALUES 
        ('gmb_01', ?, 'APX-201', 'Rohan Kapoor', '+91 98200 44332', 'rohan.k@gmail.com', 'Kavita Kapoor (+91 98200 44331)', 'ACTIVE', '2026-01-10', 'Alexandre Silva', 'Hypertrophy & Functional Strength', ?),
        ('gmb_02', ?, 'APX-202', 'Tanya Saxena', '+91 98202 77889', 'tanya.s@gmail.com', 'Anil Saxena (+91 98202 77880)', 'ACTIVE', '2026-03-01', 'Sarah Jenkins', 'Endurance & Core Conditioning', ?),
        ('gmb_03', ?, 'APX-203', 'Karan Singhania', '+91 98210 11990', 'karan.s@gmail.com', 'Neha (+91 98210 11991)', 'ACTIVE', '2026-02-15', 'Alexandre Silva', 'Fat Loss & Agility', ?)
    `).run(gymBizId, now, gymBizId, now, gymBizId, now);

    // Active Memberships
    db.prepare(`
      INSERT OR IGNORE INTO gym_memberships (id, business_id, member_id, plan_id, plan_name, start_date, end_date, status, freeze_status, price_paid, created_at, updated_at)
      VALUES 
        ('gms_01', ?, 'gmb_01', 'gpl_01', 'Gold Annual Elite', '2026-01-10', '2027-01-09', 'ACTIVE', 'NORMAL', 22000.00, ?, ?),
        ('gms_02', ?, 'gmb_02', 'gpl_02', 'Silver Quarterly Strength', '2026-03-01', '2026-05-31', 'ACTIVE', 'NORMAL', 6800.00, ?, ?),
        ('gms_03', ?, 'gmb_03', 'gpl_03', 'Monthly Flexi Pass', '2026-03-01', '2026-03-31', 'ACTIVE', 'NORMAL', 2600.00, ?, ?)
    `).run(gymBizId, now, now, gymBizId, now, now, gymBizId, now, now);

    // Today's Attendance
    db.prepare(`
      INSERT OR IGNORE INTO gym_attendance (id, business_id, member_id, member_name, check_in_time, workout_type, notes)
      VALUES 
        ('att_01', ?, 'gmb_01', 'Rohan Kapoor', '07:15 AM', 'Heavy Upper Push', 'Bench press 110kg 5x5 completed'),
        ('att_02', ?, 'gmb_02', 'Tanya Saxena', '08:30 AM', 'HIIT & Sprint Intervals', 'VO2 max conditioning session')
    `).run(gymBizId, gymBizId);
  } catch (err) {
    console.error('Gym seed error:', err);
  }

  // 4. RESTAURANT & DINING TENANT: Bistro Royale Dining & Cafe
  try {
    const restBizId = 'biz_bistro_royale_01';
    db.prepare(`
      INSERT OR IGNORE INTO businesses (
        id, name, slug, industry, business_type, status, logo, email, phone, website,
        address, country, state, city, timezone, currency, tax_configuration, enabled_modules, settings, created_at, updated_at
      ) VALUES (
        ?, 'Bistro Royale Dining & Cafe', 'bistro-royale', 'RESTAURANT', 'FINE_DINING_CAFE', 'ACTIVE', NULL,
        'bonjour@bistroroyale.in', '+91 22 2288 4400', 'https://bistroroyale.in',
        'Bakehouse Lane, Kala Ghoda, Fort, Mumbai 400001', 'India', 'Maharashtra', 'Mumbai', 'Asia/Kolkata', 'INR',
        '{"restaurant_gst": 5.0}',
        '["TABLES","MENU","ORDERS","KOT","KITCHEN","BILLING","PAYMENTS"]',
        '{"floors":["Main Dining","Patio Veranda","VIP Lounge"]}',
        ?, ?
      )
    `).run(restBizId, now, now);

    // Tables
    db.prepare(`
      INSERT OR IGNORE INTO restaurant_tables (id, business_id, table_number, capacity, floor_section, status, created_at)
      VALUES 
        ('tbl_01', ?, 'Table 01', 2, 'Main Dining', 'OCCUPIED', ?),
        ('tbl_02', ?, 'Table 02', 4, 'Main Dining', 'OCCUPIED', ?),
        ('tbl_03', ?, 'Table 03', 4, 'Main Dining', 'VACANT', ?),
        ('tbl_04', ?, 'Table 04', 6, 'Patio Veranda', 'BILLING', ?),
        ('tbl_05', ?, 'Table 05', 8, 'VIP Wine Lounge', 'RESERVED', ?),
        ('tbl_06', ?, 'Table 06', 2, 'Patio Veranda', 'VACANT', ?)
    `).run(restBizId, now, restBizId, now, restBizId, now, restBizId, now, restBizId, now, restBizId, now);

    // Active Orders & KOT Tickets
    db.prepare(`
      INSERT OR IGNORE INTO restaurant_orders (
        id, business_id, table_id, table_number, order_number, order_type, items_json,
        status, subtotal, tax, total, payment_status, waiter_name, notes, created_at, updated_at
      ) VALUES 
        (
          'ord_01', ?, 'tbl_01', 'Table 01', 'KOT-2026-101', 'DINE_IN',
          '[{"name":"Woodfired Truffle Burrata Pizza","qty":1,"price":780.00},{"name":"Wild Mushroom Truffle Risotto","qty":1,"price":680.00},{"name":"Sparkling San Pellegrino 750ml","qty":1,"price":280.00}]',
          'KITCHEN', 1740.00, 87.00, 1827.00, 'PENDING', 'Marco V.', 'Guest requested extra cracked black pepper', ?, ?
        ),
        (
          'ord_02', ?, 'tbl_04', 'Table 04', 'KOT-2026-102', 'DINE_IN',
          '[{"name":"Pan-Seared Sea Bass","qty":2,"price":950.00},{"name":"Artisan Classic Tiramisu","qty":2,"price":380.00},{"name":"Double Shot Espresso","qty":2,"price":180.00}]',
          'BILLED', 3020.00, 151.00, 3171.00, 'PENDING', 'Sophie L.', 'Bill printed and presented to guest', ?, ?
        )
    `).run(restBizId, now, now, restBizId, now, now);
  } catch (err) {
    console.error('Restaurant seed error:', err);
  }

  // 5. REPAIR & SERVICE TENANT: TechFix Pro Service Lab
  try {
    const repairBizId = 'biz_techfix_01';
    db.prepare(`
      INSERT OR IGNORE INTO businesses (
        id, name, slug, industry, business_type, status, logo, email, phone, website,
        address, country, state, city, timezone, currency, tax_configuration, enabled_modules, settings, created_at, updated_at
      ) VALUES (
        ?, 'TechFix Pro Service Lab', 'techfix-pro-lab', 'REPAIR', 'ELECTRONICS_REPAIR', 'ACTIVE', NULL,
        'support@techfixpro.in', '+91 98200 99112', 'https://techfixpro.in',
        'Shop 4B, Lamington Road, Grant Road East, Mumbai 400007', 'India', 'Maharashtra', 'Mumbai', 'Asia/Kolkata', 'INR',
        '{"tax_rate": 18.0}',
        '["JOB_CARDS","TECHNICIANS","DIAGNOSIS","PARTS","ESTIMATES","BILLING"]',
        '{"devices":["Smartphones","Laptops","MacBooks","Audio Hardware","Gaming Consoles"]}',
        ?, ?
      )
    `).run(repairBizId, now, now);

    db.prepare(`
      INSERT OR IGNORE INTO repair_jobs (
        id, business_id, job_number, customer_name, customer_phone, device_type, brand, model, serial_number,
        reported_fault, diagnosis, technician_name, status, estimated_cost, parts_cost, labor_cost, total_cost, payment_status, delivery_date, created_at, updated_at
      ) VALUES 
        (
          'job_01', ?, 'JOB-2026-881', 'Vivek Malhotra', '+91 98200 12345', 'Laptop', 'Apple', 'MacBook Pro 16" M2', 'C02G9988MD6T',
          'Screen flickering and vertical colored lines after minor drop',
          'Damaged LVDS display flex assembly, panel replacement required',
          'Sameer Khan (Senior Apple Tech)', 'IN_REPAIR', 22500.00, 18500.00, 2500.00, 21000.00, 'PARTIAL_PAID', '2026-09-24', ?, ?
        ),
        (
          'job_02', ?, 'JOB-2026-882', 'Natasha Dsouza', '+91 98201 67890', 'Smartphone', 'Apple', 'iPhone 14 Pro Max', 'DNPGG77890PL',
          'Rapid battery drain and thermal throttling under normal use',
          'Battery health at 71%, cycle count 940, genuine OEM battery replacement',
          'Kiran Rao (Micro-soldering Lead)', 'READY', 6800.00, 5200.00, 1200.00, 6400.00, 'PAID', '2026-09-22', ?, ?
        ),
        (
          'job_03', ?, 'JOB-2026-883', 'Aditya Joshi', '+91 98111 22334', 'Laptop', 'Dell', 'XPS 15 9520', '99887711-DELL',
          'Liquid spillage on keyboard, no boot/chime',
          'Corrosion on primary power rail capacitor C304, ultrasonic cleaning needed',
          'Sameer Khan (Senior Apple Tech)', 'DIAGNOSING', 8500.00, 3500.00, 3000.00, 6500.00, 'PENDING', '2026-09-26', ?, ?
        )
    `).run(repairBizId, now, now, repairBizId, now, now, repairBizId, now, now);
  } catch (err) {
    console.error('Repair seed error:', err);
  }

  // 6. RENTAL TENANT: GearRent Pro Equipment
  try {
    const rentBizId = 'biz_gear_rental_01';
    db.prepare(`
      INSERT OR IGNORE INTO businesses (
        id, name, slug, industry, business_type, status, logo, email, phone, website,
        address, country, state, city, timezone, currency, tax_configuration, enabled_modules, settings, created_at, updated_at
      ) VALUES (
        ?, 'GearRent Pro Equipment', 'gearrent-pro', 'RENTAL', 'EQUIPMENT_RENTAL', 'ACTIVE', NULL,
        'rentals@gearrent.in', '+91 98199 00881', 'https://gearrent.in',
        'Unit 8, Film City Hub, Goregaon East, Mumbai 400065', 'India', 'Maharashtra', 'Mumbai', 'Asia/Kolkata', 'INR',
        '{"security_deposit_refundable": true}',
        '["RENTAL_ASSETS","BOOKINGS","DEPOSITS","INSPECTION","LATE_FEES"]',
        '{"categories":["Cinema Cameras","Anamorphic Lenses","Gimbals","PA Sound Systems"]}',
        ?, ?
      )
    `).run(rentBizId, now, now);

    // Assets
    db.prepare(`
      INSERT OR IGNORE INTO rental_assets (id, business_id, name, category, serial_number, daily_rate, deposit_amount, status, condition_notes, created_at)
      VALUES 
        ('ast_01', ?, 'Sony Alpha A7 IV 4K Cinema Kit', 'Cameras', 'SN-SONY-77881', 2800.00, 25000.00, 'RENTED', 'Flawless sensor, includes 2x 160GB CFexpress cards', ?),
        ('ast_02', ?, 'DJI Ronin RS3 Pro Gimbal Stabilizer', 'Stabilizers', 'SN-DJI-33441', 1600.00, 12000.00, 'AVAILABLE', 'Motors balanced, RavenEye wireless video included', ?),
        ('ast_03', ?, 'Aputure LS 600d Pro Daylight Light', 'Lighting', 'SN-APU-99001', 2200.00, 18000.00, 'AVAILABLE', 'Hyper Reflector + Weatherproof rolling case', ?),
        ('ast_04', ?, 'JBL EON One Linear Array PA System', 'Audio', 'SN-JBL-44119', 3200.00, 20000.00, 'RENTED', 'Dual wireless mics + Bluetooth connectivity', ?)
    `).run(rentBizId, now, rentBizId, now, rentBizId, now, rentBizId, now);

    // Active Bookings
    const today = new Date().toISOString().split('T')[0];
    const returnDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    db.prepare(`
      INSERT OR IGNORE INTO rental_bookings (
        id, business_id, asset_id, asset_name, customer_name, customer_phone, start_date, end_date,
        daily_rate, deposit_paid, total_rent, late_fee, status, returned_date, notes, created_at, updated_at
      ) VALUES 
        (
          'rbk_01', ?, 'ast_01', 'Sony Alpha A7 IV 4K Cinema Kit', 'Kabir Sen Productions', '+91 98200 77112',
          ?, ?, 2800.00, 25000.00, 8400.00, 0.00, 'ACTIVE', NULL, '3-Day Ad Shoot in Film City Goregaon', ?, ?
        ),
        (
          'rbk_02', ?, 'ast_04', 'JBL EON One Linear Array PA System', 'EventVibe Creators', '+91 98333 88110',
          ?, ?, 3200.00, 20000.00, 6400.00, 0.00, 'ACTIVE', NULL, 'Corporate Tech Conference Audio Setup', ?, ?
        )
    `).run(rentBizId, today, returnDate, now, now, rentBizId, today, returnDate, now, now);
  } catch (err) {
    console.error('Rental seed error:', err);
  }

  // 7. Universal Services (Reusable across all industries)
  try {
    db.prepare(`
      INSERT OR IGNORE INTO services (id, business_id, name, description, category, duration_minutes, price, tax_rate, status, created_at, updated_at)
      VALUES 
        ('srv_gen_01', 'shp_urbanmart_01', 'Express Home Grocery Delivery', 'Doorstep delivery within 45 minutes for priority orders', 'Logistics', 45, 120.00, 18.0, 'ACTIVE', ?, ?),
        ('srv_gen_02', 'shp_urbanmart_01', 'Gourmet Cheese Board Custom Assembly', 'Artisanal cheese styling for events and private parties', 'Artisan Services', 30, 850.00, 18.0, 'ACTIVE', ?, ?),
        ('srv_cardio', 'biz_metro_health_01', 'Cardiology Special Consultation', 'Detailed review of ECG, echo, and cardiovascular history', 'Clinical Consult', 30, 850.00, 0.0, 'ACTIVE', ?, ?),
        ('srv_genmed', 'biz_metro_health_01', 'General Physician Consultation', 'Comprehensive primary health, prescription, and triage', 'Clinical Consult', 20, 500.00, 0.0, 'ACTIVE', ?, ?),
        ('srv_pedia', 'biz_metro_health_01', 'Pediatric Vaccination & Assessment', 'Well-baby assessment, growth tracking, and vaccination', 'Clinical Consult', 25, 600.00, 0.0, 'ACTIVE', ?, ?)
    `).run(now, now, now, now, now, now, now, now, now, now);
  } catch (err) {
    console.error('Services seed error:', err);
  }

  // 8. Reusable Operational Expenses
  try {
    db.prepare(`
      INSERT OR IGNORE INTO expenses (id, business_id, category, title, amount, payment_method, vendor, date, description, created_by, created_at)
      VALUES 
        ('exp_01', 'shp_urbanmart_01', 'Rent & Lease', 'Commercial Retail Store Lease Bandra', 48000.00, 'BANK_TRANSFER', 'Linking Road Realties', ?, 'Monthly store retail premises lease', 'usr_shopadmin_01', ?),
        ('exp_02', 'shp_urbanmart_01', 'Utilities', 'Commercial High-Tension Electricity Bill', 12450.00, 'UPI', 'Adani Electricity Mumbai', ?, 'Monthly chiller, freezer, and lighting power', 'usr_shopadmin_01', ?),
        ('exp_03', 'shp_urbanmart_01', 'Supplies', 'Biodegradable Paper Carry Bags & Receipts', 3200.00, 'CASH', 'EcoPack Mumbai', ?, '500x Paper bags & 20x thermal paper rolls', 'usr_shopadmin_01', ?),
        ('exp_04', 'biz_metro_health_01', 'Medical Supplies', 'Sterile Syringes, Gloves & Antiseptic Packs', 18500.00, 'BANK_TRANSFER', 'Apollo Surgical Supply', ?, 'Monthly clinical consumables inward', 'usr_shopadmin_01', ?),
        ('exp_05', 'biz_apex_gym_01', 'Maintenance', 'Cable Machine Pulley & Belt Servicing', 4500.00, 'UPI', 'GymTech Solutions', ?, 'Quarterly preventive maintenance on weight stacks', 'usr_shopadmin_01', ?)
    `).run(now.split('T')[0], now, now.split('T')[0], now, now.split('T')[0], now, now.split('T')[0], now, now.split('T')[0], now);
  } catch (err) {
    console.error('Expenses seed error:', err);
  }
}

function seedDefaultData() {
  const checkUser = db.prepare('SELECT id FROM users WHERE email = ?').get('superadmin@pos-erp.com');
  if (checkUser) {
    return; // Already seeded
  }

  const now = new Date().toISOString();
  const superAdminPasswordHash = bcrypt.hashSync('SuperAdmin123!', 10);
  const shopAdminPasswordHash = bcrypt.hashSync('ShopAdmin123!', 10);
  const pin1234Hash = bcrypt.hashSync('1234', 10);
  const pin5678Hash = bcrypt.hashSync('5678', 10);

  // 1. Create Super Admin
  const superAdminId = 'usr_superadmin_01';
  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, shop_id, created_at, updated_at)
    VALUES (?, ?, ?, 'SUPER_ADMIN', NULL, ?, ?)
  `).run(superAdminId, 'superadmin@pos-erp.com', superAdminPasswordHash, now, now);

  // 2. Create Shop 1: Urban Mart Retail
  const shopId = 'shp_urbanmart_01';
  db.prepare(`
    INSERT INTO shops (id, name, gst_number, vat_number, phone, address, short_note, shop_type, tax_state, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `).run(
    shopId,
    'Urban Mart Retail',
    '27AAACU1234F1Z5',
    'VAT-MH-998822',
    '+91 98765 43210',
    'Plot 42, Bandra West, Linking Road, Mumbai, Maharashtra 400050',
    'Specialist in organic foods, essentials, and fine grocery',
    'retail',
    'INTRA_STATE',
    now,
    now
  );

  // 3. Create Shop Admin
  const shopAdminId = 'usr_shopadmin_01';
  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, shop_id, created_at, updated_at)
    VALUES (?, ?, ?, 'SHOP_ADMIN', ?, ?, ?)
  `).run(shopAdminId, 'shopadmin@urbanmart.com', shopAdminPasswordHash, shopId, now, now);

  // 4. Create Employees
  const shiftLeadId = 'emp_sarah_01';
  db.prepare(`
    INSERT INTO employees (id, shop_id, employee_id, name, tier, status, authentication_reference, created_at, updated_at)
    VALUES (?, ?, 'EMP-01', 'Sarah Jenkins', 'SHIFT_LEAD', 'ACTIVE', ?, ?, ?)
  `).run(shiftLeadId, shopId, pin1234Hash, now, now);

  const cashierId = 'emp_alex_02';
  db.prepare(`
    INSERT INTO employees (id, shop_id, employee_id, name, tier, status, authentication_reference, created_at, updated_at)
    VALUES (?, ?, 'EMP-02', 'Alex Patel', 'CASHIER', 'ACTIVE', ?, ?, ?)
  `).run(cashierId, shopId, pin5678Hash, now, now);

  // 5. Create Inventory Products
  const products = [
    { id: 'prd_01', sku: 'GR-001', name: 'Organic Basmati Rice 5kg', category: 'Grocery', price: 650.00, stock: 45, low: 10, tax: 5.0 },
    { id: 'prd_02', sku: 'GR-002', name: 'Cold Pressed Sunflower Oil 1L', category: 'Grocery', price: 210.00, stock: 60, low: 12, tax: 5.0 },
    { id: 'prd_03', sku: 'BV-001', name: 'Arabica Artisan Coffee Beans 250g', category: 'Beverages', price: 420.00, stock: 28, low: 8, tax: 18.0 },
    { id: 'prd_04', sku: 'BV-002', name: 'Sparkling Mineral Water 750ml', category: 'Beverages', price: 95.00, stock: 120, low: 20, tax: 18.0 },
    { id: 'prd_05', sku: 'SN-001', name: 'Roasted Almonds & Sea Salt 200g', category: 'Snacks', price: 340.00, stock: 35, low: 10, tax: 12.0 },
    { id: 'prd_06', sku: 'SN-002', name: 'Dark Chocolate Truffle Box 150g', category: 'Snacks', price: 280.00, stock: 18, low: 6, tax: 18.0 },
    { id: 'prd_07', sku: 'PC-001', name: 'Herbal Aloe Vera Handwash 500ml', category: 'Personal Care', price: 175.00, stock: 4, low: 8, tax: 18.0 }, // Low stock sample
    { id: 'prd_08', sku: 'PC-002', name: 'Bamboo Charcoal Toothpaste 100g', category: 'Personal Care', price: 140.00, stock: 50, low: 10, tax: 18.0 },
    { id: 'prd_09', sku: 'DA-001', name: 'Farm Fresh A2 Cow Milk 1L', category: 'Dairy', price: 85.00, stock: 40, low: 10, tax: 0.0 },
    { id: 'prd_10', sku: 'DA-002', name: 'Artisanal Cheddar Cheese 200g', category: 'Dairy', price: 320.00, stock: 22, low: 5, tax: 12.0 }
  ];

  const barcodeMap: Record<string, string> = {
    'GR-001': '8901030383012',
    'GR-002': '8901030383029',
    'BV-001': '8901030383036',
    'BV-002': '8901030383043',
    'SN-001': '8901030383050',
    'SN-002': '8901030383067',
    'PC-001': '8901030383074',
    'PC-002': '8901030383081',
    'DA-001': '8901030383098',
    'DA-002': '8901030383104'
  };

  for (const p of products) {
    const barcode = barcodeMap[p.sku] || ('8901001000' + p.sku.replace(/\D/g, '').padStart(2, '0'));
    db.prepare(`
      INSERT INTO products (id, shop_id, sku, barcode, name, category, price, stock, low_stock_threshold, tax_rate, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(p.id, shopId, p.sku, barcode, p.name, p.category, p.price, p.stock, p.low, p.tax, now, now);
  }

  // 6. Create Initial Session and Completed Sales
  const sessionId = 'ses_init_01';
  db.prepare(`
    INSERT INTO sessions (id, employee_id, shop_id, login_at, logout_at, status)
    VALUES (?, ?, ?, ?, NULL, 'ACTIVE')
  `).run(sessionId, shiftLeadId, shopId, now);

  // Sample sale 1
  const sale1Id = 'sal_sample_01';
  const sale1Time = new Date(Date.now() - 3600000 * 3).toISOString();
  db.prepare(`
    INSERT INTO sales (
      id, shop_id, employee_id, session_id, invoice_number, idempotency_key,
      subtotal, discount, taxable_amount, tax_amount, cgst_amount, sgst_amount, igst_amount,
      total_amount, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)
  `).run(
    sale1Id, shopId, shiftLeadId, sessionId, 'INV-2026-0001', 'idemp_sample_01',
    1070.00, 50.00, 1020.00, 100.80, 50.40, 50.40, 0.00,
    1120.80, sale1Time
  );

  db.prepare(`
    INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, discount, tax, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('si_01', sale1Id, 'prd_01', 'Organic Basmati Rice 5kg', 1, 650.00, 0, 32.50, 682.50);

  db.prepare(`
    INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, discount, tax, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('si_02', sale1Id, 'prd_03', 'Arabica Artisan Coffee Beans 250g', 1, 420.00, 50.00, 68.30, 438.30);

  // Sample sale 2
  const sale2Id = 'sal_sample_02';
  const sale2Time = new Date(Date.now() - 3600000 * 1).toISOString();
  db.prepare(`
    INSERT INTO sales (
      id, shop_id, employee_id, session_id, invoice_number, idempotency_key,
      subtotal, discount, taxable_amount, tax_amount, cgst_amount, sgst_amount, igst_amount,
      total_amount, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)
  `).run(
    sale2Id, shopId, cashierId, sessionId, 'INV-2026-0002', 'idemp_sample_02',
    550.00, 0.00, 550.00, 44.50, 22.25, 22.25, 0.00,
    594.50, sale2Time
  );

  db.prepare(`
    INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, discount, tax, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('si_03', sale2Id, 'prd_02', 'Cold Pressed Sunflower Oil 1L', 1, 210.00, 0, 10.50, 220.50);

  db.prepare(`
    INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, discount, tax, line_total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('si_04', sale2Id, 'prd_05', 'Roasted Almonds & Sea Salt 200g', 1, 340.00, 0, 34.00, 374.00);

  // 7. Initial Monthly Invoice for previous period
  const prevPeriod = '2026-08';
  const grossSalesLastMonth = 158400.00;
  const commissionDueLastMonth = Math.round(grossSalesLastMonth * 0.02 * 100) / 100;
  const invoiceSentAt = new Date(Date.now() - 86400000 * 15).toISOString();
  const gracePeriodEnd = new Date(Date.now() - 86400000 * 8).toISOString();

  db.prepare(`
    INSERT INTO invoices (
      id, shop_id, billing_period, gross_sales, commission_rate, commission_due,
      status, sent_at, grace_period_ends_at, paid_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 0.02, ?, 'PAID', ?, ?, ?, ?, ?)
  `).run(
    'inv_prev_01', shopId, prevPeriod, grossSalesLastMonth, commissionDueLastMonth,
    invoiceSentAt, gracePeriodEnd, new Date(Date.now() - 86400000 * 10).toISOString(), invoiceSentAt, invoiceSentAt
  );

  // Current month invoice pending
  const currPeriod = '2026-09';
  const currGrossSales = 1715.30;
  const currCommission = Math.round(currGrossSales * 0.02 * 100) / 100;
  const currSentAt = new Date().toISOString();
  const currGraceEnd = new Date(Date.now() + 86400000 * 7).toISOString(); // 7 days grace

  db.prepare(`
    INSERT INTO invoices (
      id, shop_id, billing_period, gross_sales, commission_rate, commission_due,
      status, sent_at, grace_period_ends_at, paid_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 0.02, ?, 'PENDING', ?, ?, NULL, ?, ?)
  `).run(
    'inv_curr_01', shopId, currPeriod, currGrossSales, currCommission,
    currSentAt, currGraceEnd, currSentAt, currSentAt
  );

  // 8. Initial Audit Log
  db.prepare(`
    INSERT INTO audit_log (id, actor_id, actor_role, shop_id, action, target_type, target_id, before, after, timestamp)
    VALUES (?, ?, 'SUPER_ADMIN', ?, 'SHOP_CREATED', 'SHOP', ?, NULL, ?, ?)
  `).run('aud_01', superAdminId, shopId, shopId, JSON.stringify({ name: 'Urban Mart Retail', gst: '27AAACU1234F1Z5' }), now);
}
