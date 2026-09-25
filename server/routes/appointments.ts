import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import crypto from 'node:crypto';
import { requireTenantContext, requirePermission } from '../services/tenantContext.js';

export const appointmentsRouter = Router();

// Enterprise Security Hardening: All appointment operations require authenticated tenant membership
appointmentsRouter.use(requireTenantContext);

// 1. List universal appointments
appointmentsRouter.get('/', requirePermission('appointments.read'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const date = req.query.date as string;
  const resourceId = req.query.resourceId as string;
  const branchId = req.tenantContext!.branchId || (req.query.branchId as string);

  let query = 'SELECT * FROM appointments WHERE business_id = ?';
  const params: any[] = [bizId];

  if (branchId) {
    query += ' AND (branch_id = ? OR branch_id IS NULL)';
    params.push(branchId);
  }
  if (date) {
    query += ' AND date = ?';
    params.push(date);
  }
  if (resourceId) {
    query += ' AND resource_id = ?';
    params.push(resourceId);
  }

  query += ' ORDER BY date ASC, start_time ASC';
  const appointments = db.prepare(query).all(...params);
  res.json({ appointments });
});

// 2. Universal booking with DOUBLE-BOOKING CHECK
appointmentsRouter.post('/', requirePermission('appointments.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const {
    customerName,
    customerPhone,
    serviceName,
    resourceId,
    resourceName,
    resourceType,
    date,
    startTime,
    endTime,
    fee,
    notes,
    branchId: targetBranchId,
  } = req.body;

  if (!customerName || !resourceId || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'Customer name, resource, date, start time, and end time are required' });
  }

  const branchId = targetBranchId || req.tenantContext!.branchId || null;

  // DOUBLE-BOOKING GUARD:
  const conflict = db.prepare(`
    SELECT * FROM appointments
    WHERE business_id = ? AND resource_id = ? AND date = ?
      AND status NOT IN ('CANCELLED', 'NO_SHOW')
      AND (
        (start_time < ? AND end_time > ?) OR
        (start_time >= ? AND start_time < ?) OR
        (end_time > ? AND end_time <= ?)
      )
  `).get(bizId, resourceId, date, endTime, startTime, startTime, endTime, startTime, endTime) as any;

  if (conflict) {
    return res.status(409).json({
      error: `Double Booking Conflict: Resource "${resourceName || resourceId}" is already scheduled on ${date} from ${conflict.start_time} to ${conflict.end_time} for ${conflict.customer_name}.`,
      conflict,
    });
  }

  const id = 'apt_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO appointments (
      id, business_id, branch_id, customer_name, customer_phone, service_id, service_name,
      resource_id, resource_name, resource_type, date, start_time, end_time,
      status, payment_status, fee, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'srv_gen', ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'PENDING', ?, ?, ?, ?)
  `).run(
    id, bizId, branchId, customerName, customerPhone || null, serviceName || 'General Service',
    resourceId, resourceName || 'Staff Member', resourceType || 'STAFF',
    date, startTime, endTime, fee || 0, notes || null, now, now
  );

  res.status(201).json({
    success: true,
    appointment: { id, customer_name: customerName, resource_name: resourceName, date, start_time: startTime, end_time: endTime },
  });
});
