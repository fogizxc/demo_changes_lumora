import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import crypto from 'node:crypto';
import { getActiveBusinessId } from './tenants.js';

export const repairRouter = Router();

// 1. List Job Cards
repairRouter.get('/jobs', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const status = req.query.status as string;
  const q = (req.query.q as string || '').trim();

  let query = 'SELECT * FROM repair_jobs WHERE business_id = ?';
  const params: any[] = [bizId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (q) {
    query += ' AND (customer_name LIKE ? OR job_number LIKE ? OR model LIKE ? OR serial_number LIKE ?)';
    const search = `%${q}%`;
    params.push(search, search, search, search);
  }

  query += ' ORDER BY created_at DESC';
  const jobs = db.prepare(query).all(...params);
  res.json({ jobs });
});

// 2. Create Job Card
repairRouter.post('/jobs', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const {
    customerName,
    customerPhone,
    deviceType,
    brand,
    model,
    serialNumber,
    reportedFault,
    estimatedCost,
    technicianName,
  } = req.body;

  if (!customerName || !customerPhone || !deviceType || !reportedFault) {
    return res.status(400).json({ error: 'Customer name, phone, device type, and fault description are required' });
  }

  const id = 'job_' + crypto.randomBytes(6).toString('hex');
  const count = (db.prepare('SELECT COUNT(id) as count FROM repair_jobs WHERE business_id = ?').get(bizId) as any)?.count || 0;
  const jobNumber = `JOB-${new Date().getFullYear()}-${800 + count + 1}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO repair_jobs (
      id, business_id, job_number, customer_name, customer_phone, device_type, brand, model,
      serial_number, reported_fault, technician_name, status, estimated_cost, parts_cost, labor_cost, total_cost, payment_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?, 0, 0, ?, 'PENDING', ?, ?)
  `).run(
    id, bizId, jobNumber, customerName, customerPhone, deviceType, brand || 'Generic', model || 'Unknown',
    serialNumber || null, reportedFault, technicianName || null, estimatedCost || 0, estimatedCost || 0, now, now
  );

  res.status(201).json({
    success: true,
    job: { id, job_number: jobNumber, customer_name: customerName, status: 'RECEIVED' },
  });
});

// 3. Update Job Status
repairRouter.post('/jobs/:id/status', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const { id } = req.params;
  const { status, diagnosis, partsCost, laborCost } = req.body;

  const valid = ['RECEIVED', 'DIAGNOSING', 'WAITING_APPROVAL', 'IN_REPAIR', 'READY', 'DELIVERED', 'CANCELLED'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${valid.join(', ')}` });
  }

  const now = new Date().toISOString();
  let query = 'UPDATE repair_jobs SET status = ?, updated_at = ?';
  const params: any[] = [status, now];

  if (diagnosis !== undefined) {
    query += ', diagnosis = ?';
    params.push(diagnosis);
  }
  if (partsCost !== undefined || laborCost !== undefined) {
    const job = db.prepare('SELECT parts_cost, labor_cost FROM repair_jobs WHERE id = ?').get(id) as any;
    const p = partsCost !== undefined ? partsCost : (job?.parts_cost || 0);
    const l = laborCost !== undefined ? laborCost : (job?.labor_cost || 0);
    query += ', parts_cost = ?, labor_cost = ?, total_cost = ?';
    params.push(p, l, p + l);
  }

  query += ' WHERE id = ? AND business_id = ?';
  params.push(id, bizId);

  const result = db.prepare(query).run(...params);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Job card not found' });
  }

  res.json({ success: true, id, status });
});
