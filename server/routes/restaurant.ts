import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import crypto from 'node:crypto';
import { requireTenantContext, requireModule, requirePermission } from '../services/tenantContext.js';

export const restaurantRouter = Router();

// Enterprise Security Hardening: All restaurant operations require authenticated tenant membership + RESTAURANT module entitlement
restaurantRouter.use(requireTenantContext);
restaurantRouter.use(requireModule('RESTAURANT'));

// 1. Tables list
restaurantRouter.get('/tables', requirePermission('restaurant.tables.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const tables = db.prepare(`
    SELECT 
      t.*,
      o.order_number,
      o.status as order_status,
      o.total as order_total,
      o.items_json
    FROM restaurant_tables t
    LEFT JOIN restaurant_orders o ON o.id = t.current_order_id
    WHERE t.business_id = ?
    ORDER BY t.table_number ASC
  `).all(bizId).map((t: any) => ({
    ...t,
    items: parseJsonSafe(t.items_json, []),
  }));

  res.json({ tables });
});

// 2. Add Table
restaurantRouter.post('/tables', requirePermission('restaurant.tables.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { tableNumber, capacity, floorSection } = req.body;

  if (!tableNumber) {
    return res.status(400).json({ error: 'Table number is required' });
  }

  const id = 'tbl_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO restaurant_tables (id, business_id, table_number, capacity, floor_section, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'VACANT', ?)
  `).run(id, bizId, tableNumber, capacity || 4, floorSection || 'Main Dining', now);

  res.status(201).json({ success: true, table: { id, table_number: tableNumber, capacity, status: 'VACANT' } });
});

// 3. Update Table Status
restaurantRouter.post('/tables/:id/status', requirePermission('restaurant.tables.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { id } = req.params;
  const { status } = req.body;

  const valid = ['VACANT', 'OCCUPIED', 'BILLING', 'RESERVED'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
  }

  db.prepare('UPDATE restaurant_tables SET status = ? WHERE id = ? AND business_id = ?').run(status, id, bizId);
  res.json({ success: true, id, status });
});

// 4. Orders list / KOT Tickets
restaurantRouter.get('/orders', requirePermission('restaurant.orders.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const status = req.query.status as string;

  let query = 'SELECT * FROM restaurant_orders WHERE business_id = ?';
  const params: any[] = [bizId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';
  const orders = db.prepare(query).all(...params).map((o: any) => ({
    ...o,
    items: parseJsonSafe(o.items_json, []),
  }));

  res.json({ orders });
});

// 5. Create Order & Generate KOT (Kitchen Order Ticket)
restaurantRouter.post('/orders', requirePermission('restaurant.orders.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { tableId, tableNumber, orderType, items, waiterName, notes } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  const id = 'ord_' + crypto.randomBytes(6).toString('hex');
  const count = (db.prepare('SELECT COUNT(id) as count FROM restaurant_orders WHERE business_id = ?').get(bizId) as any)?.count || 0;
  const orderNumber = `KOT-${new Date().getFullYear()}-${100 + count + 1}`;
  const now = new Date().toISOString();

  let subtotal = 0;
  for (const item of items) {
    subtotal += (item.price || 0) * (item.qty || 1);
  }
  const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% Restaurant GST
  const total = subtotal + tax;

  db.prepare(`
    INSERT INTO restaurant_orders (
      id, business_id, table_id, table_number, order_number, order_type, items_json,
      status, subtotal, tax, total, payment_status, waiter_name, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?, ?, ?, 'PENDING', ?, ?, ?, ?)
  `).run(
    id, bizId, tableId || null, tableNumber || null, orderNumber, orderType || 'DINE_IN',
    JSON.stringify(items), subtotal, tax, total, waiterName || null, notes || null, now, now
  );

  // If tableId is present, update table to OCCUPIED and assign current_order_id
  if (tableId) {
    db.prepare(`
      UPDATE restaurant_tables SET status = 'OCCUPIED', current_order_id = ? WHERE id = ? AND business_id = ?
    `).run(id, tableId, bizId);
  }

  res.status(201).json({
    success: true,
    order: {
      id,
      order_number: orderNumber,
      table_number: tableNumber,
      status: 'RECEIVED',
      subtotal,
      tax,
      total,
      items,
    },
  });
});

// 6. Update Order Status (KOT lifecycle: RECEIVED -> KITCHEN -> READY -> SERVED -> BILLED)
restaurantRouter.post('/orders/:id/status', requirePermission('restaurant.orders.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { id } = req.params;
  const { status } = req.body;

  const valid = ['RECEIVED', 'KITCHEN', 'READY', 'SERVED', 'BILLED', 'CANCELLED'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${valid.join(', ')}` });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE restaurant_orders SET status = ?, updated_at = ? WHERE id = ? AND business_id = ?').run(status, now, id, bizId);

  // If status is BILLED, check if table should be moved to BILLING
  if (status === 'BILLED') {
    const order = db.prepare('SELECT table_id FROM restaurant_orders WHERE id = ?').get(id) as any;
    if (order?.table_id) {
      db.prepare("UPDATE restaurant_tables SET status = 'BILLING' WHERE id = ? AND business_id = ?").run(order.table_id, bizId);
    }
  }

  res.json({ success: true, id, status });
});

// 7. Settle Bill and Free Table
restaurantRouter.post('/orders/:id/pay', requirePermission('restaurant.orders.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { id } = req.params;

  const now = new Date().toISOString();
  const order = db.prepare('SELECT * FROM restaurant_orders WHERE id = ? AND business_id = ?').get(id, bizId) as any;
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  db.prepare(`
    UPDATE restaurant_orders
    SET status = 'COMPLETED', payment_status = 'PAID', updated_at = ?
    WHERE id = ? AND business_id = ?
  `).run(now, id, bizId);

  // Free table
  if (order.table_id) {
    db.prepare(`
      UPDATE restaurant_tables
      SET status = 'VACANT', current_order_id = NULL
      WHERE id = ? AND business_id = ?
    `).run(order.table_id, bizId);
  }

  res.json({ success: true, message: 'Bill settled successfully. Table is now vacant.' });
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
