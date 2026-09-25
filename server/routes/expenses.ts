import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import crypto from 'node:crypto';
import { requireTenantContext, requirePermission } from '../services/tenantContext.js';

export const expensesRouter = Router();

// Enterprise Security Hardening: All expense records require authenticated tenant membership + finance permissions
expensesRouter.use(requireTenantContext);

// 1. List Expenses
expensesRouter.get('/', requirePermission('finance.expenses'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const category = req.query.category as string;

  let query = 'SELECT * FROM expenses WHERE business_id = ?';
  const params: any[] = [bizId];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY date DESC, created_at DESC';
  const expenses = db.prepare(query).all(...params);

  const totalAmount = (db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE business_id = ?').get(bizId) as any)?.total || 0;

  res.json({ expenses, totalAmount });
});

// 2. Add Expense (Atomic execution)
expensesRouter.post('/', requirePermission('finance.expenses'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { category, title, amount, paymentMethod, vendor, date, description } = req.body;

  if (!title || !amount || !category) {
    return res.status(400).json({ error: 'Title, amount, and category are required' });
  }

  const id = 'exp_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const expDate = date || now.split('T')[0];

  db.prepare(`
    INSERT INTO expenses (id, business_id, category, title, amount, payment_method, vendor, date, description, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, bizId, category, title, amount, paymentMethod || 'CASH', vendor || null, expDate, description || null, req.tenantContext!.actorId, now);

  res.status(201).json({ success: true, expense: { id, title, amount, category, date: expDate } });
});
