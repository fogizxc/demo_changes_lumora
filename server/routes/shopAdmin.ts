import crypto from 'node:crypto';
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireShopAdmin } from '../services/auth.js';
import { logAuditEvent } from '../services/audit.js';
import { checkAndEnforceShopStatus } from '../services/commission.js';
import { roundCurrency } from '../services/tax.js';
import { mongo } from '../databases/mongo.js';
import { redis } from '../databases/redis.js';
import { cassandra } from '../databases/cassandra.js';

export const shopAdminRouter = Router();

// Require Shop Admin privileges (or Super Admin in support View-As mode)
shopAdminRouter.use(requireShopAdmin);

// 1. Overview Analytics (All real database data)
shopAdminRouter.get('/overview', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const statusInfo = checkAndEnforceShopStatus(shopId);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthStart = `${currentPeriod}-01T00:00:00.000Z`;

  // Today's sales
  const todayAgg = db.prepare(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as total,
      COUNT(id) as count
    FROM sales
    WHERE shop_id = ? AND status = 'COMPLETED' AND created_at >= ?
  `).get(shopId, todayStart) as any;

  // This month's sales
  const monthAgg = db.prepare(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as total,
      COUNT(id) as count
    FROM sales
    WHERE shop_id = ? AND status = 'COMPLETED' AND created_at >= ?
  `).get(shopId, monthStart) as any;

  // Top-selling items (by quantity and revenue)
  const topSellingItems = db.prepare(`
    SELECT 
      si.product_id as productId,
      si.product_name as name,
      SUM(si.quantity) as quantity,
      SUM(si.line_total) as revenue
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.shop_id = ? AND s.status = 'COMPLETED'
    GROUP BY si.product_id, si.product_name
    ORDER BY quantity DESC
    LIMIT 5
  `).all(shopId).map((row: any) => ({
    productId: row.productId,
    name: row.name,
    quantity: row.quantity,
    revenue: roundCurrency(row.revenue),
  }));

  // Sales trend (last 7 days)
  const salesTrend: { date: string; amount: number; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayDateStr = d.toISOString().split('T')[0];
    const dayStart = `${dayDateStr}T00:00:00.000Z`;
    const dayEnd = `${dayDateStr}T23:59:59.999Z`;

    const dayAgg = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total,
        COUNT(id) as count
      FROM sales
      WHERE shop_id = ? AND status = 'COMPLETED' AND created_at >= ? AND created_at <= ?
    `).get(shopId, dayStart, dayEnd) as any;

    salesTrend.push({
      date: dayDateStr,
      amount: roundCurrency(dayAgg?.total || 0),
      count: dayAgg?.count || 0,
    });
  }

  // Sales by employee
  const salesByEmployee = db.prepare(`
    SELECT 
      e.id as employeeId,
      e.name,
      e.tier,
      COUNT(s.id) as salesCount,
      COALESCE(SUM(s.total_amount), 0) as totalAmount
    FROM employees e
    LEFT JOIN sales s ON s.employee_id = e.id AND s.status = 'COMPLETED'
    WHERE e.shop_id = ?
    GROUP BY e.id, e.name, e.tier
    ORDER BY totalAmount DESC
  `).all(shopId).map((row: any) => ({
    employeeId: row.employeeId,
    name: row.name,
    tier: row.tier,
    salesCount: row.salesCount,
    totalAmount: roundCurrency(row.totalAmount),
  }));

  res.json({
    todaySales: roundCurrency(todayAgg?.total || 0),
    todayTransactionsCount: todayAgg?.count || 0,
    monthSales: roundCurrency(monthAgg?.total || 0),
    monthTransactionsCount: monthAgg?.count || 0,
    topSellingItems,
    salesTrend,
    salesByEmployee,
    shopStatus: statusInfo.shopStatus,
    overdueInvoice: statusInfo.overdueInvoice,
    gracePeriodDaysLeft: statusInfo.gracePeriodDaysLeft,
    amountDue: statusInfo.amountDue,
  });
});

// 2. Staff Management
shopAdminRouter.get('/staff', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;

  const employees = db.prepare(`
    SELECT 
      e.id,
      e.shop_id,
      e.employee_id,
      e.name,
      e.tier,
      e.status,
      e.created_at,
      e.updated_at,
      COUNT(s.id) as total_sales_count,
      COALESCE(SUM(s.total_amount), 0) as total_sales_amount
    FROM employees e
    LEFT JOIN sales s ON s.employee_id = e.id AND s.status = 'COMPLETED'
    WHERE e.shop_id = ?
    GROUP BY e.id
    ORDER BY e.created_at ASC
  `).all(shopId).map((row: any) => ({
    ...row,
    total_sales_amount: roundCurrency(row.total_sales_amount),
  }));

  res.json({ staff: employees });
});

// Create Employee
shopAdminRouter.post('/staff', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { employeeId, name, tier, pin } = req.body;

  if (!employeeId || !name || !tier || !pin) {
    return res.status(400).json({ error: 'Employee ID, Name, Tier (CASHIER or SHIFT_LEAD), and PIN are required' });
  }

  if (!['CASHIER', 'SHIFT_LEAD'].includes(tier)) {
    return res.status(400).json({ error: 'Tier must be CASHIER or SHIFT_LEAD' });
  }

  const cleanEmployeeId = employeeId.trim().toUpperCase();

  // Check unique employee_id in shop
  const existing = db.prepare('SELECT id FROM employees WHERE shop_id = ? AND employee_id = ?').get(shopId, cleanEmployeeId);
  if (existing) {
    return res.status(409).json({ error: `Employee ID ${cleanEmployeeId} is already in use in this shop` });
  }

  const now = new Date().toISOString();
  const id = 'emp_' + crypto.randomUUID().substring(0, 8);
  const pinHash = bcrypt.hashSync(pin.trim(), 10);

  db.prepare(`
    INSERT INTO employees (id, shop_id, employee_id, name, tier, status, authentication_reference, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
  `).run(id, shopId, cleanEmployeeId, name.trim(), tier, pinHash, now, now);

  logAuditEvent({
    actorId: req.auth!.userId || req.auth!.superAdminId || 'SHOP_ADMIN',
    actorRole: req.auth!.role,
    shopId,
    action: 'EMPLOYEE_CREATED',
    targetType: 'EMPLOYEE',
    targetId: id,
    after: { employee_id: cleanEmployeeId, name, tier, status: 'ACTIVE' },
  });

  const created = db.prepare('SELECT id, shop_id, employee_id, name, tier, status, created_at FROM employees WHERE id = ?').get(id);
  res.status(201).json({ employee: created });
});

// Edit Employee (Name or PIN)
shopAdminRouter.put('/staff/:id', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { id } = req.params;
  const { name, pin } = req.body;

  const employee = db.prepare('SELECT * FROM employees WHERE id = ? AND shop_id = ?').get(id, shopId) as any;
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found in your shop' });
  }

  const now = new Date().toISOString();
  const newName = name ? name.trim() : employee.name;
  let newPinHash = employee.authentication_reference;

  if (pin && pin.trim().length > 0) {
    newPinHash = bcrypt.hashSync(pin.trim(), 10);
  }

  db.prepare(`
    UPDATE employees
    SET name = ?, authentication_reference = ?, updated_at = ?
    WHERE id = ? AND shop_id = ?
  `).run(newName, newPinHash, now, id, shopId);

  logAuditEvent({
    actorId: req.auth!.userId || req.auth!.superAdminId || 'SHOP_ADMIN',
    actorRole: req.auth!.role,
    shopId,
    action: 'EMPLOYEE_UPDATED',
    targetType: 'EMPLOYEE',
    targetId: id,
    before: { name: employee.name },
    after: { name: newName, pinUpdated: Boolean(pin) },
  });

  const updated = db.prepare('SELECT id, shop_id, employee_id, name, tier, status, created_at, updated_at FROM employees WHERE id = ?').get(id);
  res.json({ employee: updated });
});

// Change Employee Tier (CASHIER <-> SHIFT_LEAD)
shopAdminRouter.patch('/staff/:id/tier', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { id } = req.params;
  const { tier } = req.body;

  if (!['CASHIER', 'SHIFT_LEAD'].includes(tier)) {
    return res.status(400).json({ error: 'Tier must be CASHIER or SHIFT_LEAD' });
  }

  const employee = db.prepare('SELECT * FROM employees WHERE id = ? AND shop_id = ?').get(id, shopId) as any;
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found in your shop' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE employees SET tier = ?, updated_at = ? WHERE id = ? AND shop_id = ?').run(tier, now, id, shopId);

  logAuditEvent({
    actorId: req.auth!.userId || req.auth!.superAdminId || 'SHOP_ADMIN',
    actorRole: req.auth!.role,
    shopId,
    action: 'EMPLOYEE_TIER_CHANGED',
    targetType: 'EMPLOYEE',
    targetId: id,
    before: { tier: employee.tier },
    after: { tier },
  });

  res.json({ success: true, employeeId: id, tier });
});

// Deactivate / Activate Employee
shopAdminRouter.patch('/staff/:id/status', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { id } = req.params;
  const { status } = req.body;

  if (!['ACTIVE', 'DEACTIVATED'].includes(status)) {
    return res.status(400).json({ error: 'Status must be ACTIVE or DEACTIVATED' });
  }

  const employee = db.prepare('SELECT * FROM employees WHERE id = ? AND shop_id = ?').get(id, shopId) as any;
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found in your shop' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE employees SET status = ?, updated_at = ? WHERE id = ? AND shop_id = ?').run(status, now, id, shopId);

  if (status === 'DEACTIVATED') {
    // Close any active POS sessions
    db.prepare("UPDATE sessions SET status = 'CLOSED', logout_at = ? WHERE employee_id = ? AND status = 'ACTIVE'").run(now, id);
  }

  logAuditEvent({
    actorId: req.auth!.userId || req.auth!.superAdminId || 'SHOP_ADMIN',
    actorRole: req.auth!.role,
    shopId,
    action: 'EMPLOYEE_DEACTIVATED',
    targetType: 'EMPLOYEE',
    targetId: id,
    before: { status: employee.status },
    after: { status },
  });

  res.json({ success: true, employeeId: id, status });
});

// 3. Inventory Management
shopAdminRouter.get('/inventory', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { search, category, lowStockOnly } = req.query;

  let query = 'SELECT * FROM products WHERE shop_id = ?';
  const params: any[] = [shopId];

  if (search) {
    query += ' AND (name LIKE ? OR sku LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (lowStockOnly === 'true') {
    query += ' AND stock <= low_stock_threshold';
  }

  query += ' ORDER BY name ASC';

  const products = db.prepare(query).all(...params);

  // Get distinct categories
  const categories = db.prepare('SELECT DISTINCT category FROM products WHERE shop_id = ? ORDER BY category ASC').all(shopId).map((c: any) => c.category);

  res.json({ products, categories });
});

// Add Product
shopAdminRouter.post('/inventory', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { sku, name, category, price, costPrice, cost_price, stock, lowStockThreshold, taxRate } = req.body;

  if (!sku || !name || !category || price === undefined || stock === undefined) {
    return res.status(400).json({ error: 'SKU, Name, Category, Price, and Stock are required' });
  }

  const cleanSku = sku.trim().toUpperCase();

  // Check unique SKU in shop
  const existing = db.prepare('SELECT id FROM products WHERE shop_id = ? AND sku = ?').get(shopId, cleanSku);
  if (existing) {
    return res.status(409).json({ error: `SKU ${cleanSku} is already in use in this shop` });
  }

  const now = new Date().toISOString();
  const id = 'prd_' + crypto.randomUUID().substring(0, 8);
  const numPrice = Math.max(0, parseFloat(price));
  const rawCost = costPrice !== undefined ? costPrice : cost_price;
  const numCost = rawCost !== undefined ? Math.max(0, parseFloat(rawCost)) : Math.round(numPrice * 0.72 * 100) / 100;
  const numStock = Math.max(0, parseInt(stock));
  const numLow = Math.max(0, parseInt(lowStockThreshold ?? 5));
  const numTax = Math.max(0, parseFloat(taxRate ?? 18.0));

  db.prepare(`
    INSERT INTO products (id, shop_id, sku, name, category, price, cost_price, stock, low_stock_threshold, tax_rate, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, shopId, cleanSku, name.trim(), category.trim(), numPrice, numCost, numStock, numLow, numTax, now, now);

  // 1. Sync to MongoDB Polymorphic Catalog
  mongo.collection('products_catalog').insertOne({
    sku: cleanSku,
    name: name.trim(),
    category: category.trim(),
    price: numPrice,
    cost_price: numCost,
    stock: numStock,
    attributes: {
      tax_rate: numTax,
      low_stock_threshold: numLow,
      created_by: req.auth!.userId || 'SHOP_ADMIN',
    },
  }).catch(() => {});

  // 2. Warm in Redis In-Memory Cache
  redis.set(`cache:barcode:${cleanSku}`, {
    sku: cleanSku,
    name: name.trim(),
    price: numPrice,
    stock: numStock,
    cachedAt: now,
  }, 3600).catch(() => {});

  // 3. Log to Cassandra Audit SSTable
  cassandra.logEvent('lumora_audit', 'audit_events_by_day', `${shopId}#${now.split('T')[0]}`, Date.now(), {
    action: 'PRODUCT_CREATED',
    sku: cleanSku,
    name: name.trim(),
    price: numPrice,
    stock: numStock,
  }).catch(() => {});

  logAuditEvent({
    actorId: req.auth!.userId || req.auth!.superAdminId || 'SHOP_ADMIN',
    actorRole: req.auth!.role,
    shopId,
    action: 'PRODUCT_CREATED',
    targetType: 'PRODUCT',
    targetId: id,
    after: { sku: cleanSku, name, category, price: numPrice, costPrice: numCost, stock: numStock, taxRate: numTax },
  });

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.status(201).json({ product: created });
});

// Edit Product
shopAdminRouter.put('/inventory/:id', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { id } = req.params;
  const { name, category, price, costPrice, cost_price, stock, lowStockThreshold, taxRate } = req.body;

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(id, shopId) as any;
  if (!product) {
    return res.status(404).json({ error: 'Product not found in your inventory' });
  }

  const now = new Date().toISOString();
  const newName = name ? name.trim() : product.name;
  const newCat = category ? category.trim() : product.category;
  const newPrice = price !== undefined ? Math.max(0, parseFloat(price)) : product.price;
  const rawCost = costPrice !== undefined ? costPrice : cost_price;
  const newCost = rawCost !== undefined ? Math.max(0, parseFloat(rawCost)) : (product.cost_price ?? 0);
  const newStock = stock !== undefined ? Math.max(0, parseInt(stock)) : product.stock;
  const newLow = lowStockThreshold !== undefined ? Math.max(0, parseInt(lowStockThreshold)) : product.low_stock_threshold;
  const newTax = taxRate !== undefined ? Math.max(0, parseFloat(taxRate)) : product.tax_rate;

  db.prepare(`
    UPDATE products
    SET name = ?, category = ?, price = ?, cost_price = ?, stock = ?, low_stock_threshold = ?, tax_rate = ?, updated_at = ?
    WHERE id = ? AND shop_id = ?
  `).run(newName, newCat, newPrice, newCost, newStock, newLow, newTax, now, id, shopId);

  // 1. Update in MongoDB Polymorphic Catalog
  mongo.collection('products_catalog').updateOne(
    { sku: product.sku },
    {
      $set: {
        name: newName,
        category: newCat,
        price: newPrice,
        cost_price: newCost,
        stock: newStock,
        updated_at: now,
      },
    }
  ).catch(() => {});

  // 2. Invalidate / Refresh Redis Hot Barcode Cache
  redis.set(`cache:barcode:${product.sku}`, {
    sku: product.sku,
    name: newName,
    price: newPrice,
    stock: newStock,
    cachedAt: now,
  }, 3600).catch(() => {});

  // 3. Log to Cassandra Audit SSTable
  cassandra.logEvent('lumora_audit', 'audit_events_by_day', `${shopId}#${now.split('T')[0]}`, Date.now(), {
    action: 'PRODUCT_UPDATED',
    sku: product.sku,
    oldPrice: product.price,
    newPrice: newPrice,
    newStock: newStock,
  }).catch(() => {});

  logAuditEvent({
    actorId: req.auth!.userId || req.auth!.superAdminId || 'SHOP_ADMIN',
    actorRole: req.auth!.role,
    shopId,
    action: 'PRODUCT_UPDATED',
    targetType: 'PRODUCT',
    targetId: id,
    before: { name: product.name, price: product.price, costPrice: product.cost_price, stock: product.stock },
    after: { name: newName, price: newPrice, costPrice: newCost, stock: newStock },
  });

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json({ product: updated });
});

// Delete Product (where permitted)
shopAdminRouter.delete('/inventory/:id', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { id } = req.params;

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(id, shopId) as any;
  if (!product) {
    return res.status(404).json({ error: 'Product not found in your inventory' });
  }

  // Check if product is part of past sales
  const salesCount = (db.prepare('SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?').get(id) as any)?.count || 0;
  if (salesCount > 0) {
    return res.status(400).json({
      error: `Cannot delete product "${product.name}" because it is referenced in ${salesCount} transaction receipts. You can set stock to 0 instead.`,
    });
  }

  db.prepare('DELETE FROM products WHERE id = ? AND shop_id = ?').run(id, shopId);

  // 1. Remove from MongoDB
  mongo.collection('products_catalog').deleteOne({ sku: product.sku }).catch(() => {});

  // 2. Remove from Redis Cache
  redis.del(`cache:barcode:${product.sku}`).catch(() => {});

  // 3. Log to Cassandra
  const now = new Date().toISOString();
  cassandra.logEvent('lumora_audit', 'audit_events_by_day', `${shopId}#${now.split('T')[0]}`, Date.now(), {
    action: 'PRODUCT_DELETED',
    sku: product.sku,
    name: product.name,
  }).catch(() => {});

  logAuditEvent({
    actorId: req.auth!.userId || req.auth!.superAdminId || 'SHOP_ADMIN',
    actorRole: req.auth!.role,
    shopId,
    action: 'PRODUCT_DELETED',
    targetType: 'PRODUCT',
    targetId: id,
    before: { sku: product.sku, name: product.name },
  });

  res.json({ success: true, message: 'Product deleted successfully' });
});

// 4. Business Profile
shopAdminRouter.get('/profile', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId);
  res.json({ shop });
});

// Update Business Profile (GST changes audit-logged!)
shopAdminRouter.put('/profile', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { name, gstNumber, vatNumber, phone, shortNote, address, shopType, taxState } = req.body;

  if (!name || !gstNumber || !phone || !address) {
    return res.status(400).json({ error: 'Shop Name, GST Number, Phone, and Address are required' });
  }

  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId) as any;
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  const now = new Date().toISOString();
  const cleanGst = gstNumber.trim().toUpperCase();

  db.prepare(`
    UPDATE shops
    SET name = ?, gst_number = ?, vat_number = ?, phone = ?, short_note = ?, address = ?, shop_type = ?, tax_state = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name.trim(),
    cleanGst,
    vatNumber ? vatNumber.trim() : null,
    phone.trim(),
    shortNote ? shortNote.trim() : null,
    address.trim(),
    shopType || 'retail',
    taxState || 'INTRA_STATE',
    now,
    shopId
  );

  // If GST number changed, log GST_UPDATED specifically
  if (cleanGst !== shop.gst_number) {
    logAuditEvent({
      actorId: req.auth!.userId || req.auth!.superAdminId || 'SHOP_ADMIN',
      actorRole: req.auth!.role,
      shopId,
      action: 'GST_UPDATED',
      targetType: 'SHOP',
      targetId: shopId,
      before: { gst_number: shop.gst_number },
      after: { gst_number: cleanGst },
    });
  }

  logAuditEvent({
    actorId: req.auth!.userId || req.auth!.superAdminId || 'SHOP_ADMIN',
    actorRole: req.auth!.role,
    shopId,
    action: 'BUSINESS_PROFILE_UPDATED',
    targetType: 'SHOP',
    targetId: shopId,
    before: { name: shop.name, phone: shop.phone, address: shop.address },
    after: { name, phone, address, vatNumber, taxState },
  });

  const updatedShop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId);
  res.json({ shop: updatedShop });
});

// 5. Billing — Shop Admin (Strict Tenant Isolation!)
shopAdminRouter.get('/billing', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;

  // Refresh status
  const statusInfo = checkAndEnforceShopStatus(shopId);

  const invoices = db.prepare(`
    SELECT * FROM invoices
    WHERE shop_id = ?
    ORDER BY created_at DESC
  `).all(shopId);

  res.json({
    invoices,
    amountDue: statusInfo.amountDue,
    shopStatus: statusInfo.shopStatus,
    isPosSuspended: statusInfo.isPosSuspended,
    gracePeriodDaysLeft: statusInfo.gracePeriodDaysLeft,
    overdueInvoice: statusInfo.overdueInvoice,
  });
});

// 6. Shop Audit Log (Tenant Scoped!)
shopAdminRouter.get('/audit-log', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string) || 25));
  const offset = (page - 1) * limit;

  const totalCount = (db.prepare('SELECT COUNT(id) as count FROM audit_log WHERE shop_id = ?').get(shopId) as any)?.count || 0;

  const logs = db.prepare(`
    SELECT * FROM audit_log
    WHERE shop_id = ?
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `).all(shopId, limit, offset);

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
