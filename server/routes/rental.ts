import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import crypto from 'node:crypto';
import { requireTenantContext, requireModule, requirePermission } from '../services/tenantContext.js';

export const rentalRouter = Router();

// Enterprise Security Hardening: All rental operations require authenticated tenant membership + RENTAL module entitlement
rentalRouter.use(requireTenantContext);
rentalRouter.use(requireModule('RENTAL'));

// 1. Assets list
rentalRouter.get('/assets', requirePermission('rental.assets.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const assets = db.prepare('SELECT * FROM rental_assets WHERE business_id = ? ORDER BY name ASC').all(bizId);
  res.json({ assets });
});

// 2. Add Asset
rentalRouter.post('/assets', requirePermission('rental.assets.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { name, category, serialNumber, dailyRate, depositAmount, conditionNotes } = req.body;

  if (!name || !dailyRate || !depositAmount) {
    return res.status(400).json({ error: 'Asset name, daily rate, and deposit amount are required' });
  }

  const id = 'ast_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO rental_assets (id, business_id, name, category, serial_number, daily_rate, deposit_amount, status, condition_notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?)
  `).run(id, bizId, name, category || 'Equipment', serialNumber || null, dailyRate, depositAmount, conditionNotes || null, now);

  res.status(201).json({ success: true, asset: { id, name, daily_rate: dailyRate, deposit_amount: depositAmount, status: 'AVAILABLE' } });
});

// 3. Bookings list
rentalRouter.get('/bookings', requirePermission('rental.bookings.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const bookings = db.prepare('SELECT * FROM rental_bookings WHERE business_id = ? ORDER BY start_date DESC').all(bizId);
  res.json({ bookings });
});

// 4. Create Rental Booking with OVERLAPPING CONFLICT PREVENTION
rentalRouter.post('/bookings', requirePermission('rental.bookings.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { assetId, customerName, customerPhone, startDate, endDate, notes } = req.body;

  if (!assetId || !customerName || !startDate || !endDate) {
    return res.status(400).json({ error: 'Asset ID, customer name, start date, and end date are required' });
  }

  const asset = db.prepare('SELECT * FROM rental_assets WHERE id = ? AND business_id = ?').get(assetId, bizId) as any;
  if (!asset) {
    return res.status(404).json({ error: 'Rental asset not found' });
  }

  // OVERLAP CONFLICT DETECTION:
  const overlap = db.prepare(`
    SELECT * FROM rental_bookings
    WHERE business_id = ? AND asset_id = ?
      AND status IN ('ACTIVE', 'BOOKED')
      AND (start_date <= ? AND end_date >= ?)
  `).get(bizId, assetId, endDate, startDate) as any;

  if (overlap) {
    return res.status(409).json({
      error: `Asset Booking Conflict: "${asset.name}" is already rented/reserved from ${overlap.start_date} to ${overlap.end_date} by ${overlap.customer_name}. Please choose non-overlapping dates.`,
      conflictBooking: overlap,
    });
  }

  const startD = new Date(startDate);
  const endD = new Date(endDate);
  const diffTime = Math.abs(endD.getTime() - startD.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const totalRent = diffDays * asset.daily_rate;

  const id = 'rbk_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO rental_bookings (
      id, business_id, asset_id, asset_name, customer_name, customer_phone,
      start_date, end_date, daily_rate, deposit_paid, total_rent, late_fee,
      status, returned_date, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'ACTIVE', NULL, ?, ?, ?)
  `).run(
    id, bizId, asset.id, asset.name, customerName, customerPhone || null,
    startDate, endDate, asset.daily_rate, asset.deposit_amount, totalRent,
    notes || null, now, now
  );

  // Update asset status to RENTED
  db.prepare("UPDATE rental_assets SET status = 'RENTED' WHERE id = ? AND business_id = ?").run(asset.id, bizId);

  res.status(201).json({
    success: true,
    booking: {
      id,
      asset_name: asset.name,
      customer_name: customerName,
      start_date: startDate,
      end_date: endDate,
      days: diffDays,
      total_rent: totalRent,
      deposit_paid: asset.deposit_amount,
    },
  });
});

// 5. Return Asset
rentalRouter.post('/bookings/:id/return', requirePermission('rental.bookings.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { id } = req.params;
  const { returnedDate, conditionNotes, lateFee } = req.body;

  const booking = db.prepare('SELECT * FROM rental_bookings WHERE id = ? AND business_id = ?').get(id, bizId) as any;
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const now = new Date().toISOString();
  const returnD = returnedDate || now.split('T')[0];

  let assessedLateFee = lateFee || 0;
  if (lateFee === undefined && returnD > booking.end_date) {
    const endMs = new Date(booking.end_date).getTime();
    const retMs = new Date(returnD).getTime();
    const overdueDays = Math.ceil((retMs - endMs) / (1000 * 60 * 60 * 24));
    assessedLateFee = overdueDays * booking.daily_rate * 1.5;
  }

  db.prepare(`
    UPDATE rental_bookings
    SET status = 'RETURNED', returned_date = ?, late_fee = ?, updated_at = ?
    WHERE id = ? AND business_id = ?
  `).run(returnD, assessedLateFee, now, id, bizId);

  db.prepare("UPDATE rental_assets SET status = 'AVAILABLE' WHERE id = ? AND business_id = ?").run(booking.asset_id, bizId);

  res.json({
    success: true,
    message: 'Asset successfully returned and restored to inventory.',
    late_fee: assessedLateFee,
    deposit_to_refund: Math.max(0, booking.deposit_paid - assessedLateFee),
  });
});
