import crypto from 'node:crypto';
import { db } from '../db.js';
import { roundCurrency } from './tax.js';
import { logAuditEvent } from './audit.js';

export const COMMISSION_RATE = 0.02; // 2%
export const GRACE_PERIOD_DAYS = 7;

/**
 * Calculates gross sales and 2% commission for a shop in a specific period (e.g. "2026-09" or between dates).
 */
export function calculateShopGrossSales(shopId: string, startDate?: string, endDate?: string): {
  grossSales: number;
  commissionDue: number;
  transactionsCount: number;
} {
  let query = `
    SELECT 
      COALESCE(SUM(total_amount), 0) as gross_sales,
      COUNT(id) as count
    FROM sales
    WHERE shop_id = ? AND status = 'COMPLETED'
  `;
  const params: any[] = [shopId];

  if (startDate && endDate) {
    query += ` AND created_at >= ? AND created_at <= ?`;
    params.push(startDate, endDate);
  }

  const res = db.prepare(query).get(...params) as { gross_sales: number; count: number };
  const grossSales = roundCurrency(res?.gross_sales || 0);
  const commissionDue = roundCurrency(grossSales * COMMISSION_RATE);

  return {
    grossSales,
    commissionDue,
    transactionsCount: res?.count || 0,
  };
}

/**
 * Checks shop suspension and overdue status.
 * If any invoice is unpaid and past its 7-day grace period:
 *  - Updates invoice status to OVERDUE if it was PENDING
 *  - Updates shop status to OVERDUE or SUSPENDED
 * Returns the overdue invoice and whether POS is suspended.
 */
export function checkAndEnforceShopStatus(shopId: string): {
  shopStatus: 'ACTIVE' | 'OVERDUE' | 'SUSPENDED';
  isPosSuspended: boolean;
  overdueInvoice: any | null;
  gracePeriodDaysLeft: number | null;
  amountDue: number;
} {
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId) as any;
  if (!shop) {
    throw new Error('Shop not found');
  }

  // If manually suspended by Super Admin
  if (shop.status === 'SUSPENDED') {
    return {
      shopStatus: 'SUSPENDED',
      isPosSuspended: true,
      overdueInvoice: null,
      gracePeriodDaysLeft: 0,
      amountDue: 0,
    };
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // Find all unpaid invoices
  const unpaidInvoices = db.prepare(`
    SELECT * FROM invoices
    WHERE shop_id = ? AND status IN ('PENDING', 'OVERDUE')
    ORDER BY grace_period_ends_at ASC
  `).all(shopId) as any[];

  if (!unpaidInvoices || unpaidInvoices.length === 0) {
    // If shop was previously marked OVERDUE due to invoices but all are now paid, restore to ACTIVE
    if (shop.status === 'OVERDUE') {
      db.prepare("UPDATE shops SET status = 'ACTIVE', updated_at = ? WHERE id = ?").run(nowIso, shopId);
      logAuditEvent({
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        shopId,
        action: 'SHOP_REACTIVATED',
        targetType: 'SHOP',
        targetId: shopId,
        before: { status: 'OVERDUE' },
        after: { status: 'ACTIVE' },
      });
    }
    return {
      shopStatus: 'ACTIVE',
      isPosSuspended: false,
      overdueInvoice: null,
      gracePeriodDaysLeft: null,
      amountDue: 0,
    };
  }

  let earliestGraceEnd: Date | null = null;
  let totalDue = 0;
  let hasExpiredInvoice = false;
  let worstInvoice: any = null;

  for (const inv of unpaidInvoices) {
    totalDue += inv.commission_due;
    const graceEnd = new Date(inv.grace_period_ends_at);
    if (!earliestGraceEnd || graceEnd < earliestGraceEnd) {
      earliestGraceEnd = graceEnd;
      worstInvoice = inv;
    }

    if (now > graceEnd) {
      hasExpiredInvoice = true;
      if (inv.status === 'PENDING') {
        db.prepare("UPDATE invoices SET status = 'OVERDUE', updated_at = ? WHERE id = ?").run(nowIso, inv.id);
      }
    }
  }

  totalDue = roundCurrency(totalDue);

  if (hasExpiredInvoice) {
    // Grace period has expired! POS ACCESS = SUSPENDED
    if (shop.status !== 'SUSPENDED' && shop.status !== 'OVERDUE') {
      db.prepare("UPDATE shops SET status = 'OVERDUE', updated_at = ? WHERE id = ?").run(nowIso, shopId);
      logAuditEvent({
        actorId: 'SYSTEM',
        actorRole: 'SYSTEM',
        shopId,
        action: 'SHOP_SUSPENDED',
        targetType: 'SHOP',
        targetId: shopId,
        before: { status: shop.status },
        after: { status: 'OVERDUE', reason: 'Unpaid commission beyond 7-day grace period' },
      });
    }

    return {
      shopStatus: 'OVERDUE',
      isPosSuspended: true,
      overdueInvoice: worstInvoice,
      gracePeriodDaysLeft: 0,
      amountDue: totalDue,
    };
  }

  // Grace period still active
  const diffMs = earliestGraceEnd ? earliestGraceEnd.getTime() - now.getTime() : 0;
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return {
    shopStatus: 'ACTIVE',
    isPosSuspended: false,
    overdueInvoice: worstInvoice,
    gracePeriodDaysLeft: daysLeft,
    amountDue: totalDue,
  };
}

/**
 * Generates monthly invoice for a shop.
 */
export function generateMonthlyInvoice(shopId: string, billingPeriod: string): any {
  // Check if invoice already exists for this period
  const existing = db.prepare('SELECT * FROM invoices WHERE shop_id = ? AND billing_period = ?').get(shopId, billingPeriod) as any;
  if (existing) {
    return existing;
  }

  // Calculate gross sales for that period
  // If period format is "YYYY-MM"
  const [year, month] = billingPeriod.split('-');
  const startDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0)).toISOString();
  const endDate = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59, 999)).toISOString();

  const { grossSales, commissionDue } = calculateShopGrossSales(shopId, startDate, endDate);

  const now = new Date();
  const nowIso = now.toISOString();
  const gracePeriodEnd = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const id = 'inv_' + crypto.randomUUID();

  db.prepare(`
    INSERT INTO invoices (
      id, shop_id, billing_period, gross_sales, commission_rate, commission_due,
      status, sent_at, grace_period_ends_at, paid_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, NULL, ?, ?)
  `).run(
    id,
    shopId,
    billingPeriod,
    grossSales,
    COMMISSION_RATE,
    commissionDue,
    nowIso,
    gracePeriodEnd,
    nowIso,
    nowIso
  );

  return db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
}
