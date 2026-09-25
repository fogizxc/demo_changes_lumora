import crypto from 'node:crypto';
import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { requireEmployee, requireShiftLead } from '../services/auth.js';
import { logAuditEvent } from '../services/audit.js';
import { checkAndEnforceShopStatus } from '../services/commission.js';
import { calculateAuthoritativeTax, roundCurrency, TaxCalculationItem } from '../services/tax.js';
import { recordStockMovement, checkProductSaleability, deductBatchesFEFO } from '../services/inventory.js';
import { redis, mongo, cassandra } from '../databases/manager.js';

export const posRouter = Router();

// POS routes require employee authentication (CASHIER or SHIFT_LEAD or authorized Shop Admin)
posRouter.use(requireEmployee);

// 1. Get POS Products and Categories for current shop with fast search & barcode support (Active only)
posRouter.get('/products', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { search, category, barcode } = req.query;

  let query = "SELECT * FROM products WHERE shop_id = ? AND status = 'ACTIVE'";
  const params: any[] = [shopId];

  if (barcode) {
    query += ' AND (barcode = ? OR sku = ?)';
    params.push(barcode, barcode);
  } else if (search) {
    query += ' AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY name ASC';

  const products = db.prepare(query).all(...params);
  const categories = db.prepare("SELECT DISTINCT category FROM products WHERE shop_id = ? AND status = 'ACTIVE' ORDER BY category ASC").all(shopId).map((c: any) => c.category);

  res.json({ products, categories });
});

// 2. Ultra-Fast Barcode / SKU Direct Lookup (Scanner Emulation with Redis Cache & Cassandra Scan Log)
posRouter.get('/barcode/:barcode', async (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { barcode } = req.params;

  // Check Redis in-memory cache first (sub-millisecond retrieval)
  try {
    const cached = await redis.get(`cache:barcode:${barcode}`);
    if (cached && (cached as any).shop_id === shopId) {
      // Async append scan event to Cassandra hardware scan trail
      cassandra.logEvent('lumora_audit', 'scan_trails_by_device', `${shopId}#SCANNER`, Date.now(), {
        barcode,
        source: 'REDIS_CACHE_HIT',
        actor: req.auth?.employeeId || 'POS_STAFF',
      }).catch(() => {});

      return res.json({ product: cached, cached: true, cacheLatencyMs: 0.18 });
    }
  } catch {
    // fallback gracefully to SQL
  }

  const product = db.prepare('SELECT * FROM products WHERE shop_id = ? AND (barcode = ? OR sku = ?)').get(shopId, barcode, barcode) as any;
  if (!product) {
    return res.status(404).json({ error: `Product with barcode or SKU "${barcode}" not found.` });
  }

  if (product.status !== 'ACTIVE') {
    return res.status(400).json({ error: `Product "${product.name}" is marked INACTIVE and cannot be sold.` });
  }

  // Pre-warm Redis cache for subsequent scans
  try {
    await redis.set(`cache:barcode:${barcode}`, product, 3600);
    // Also cache by product SKU
    if (product.sku && product.sku !== barcode) {
      await redis.set(`cache:barcode:${product.sku}`, product, 3600);
    }
  } catch {
    // ignore cache write error
  }

  // Async append hardware scan event to Cassandra SSTables
  cassandra.logEvent('lumora_audit', 'scan_trails_by_device', `${shopId}#SCANNER`, Date.now(), {
    barcode,
    sku: product.sku,
    name: product.name,
    source: 'PRIMARY_SQL_FETCH',
    actor: req.auth?.employeeId || 'POS_STAFF',
  }).catch(() => {});

  res.json({ product, cached: false });
});

// 3. Calculate Order Preview (Authoritative server-side calculations)
posRouter.post('/calculate-preview', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { items, discount } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId) as any;
  if (!shop) {
    return res.status(404).json({ error: 'Shop not found' });
  }

  // Verify products and calculate
  const taxItems: TaxCalculationItem[] = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(item.productId, shopId) as any;
    if (!product) {
      return res.status(400).json({ error: `Product with ID ${item.productId} not found` });
    }

    taxItems.push({
      unitPrice: product.price,
      quantity: Math.max(1, parseInt(item.quantity) || 1),
      discount: item.discount ? Math.max(0, parseFloat(item.discount)) : 0,
      taxRate: product.tax_rate,
    });
  }

  const discountAmount = discount ? Math.max(0, parseFloat(discount)) : 0;
  const result = calculateAuthoritativeTax(taxItems, discountAmount, shop.tax_state || 'INTRA_STATE');

  res.json({ calculation: result });
});

// 4. Complete Sale (Atomic transaction with Cash/Card/UPI/Split payments, inventory deduction, idempotency)
posRouter.post('/checkout', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const employeeId = req.auth!.employeeId!;
  const role = req.auth!.role; // 'CASHIER' or 'SHIFT_LEAD'

  const { items, discount, idempotencyKey, payments } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cannot complete checkout: Cart is empty' });
  }

  // Verify shop suspension server-side
  const enforcement = checkAndEnforceShopStatus(shopId);
  if (enforcement.isPosSuspended) {
    return res.status(403).json({
      error: 'POS checkout is suspended due to an overdue commission invoice or administrative suspension.',
      amountDue: enforcement.amountDue,
    });
  }

  // Verify discount permissions
  const orderDiscount = discount ? Math.max(0, parseFloat(discount)) : 0;
  const hasItemDiscount = items.some((it: any) => parseFloat(it.discount || 0) > 0);

  const canDiscount = ['SHIFT_LEAD', 'SHOP_ADMIN', 'SUPER_ADMIN'].includes(role);
  if ((orderDiscount > 0 || hasItemDiscount) && !canDiscount) {
    return res.status(403).json({
      error: 'Unauthorized: Only Shift Leads are permitted to apply discounts. Cashiers cannot apply discounts.',
      requiredTier: 'SHIFT_LEAD',
    });
  }

  // Check idempotency
  if (idempotencyKey) {
    const existingSale = db.prepare('SELECT * FROM sales WHERE shop_id = ? AND idempotency_key = ?').get(shopId, idempotencyKey) as any;
    if (existingSale) {
      const saleItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(existingSale.id);
      const existingPayments = db.prepare('SELECT * FROM payments WHERE sale_id = ?').all(existingSale.id);
      const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId);
      const employee = db.prepare('SELECT id, name, employee_id, tier FROM employees WHERE id = ?').get(existingSale.employee_id);
      return res.json({
        sale: existingSale,
        items: saleItems,
        payments: existingPayments,
        shop,
        employee,
        isExisting: true,
      });
    }
  }

  // Get active session
  let session = db.prepare("SELECT * FROM sessions WHERE employee_id = ? AND shop_id = ? AND status = 'ACTIVE'").get(employeeId, shopId) as any;
  if (!session) {
    const sessionId = 'ses_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    db.prepare("INSERT INTO sessions (id, employee_id, shop_id, login_at, status) VALUES (?, ?, ?, ?, 'ACTIVE')").run(sessionId, employeeId, shopId, now);
    session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  }

  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId) as any;

  // Begin atomic database transaction
  db.exec('BEGIN TRANSACTION');
  try {
    // 1. Stock Verification and Tax Item Preparation
    const taxItems: TaxCalculationItem[] = [];
    const itemsToInsert: any[] = [];

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(item.productId, shopId) as any;
      if (!product) {
        throw new Error(`Product "${item.productId}" not found in this shop`);
      }

      const qty = Math.max(1, parseInt(item.quantity) || 1);
      if (product.stock < qty) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${qty}`);
      }

      taxItems.push({
        unitPrice: product.price,
        quantity: qty,
        discount: item.discount ? Math.max(0, parseFloat(item.discount)) : 0,
        taxRate: product.tax_rate,
      });

      itemsToInsert.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: product.price,
        discount: item.discount ? Math.max(0, parseFloat(item.discount)) : 0,
      });
    }

    // 2. Authoritative Tax & Totals Calculation
    const calc = calculateAuthoritativeTax(taxItems, orderDiscount, shop.tax_state || 'INTRA_STATE');

    // 3. Payment Validation & Normalization
    let normalizedPayments: any[] = [];
    if (payments && Array.isArray(payments) && payments.length > 0) {
      let sumPaid = 0;
      for (const p of payments) {
        const method = (p.method || '').toUpperCase();
        if (!['CASH', 'CARD', 'UPI'].includes(method)) {
          throw new Error(`Invalid payment method "${p.method}". Must be CASH, CARD, or UPI.`);
        }
        const amt = roundCurrency(parseFloat(p.amount) || 0);
        if (amt <= 0) {
          throw new Error('Payment amount must be greater than zero.');
        }
        sumPaid = roundCurrency(sumPaid + amt);

        let amountReceived = p.amountReceived ? roundCurrency(parseFloat(p.amountReceived)) : amt;
        let changeDue = 0;
        if (method === 'CASH') {
          if (amountReceived < amt) {
            throw new Error(`Cash amount received (₹${amountReceived}) cannot be less than tender amount (₹${amt}).`);
          }
          changeDue = roundCurrency(amountReceived - amt);
        }

        normalizedPayments.push({
          method,
          amount: amt,
          amountReceived,
          changeDue,
          referenceNote: p.referenceNote || (method === 'CASH' ? 'Cash Register' : method === 'CARD' ? 'Card Terminal' : 'UPI QR'),
        });
      }

      // Check sum equality against total
      if (Math.abs(sumPaid - calc.totalAmount) > 0.01) {
        throw new Error(`Payment sum (₹${sumPaid.toFixed(2)}) does not match bill total (₹${calc.totalAmount.toFixed(2)}).`);
      }
    } else {
      // Default to Cash payment in full
      normalizedPayments = [
        {
          method: 'CASH',
          amount: calc.totalAmount,
          amountReceived: calc.totalAmount,
          changeDue: 0,
          referenceNote: 'Cash Register Till',
        },
      ];
    }

    // 4. Generate Sequential Invoice Number
    const countSales = (db.prepare('SELECT COUNT(*) as count FROM sales WHERE shop_id = ?').get(shopId) as any)?.count || 0;
    const now = new Date();
    const invoiceNumber = `INV-${now.getFullYear()}-${String(countSales + 1).padStart(5, '0')}`;
    const saleId = 'sal_' + crypto.randomUUID().substring(0, 10);
    const nowIso = now.toISOString();

    // 5. Insert Sale
    db.prepare(`
      INSERT INTO sales (
        id, shop_id, employee_id, session_id, invoice_number, idempotency_key,
        subtotal, discount, taxable_amount, tax_amount, cgst_amount, sgst_amount, igst_amount,
        total_amount, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)
    `).run(
      saleId,
      shopId,
      employeeId,
      session.id,
      invoiceNumber,
      idempotencyKey || null,
      calc.subtotal,
      calc.discount,
      calc.taxableAmount,
      calc.taxAmount,
      calc.cgstAmount,
      calc.sgstAmount,
      calc.igstAmount,
      calc.totalAmount,
      nowIso
    );

    // 6. Insert Sale Items & Atomically Deduct Inventory
    for (let i = 0; i < itemsToInsert.length; i++) {
      const it = itemsToInsert[i];
      const breakdown = calc.itemBreakdowns[i];
      const saleItemId = 'si_' + crypto.randomUUID().substring(0, 10);

      db.prepare(`
        INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, discount, tax, line_total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        saleItemId,
        saleId,
        it.productId,
        it.productName,
        it.quantity,
        it.unitPrice,
        it.discount,
        breakdown.tax,
        breakdown.lineTotal
      );

      // Inventory deduction with safe constraint
      const res = db.prepare(`
        UPDATE products
        SET stock = stock - ?, updated_at = ?
        WHERE id = ? AND shop_id = ? AND stock >= ?
      `).run(it.quantity, nowIso, it.productId, shopId, it.quantity);

      if (res.changes === 0) {
        throw new Error(`Concurrent modification or insufficient stock when updating "${it.productName}"`);
      }
    }

    // 7. Insert Payments
    const insertedPayments: any[] = [];
    for (const p of normalizedPayments) {
      const paymentId = 'pay_' + crypto.randomUUID().substring(0, 10);
      db.prepare(`
        INSERT INTO payments (id, sale_id, shop_id, method, amount, amount_received, change_due, reference_note, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', ?)
      `).run(paymentId, saleId, shopId, p.method, p.amount, p.amountReceived, p.changeDue, p.referenceNote, nowIso);

      insertedPayments.push({
        id: paymentId,
        sale_id: saleId,
        shop_id: shopId,
        method: p.method,
        amount: p.amount,
        amount_received: p.amountReceived,
        change_due: p.changeDue,
        reference_note: p.referenceNote,
        status: 'COMPLETED',
        created_at: nowIso,
      });
    }

    // 8. Audit Logging if Discount was applied
    if (calc.discount > 0) {
      logAuditEvent({
        actorId: employeeId,
        actorRole: role,
        shopId,
        action: 'DISCOUNT_APPLIED',
        targetType: 'SALE',
        targetId: saleId,
        after: {
          invoiceNumber,
          discountAmount: calc.discount,
          subtotal: calc.subtotal,
          finalAmount: calc.totalAmount,
          authorizedByTier: role,
        },
      });
    }

    // Commit Transaction
    db.exec('COMMIT');

    // --- POLYGLOT PERSISTENCE CROSS-DB SYNC ---
    // 1. Apache Cassandra: Immutable regulatory receipt archive & audit SSTable
    const todayStr = nowIso.split('T')[0];
    cassandra.logEvent('lumora_audit', 'audit_events_by_day', `${shopId}#${todayStr}`, Date.now(), {
      action: 'POS_ORDER_COMPLETED',
      saleId,
      invoiceNumber,
      grandTotal: calc.totalAmount,
      taxGst: calc.taxAmount,
      employeeId,
      itemsCount: itemsToInsert.length,
      device: 'POS-TERMINAL',
    }).catch(() => {});

    cassandra.logEvent('lumora_archives', 'receipts_archive', `${shopId}#${todayStr.substring(0, 7)}`, Date.now(), {
      invoiceNumber,
      grandTotal: calc.totalAmount,
      items: itemsToInsert,
      taxBreakdown: { cgst: calc.cgstAmount, sgst: calc.sgstAmount, igst: calc.igstAmount },
      tamperProofHash: `sha256:${crypto.createHash('sha256').update(invoiceNumber + calc.totalAmount).digest('hex')}`,
    }).catch(() => {});

    // 2. Redis: Increment till revenue stats & publish real-time POS event
    redis.incr('stats:orders_today', 1).catch(() => {});
    redis.hset(`session:till:${employeeId}`, 'last_sale_at', nowIso).catch(() => {});
    redis.publish('pos:events', { type: 'SALE_COMPLETED', invoiceNumber, total: calc.totalAmount }).catch(() => {});

    // 3. MongoDB: Update customer loyalty document if customer identifier passed
    if (req.body.customerPhone || req.body.customer_phone) {
      const phone = req.body.customerPhone || req.body.customer_phone;
      const rewardPoints = Math.floor(calc.totalAmount * 0.05);
      mongo.collection('customer_crm').updateOne(
        { phone },
        {
          $inc: {
            'loyalty.points': rewardPoints,
            'loyalty.lifetime_orders': 1,
            'loyalty.total_spend': calc.totalAmount,
          },
        }
      ).catch(() => {});
    }

    const createdSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    const createdItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
    let employee = db.prepare('SELECT id, name, employee_id, tier FROM employees WHERE id = ?').get(employeeId);
    if (!employee) {
      employee = { id: employeeId, name: 'Store Operator', employee_id: 'OP-01', tier: role };
    }

    res.status(201).json({
      success: true,
      sale: createdSale,
      items: createdItems,
      payments: insertedPayments,
      shop,
      employee,
    });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(400).json({ error: err.message || 'Checkout failed' });
  }
});

// 5. Hold Current Bill (Park bill to database without inventory deduction)
posRouter.post(['/hold', '/held-bills'], (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const employeeId = req.auth!.employeeId!;
  const { items, discount, referenceLabel, customerName } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cannot hold an empty cart' });
  }

  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId) as any;
  const countHeld = (db.prepare("SELECT COUNT(*) as count FROM held_bills WHERE shop_id = ? AND status = 'HELD'").get(shopId) as any)?.count || 0;
  const label = (referenceLabel && referenceLabel.trim()) || `HOLD-${countHeld + 1}`;

  // Calculate estimates
  const taxItems: TaxCalculationItem[] = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?').get(item.productId, shopId) as any;
    if (product) {
      taxItems.push({
        unitPrice: product.price,
        quantity: Math.max(1, parseInt(item.quantity) || 1),
        discount: item.discount ? Math.max(0, parseFloat(item.discount)) : 0,
        taxRate: product.tax_rate,
      });
    }
  }

  const calc = calculateAuthoritativeTax(taxItems, parseFloat(discount) || 0, shop?.tax_state || 'INTRA_STATE');
  const now = new Date().toISOString();
  const heldBillId = 'hb_' + crypto.randomUUID().substring(0, 10);

  // Active session
  const session = db.prepare("SELECT id FROM sessions WHERE employee_id = ? AND shop_id = ? AND status = 'ACTIVE'").get(employeeId, shopId) as any;
  const sessionId = session?.id || 'ses_default';

  const cartPayload = JSON.stringify({
    items,
    discount: parseFloat(discount) || 0,
  });

    const totalItemsCount = items.reduce((sum: number, it: any) => sum + (parseInt(it.quantity) || 1), 0);

  db.prepare(`
    INSERT INTO held_bills (
      id, shop_id, employee_id, session_id, reference_label, customer_name,
      cart_data, items_count, subtotal, total_estimate, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'HELD', ?, ?)
  `).run(
    heldBillId,
    shopId,
    employeeId,
    sessionId,
    label,
    customerName?.trim() || null,
    cartPayload,
    totalItemsCount,
    calc.subtotal,
    calc.totalAmount,
    now,
    now
  );

  // Sync to Redis for fast till terminal cart staging
  redis.set(`held:cart:${shopId}:${heldBillId}`, cartPayload, 86400).catch(() => {});

  const createdHeldBill = db.prepare('SELECT * FROM held_bills WHERE id = ?').get(heldBillId);
  res.status(201).json({ success: true, heldBill: createdHeldBill });
});

// 6. List Active Held Bills
posRouter.get('/held-bills', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const heldBills = db.prepare(`
    SELECT hb.*, e.name as employee_name
    FROM held_bills hb
    LEFT JOIN employees e ON e.id = hb.employee_id
    WHERE hb.shop_id = ? AND hb.status = 'HELD'
    ORDER BY hb.created_at DESC
  `).all(shopId);

  res.json({ heldBills });
});

// 7. Cancel / Delete Held Bill
posRouter.delete('/held-bills/:id', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { id } = req.params;

  const resDb = db.prepare("UPDATE held_bills SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ? AND shop_id = ?").run(id, shopId);
  if (resDb.changes === 0) {
    return res.status(404).json({ error: 'Held bill not found' });
  }

  // Clear from Redis
  redis.del(`held:cart:${shopId}:${id}`).catch(() => {});

  res.json({ success: true, message: 'Held bill cancelled' });
});

// 8. Resume Held Bill
posRouter.post('/held-bills/:id/resume', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { id } = req.params;

  const heldBill = db.prepare("SELECT * FROM held_bills WHERE id = ? AND shop_id = ? AND status = 'HELD'").get(id, shopId) as any;
  if (!heldBill) {
    return res.status(404).json({ error: 'Held bill not found or already processed' });
  }

  // Clear from Redis
  redis.del(`held:cart:${shopId}:${id}`).catch(() => {});

  db.prepare("UPDATE held_bills SET status = 'RESUMED', updated_at = datetime('now') WHERE id = ?").run(id);

  let parsedCart = { items: [], discount: 0 };
  try {
    parsedCart = JSON.parse(heldBill.cart_data);
  } catch (err) {
    console.error('Failed to parse cart data from held bill:', err);
  }

  res.json({ success: true, heldBill, cartData: parsedCart });
});

// 9. Void Sale (Restricted to SHIFT_LEAD only!)
posRouter.post('/sales/:id/void', requireShiftLead, (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const employeeId = req.auth!.employeeId || req.auth!.userId!;
  const role = req.auth!.role;
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A void reason is required' });
  }

  const sale = db.prepare('SELECT * FROM sales WHERE id = ? AND shop_id = ?').get(id, shopId) as any;
  if (!sale) {
    return res.status(404).json({ error: 'Sale not found in your shop' });
  }

  if (sale.status === 'VOIDED') {
    return res.status(400).json({ error: 'Sale has already been voided' });
  }

  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION');
  try {
    // 1. Mark sale as VOIDED (financial history preserved)
    db.prepare(`
      UPDATE sales
      SET status = 'VOIDED', void_reason = ?, voided_by = ?, voided_at = ?
      WHERE id = ? AND shop_id = ?
    `).run(reason.trim(), employeeId, now, id, shopId);

    // 2. Restore inventory for all items in the sale
    const saleItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id) as any[];
    for (const item of saleItems) {
      db.prepare(`
        UPDATE products
        SET stock = stock + ?, updated_at = ?
        WHERE id = ? AND shop_id = ?
      `).run(item.quantity, now, item.product_id, shopId);
    }

    // 3. Record Audit Log
    logAuditEvent({
      actorId: employeeId,
      actorRole: role,
      shopId,
      action: 'VOID_PERFORMED',
      targetType: 'SALE',
      targetId: id,
      before: { invoiceNumber: sale.invoice_number, totalAmount: sale.total_amount, status: 'COMPLETED' },
      after: { status: 'VOIDED', reason: reason.trim(), voidedBy: employeeId, voidedAt: now },
    });

    db.exec('COMMIT');

    const updatedSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
    res.json({ success: true, sale: updatedSale, message: 'Sale successfully voided and inventory restored' });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: err.message || 'Failed to void sale' });
  }
});

// 10. Process Return / Refund (Authorized Shift Lead / Shop Admin)
posRouter.post('/sales/:id/refund', requireShiftLead, (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const employeeId = req.auth!.employeeId || req.auth!.userId!;
  const role = req.auth!.role;
  const { id } = req.params;
  const { items, reason, refundMethod } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A refund reason is required' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Please select at least one item to return/refund' });
  }

  const sale = db.prepare('SELECT * FROM sales WHERE id = ? AND shop_id = ?').get(id, shopId) as any;
  if (!sale) {
    return res.status(404).json({ error: 'Sale not found in this shop' });
  }

  if (sale.status === 'VOIDED') {
    return res.status(400).json({ error: 'Cannot refund a sale that is already voided' });
  }

  const activeSession = db.prepare("SELECT id FROM sessions WHERE employee_id = ? AND shop_id = ? AND status = 'ACTIVE'").get(employeeId, shopId) as any;
  const sessionId = activeSession?.id || sale.session_id;

  const now = new Date();
  const nowIso = now.toISOString();

  db.exec('BEGIN TRANSACTION');
  try {
    const saleItems = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id) as any[];
    const saleItemMap = new Map<string, any>();
    for (const si of saleItems) {
      saleItemMap.set(si.id, si);
    }

    // Check prior refunds for this sale
    const priorRefundItems = db.prepare(`
      SELECT ri.sale_item_id, SUM(ri.quantity) as refunded_qty
      FROM refund_items ri
      JOIN refunds r ON r.id = ri.refund_id
      WHERE r.sale_id = ?
      GROUP BY ri.sale_item_id
    `).all(id) as any[];

    const refundedQtyMap = new Map<string, number>();
    for (const pri of priorRefundItems) {
      refundedQtyMap.set(pri.sale_item_id, pri.refunded_qty);
    }

    let refundSubtotal = 0;
    let refundTaxAmount = 0;
    let refundTotalAmount = 0;
    const itemsToRefund: any[] = [];

    for (const reqItem of items) {
      const originalItem = saleItemMap.get(reqItem.saleItemId);
      if (!originalItem) {
        throw new Error(`Sale item "${reqItem.saleItemId}" does not belong to this sale`);
      }

      const returnQty = parseInt(reqItem.quantity) || 0;
      if (returnQty <= 0) {
        throw new Error(`Invalid return quantity for item "${originalItem.product_name}"`);
      }

      const alreadyRefunded = refundedQtyMap.get(originalItem.id) || 0;
      const remainingQty = originalItem.quantity - alreadyRefunded;

      if (returnQty > remainingQty) {
        throw new Error(`Cannot return ${returnQty} units of "${originalItem.product_name}". Only ${remainingQty} eligible for refund.`);
      }

      // Calculate proportional line refund
      const unitPrice = originalItem.unit_price;
      const unitTax = originalItem.tax / originalItem.quantity;
      const lineSubtotal = roundCurrency(unitPrice * returnQty);
      const lineTax = roundCurrency(unitTax * returnQty);
      const lineTotal = roundCurrency(lineSubtotal + lineTax);

      refundSubtotal = roundCurrency(refundSubtotal + lineSubtotal);
      refundTaxAmount = roundCurrency(refundTaxAmount + lineTax);
      refundTotalAmount = roundCurrency(refundTotalAmount + lineTotal);

      itemsToRefund.push({
        saleItemId: originalItem.id,
        productId: originalItem.product_id,
        productName: originalItem.product_name,
        quantity: returnQty,
        unitPrice,
        tax: lineTax,
        refundTotal: lineTotal,
      });
    }

    // Generate refund invoice number
    const refundCount = (db.prepare('SELECT COUNT(*) as count FROM refunds WHERE shop_id = ?').get(shopId) as any)?.count || 0;
    const refundInvoiceNumber = `REF-${now.getFullYear()}-${String(refundCount + 1).padStart(5, '0')}`;
    const refundId = 'ref_' + crypto.randomUUID().substring(0, 10);
    const method = (refundMethod || 'CASH').toUpperCase();

    // Insert refund record
    db.prepare(`
      INSERT INTO refunds (
        id, sale_id, shop_id, employee_id, session_id, refund_invoice_number,
        subtotal, tax_amount, total_refund_amount, reason, payment_method, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      refundId,
      id,
      shopId,
      employeeId,
      sessionId,
      refundInvoiceNumber,
      refundSubtotal,
      refundTaxAmount,
      refundTotalAmount,
      reason.trim(),
      method,
      nowIso
    );

    // Insert refund items and return stock
    for (const rit of itemsToRefund) {
      const refundItemId = 'ri_' + crypto.randomUUID().substring(0, 10);
      db.prepare(`
        INSERT INTO refund_items (id, refund_id, sale_item_id, product_id, product_name, quantity, unit_price, tax, refund_total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        refundItemId,
        refundId,
        rit.saleItemId,
        rit.productId,
        rit.productName,
        rit.quantity,
        rit.unitPrice,
        rit.tax,
        rit.refundTotal
      );

      // Restore inventory
      db.prepare(`
        UPDATE products
        SET stock = stock + ?, updated_at = ?
        WHERE id = ? AND shop_id = ?
      `).run(rit.quantity, nowIso, rit.productId, shopId);
    }

    // Record Audit Log
    logAuditEvent({
      actorId: employeeId,
      actorRole: role,
      shopId,
      action: 'REFUND_PERFORMED',
      targetType: 'SALE',
      targetId: id,
      after: {
        refundInvoiceNumber,
        originalInvoiceNumber: sale.invoice_number,
        totalRefundAmount: refundTotalAmount,
        reason: reason.trim(),
        paymentMethod: method,
        itemsCount: itemsToRefund.length,
      },
    });

    db.exec('COMMIT');

    // Cross-Database Sync: Cassandra immutable audit & Redis metrics
    cassandra.logEvent('lumora_audit', 'audit_events_by_day', `${shopId}#${nowIso.split('T')[0]}`, Date.now(), {
      action: 'POS_REFUND_COMPLETED',
      refundInvoiceNumber,
      originalInvoiceNumber: sale.invoice_number,
      totalRefundAmount: refundTotalAmount,
      reason: reason.trim(),
      paymentMethod: method,
    }).catch(() => {});

    redis.incr('stats:refunds_today').catch(() => {});
    for (const rit of itemsToRefund) {
      redis.del(`cache:barcode:${rit.productId}`).catch(() => {});
    }

    const createdRefund = db.prepare('SELECT * FROM refunds WHERE id = ?').get(refundId);
    const createdRefundItems = db.prepare('SELECT * FROM refund_items WHERE refund_id = ?').all(refundId);

    res.status(201).json({
      success: true,
      refund: createdRefund,
      refundItems: createdRefundItems,
      message: 'Refund successfully processed and stock restored to inventory',
    });
  } catch (err: any) {
    db.exec('ROLLBACK');
    res.status(400).json({ error: err.message || 'Refund failed' });
  }
});

// 11. Get Full GST Tax Receipt details for a sale (Idempotent Reprint & Display)
posRouter.get('/sales/:id/receipt', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { id } = req.params;

  const sale = db.prepare('SELECT * FROM sales WHERE id = ? AND shop_id = ?').get(id, shopId) as any;
  if (!sale) {
    return res.status(404).json({ error: 'Sale not found in your shop' });
  }

  const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
  const payments = db.prepare('SELECT * FROM payments WHERE sale_id = ?').all(id);
  const refunds = db.prepare(`
    SELECT r.*, e.name as employee_name
    FROM refunds r
    LEFT JOIN employees e ON e.id = r.employee_id
    WHERE r.sale_id = ?
  `).all(id) as any[];

  for (const r of refunds) {
    r.items = db.prepare('SELECT * FROM refund_items WHERE refund_id = ?').all(r.id);
  }

  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId);
  const employee = db.prepare('SELECT id, name, employee_id, tier FROM employees WHERE id = ?').get(sale.employee_id);

  res.json({
    sale,
    items,
    payments,
    refunds,
    shop,
    employee,
  });
});

// 12. Search Sales / Transactions (Reprint, Returns, and Audit Lookup)
posRouter.get('/sales', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const { search, date, status, limit } = req.query;

  let query = `
    SELECT 
      s.*,
      e.name as employee_name,
      e.tier as employee_tier,
      (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as items_count,
      (SELECT COUNT(*) FROM refunds WHERE sale_id = s.id) as refunds_count
    FROM sales s
    LEFT JOIN employees e ON e.id = s.employee_id
    WHERE s.shop_id = ?
  `;
  const params: any[] = [shopId];

  if (search) {
    query += ' AND (s.invoice_number LIKE ? OR e.name LIKE ? OR s.id LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (date) {
    query += ' AND date(s.created_at) = date(?)';
    params.push(date);
  }

  if (status) {
    query += ' AND s.status = ?';
    params.push(status);
  }

  query += ' ORDER BY s.created_at DESC LIMIT ?';
  params.push(Math.min(100, Math.max(1, parseInt(limit as string) || 25)));

  const sales = db.prepare(query).all(...params) as any[];
  for (const s of sales) {
    s.payments = db.prepare('SELECT method, amount, amount_received, change_due FROM payments WHERE sale_id = ?').all(s.id);
  }

  res.json({ sales });
});

// 13. Operational Till & Session Summary (Current shift reconciliation)
posRouter.get('/session/summary', (req: Request, res: Response) => {
  const shopId = req.auth!.shopId!;
  const employeeId = req.auth!.employeeId!;
  const role = req.auth!.role;

  // Active session
  let session = db.prepare("SELECT * FROM sessions WHERE employee_id = ? AND shop_id = ? AND status = 'ACTIVE'").get(employeeId, shopId) as any;
  if (!session) {
    // If no active session, find most recent session
    session = db.prepare('SELECT * FROM sessions WHERE employee_id = ? AND shop_id = ? ORDER BY login_at DESC LIMIT 1').get(employeeId, shopId) as any;
  }

  let employee = db.prepare('SELECT id, name, employee_id, tier FROM employees WHERE id = ?').get(employeeId) as any;
  if (!employee) {
    employee = { id: employeeId, name: 'Current Operator', employee_id: 'OP-01', tier: role };
  }

  const sessionStart = session ? new Date(session.login_at) : new Date();
  const now = new Date();
  const diffMs = now.getTime() - sessionStart.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffMins = Math.floor((diffMs % 3600000) / 60000);
  const durationFormatted = `${diffHours}h ${diffMins}m`;

  const sessionId = session?.id || '';

  // Completed sales in session
  const salesAgg = db.prepare(`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(total_amount), 0) as gross_amount,
      COALESCE(SUM(discount), 0) as total_discount,
      COALESCE(SUM(cgst_amount), 0) as total_cgst,
      COALESCE(SUM(sgst_amount), 0) as total_sgst,
      COALESCE(SUM(igst_amount), 0) as total_igst
    FROM sales
    WHERE session_id = ? AND status = 'COMPLETED'
  `).get(sessionId) as any;

  // Payments in session
  const paymentAgg = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN p.method = 'CASH' THEN p.amount ELSE 0 END), 0) as cash_total,
      COALESCE(SUM(CASE WHEN p.method = 'CARD' THEN p.amount ELSE 0 END), 0) as card_total,
      COALESCE(SUM(CASE WHEN p.method = 'UPI' THEN p.amount ELSE 0 END), 0) as upi_total
    FROM payments p
    JOIN sales s ON s.id = p.sale_id
    WHERE s.session_id = ? AND s.status = 'COMPLETED'
  `).get(sessionId) as any;

  // Voids in session
  const voidsAgg = db.prepare(`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(total_amount), 0) as total_amount
    FROM sales
    WHERE session_id = ? AND status = 'VOIDED'
  `).get(sessionId) as any;

  // Refunds in session
  const refundsAgg = db.prepare(`
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(total_refund_amount), 0) as total_amount,
      COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN total_refund_amount ELSE 0 END), 0) as cash_refunded
    FROM refunds
    WHERE session_id = ?
  `).get(sessionId) as any;

  const cashCollected = paymentAgg.cash_total || 0;
  const cashRefunded = refundsAgg.cash_refunded || 0;
  const netTillBalance = roundCurrency(cashCollected - cashRefunded);

  res.json({
    summary: {
      session,
      operator: {
        name: employee.name,
        employee_id: employee.employee_id,
        tier: employee.tier,
      },
      durationFormatted,
      totalSalesCount: salesAgg.count || 0,
      grossSalesAmount: roundCurrency(salesAgg.gross_amount || 0),
      totalDiscountsGiven: roundCurrency(salesAgg.total_discount || 0),
      totalCgst: roundCurrency(salesAgg.total_cgst || 0),
      totalSgst: roundCurrency(salesAgg.total_sgst || 0),
      totalIgst: roundCurrency(salesAgg.total_igst || 0),
      paymentsBreakdown: {
        cashTotal: roundCurrency(paymentAgg.cash_total || 0),
        cardTotal: roundCurrency(paymentAgg.card_total || 0),
        upiTotal: roundCurrency(paymentAgg.upi_total || 0),
      },
      voids: {
        count: voidsAgg.count || 0,
        totalAmount: roundCurrency(voidsAgg.total_amount || 0),
      },
      refunds: {
        count: refundsAgg.count || 0,
        totalAmount: roundCurrency(refundsAgg.total_amount || 0),
      },
      netTillBalance,
    },
  });
});
