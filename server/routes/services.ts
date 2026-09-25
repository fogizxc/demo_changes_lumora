import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import crypto from 'node:crypto';
import { requireTenantContext, requirePermission } from '../services/tenantContext.js';

export const servicesRouter = Router();

// Enterprise Security Hardening: All services catalog operations require authenticated tenant membership
servicesRouter.use(requireTenantContext);

// 1. List Services
servicesRouter.get('/', (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const services = db.prepare('SELECT * FROM services WHERE business_id = ? ORDER BY name ASC').all(bizId);
  res.json({ services });
});

// 2. Add Service
servicesRouter.post('/', requirePermission('services.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { name, description, category, durationMinutes, price, taxRate } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Service name and price are required' });
  }

  const id = 'srv_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO services (id, business_id, name, description, category, duration_minutes, price, tax_rate, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `).run(id, bizId, name, description || null, category || 'General', durationMinutes || 30, price, taxRate || 18.0, now, now);

  res.status(201).json({ success: true, service: { id, name, price, duration_minutes: durationMinutes } });
});
