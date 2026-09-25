import crypto from 'node:crypto';
import { db } from '../db.js';

export type SecuritySeverity = 'INFO' | 'WARN' | 'HIGH' | 'CRITICAL';

export interface SecurityEventParams {
  eventType: string;
  severity: SecuritySeverity;
  actorId?: string;
  tenantId?: string;
  ipAddress?: string;
  details?: Record<string, any>;
}

/**
 * Record an immutable security event into security_events table
 */
export function recordSecurityEvent(params: SecurityEventParams): string {
  const eventId = 'sec_' + crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // Strip sensitive tokens/passwords from details
  let cleanDetails: any = null;
  if (params.details) {
    cleanDetails = { ...params.details };
    delete cleanDetails.password;
    delete cleanDetails.password_hash;
    delete cleanDetails.pin;
    delete cleanDetails.token;
    delete cleanDetails.authorization;
  }

  try {
    db.prepare(`
      INSERT INTO security_events (id, event_type, severity, actor_id, tenant_id, ip_address, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      eventId,
      params.eventType,
      params.severity,
      params.actorId || null,
      params.tenantId || null,
      params.ipAddress || null,
      cleanDetails ? JSON.stringify(cleanDetails) : null,
      timestamp
    );
  } catch (err) {
    console.error('Failed to log security event:', err);
  }

  return eventId;
}

/**
 * Universal Rate Limiter & Account Lockout Tracker
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  lockoutSeconds: number = 900 // 15 minutes default
): { allowed: boolean; remainingAttempts: number; lockedUntil?: string; lockMinutesRemaining?: number } {
  const now = new Date();
  const row = db.prepare('SELECT * FROM auth_rate_limits WHERE key = ?').get(key) as any;

  if (!row) {
    return { allowed: true, remainingAttempts: maxAttempts };
  }

  if (row.locked_until) {
    const lockedUntilDate = new Date(row.locked_until);
    if (lockedUntilDate > now) {
      const remainingMs = lockedUntilDate.getTime() - now.getTime();
      const lockMinutesRemaining = Math.max(1, Math.ceil(remainingMs / (1000 * 60)));
      return {
        allowed: false,
        remainingAttempts: 0,
        lockedUntil: row.locked_until,
        lockMinutesRemaining,
      };
    } else {
      // Lock expired, reset attempts
      db.prepare('DELETE FROM auth_rate_limits WHERE key = ?').run(key);
      return { allowed: true, remainingAttempts: maxAttempts };
    }
  }

  const remaining = Math.max(0, maxAttempts - (row.attempts || 0));
  return { allowed: remaining > 0, remainingAttempts: remaining };
}

/**
 * Increment failed attempts; automatically lock if threshold reached
 */
export function recordFailedAttempt(
  key: string,
  maxAttempts: number = 5,
  lockoutSeconds: number = 900 // 15 minutes default
): { locked: boolean; attempts: number; lockedUntil?: string; lockMinutesRemaining?: number } {
  const now = new Date();
  const nowIso = now.toISOString();

  const existing = db.prepare('SELECT * FROM auth_rate_limits WHERE key = ?').get(key) as any;
  const currentAttempts = (existing?.attempts || 0) + 1;

  if (currentAttempts >= maxAttempts) {
    const lockedUntil = new Date(now.getTime() + lockoutSeconds * 1000).toISOString();
    db.prepare(`
      INSERT INTO auth_rate_limits (key, attempts, locked_until, last_attempt_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        attempts = excluded.attempts,
        locked_until = excluded.locked_until,
        last_attempt_at = excluded.last_attempt_at
    `).run(key, currentAttempts, lockedUntil, nowIso);

    recordSecurityEvent({
      eventType: 'ACCOUNT_OR_IP_LOCKED',
      severity: 'HIGH',
      details: { key, attempts: currentAttempts, lockedUntil, lockoutSeconds },
    });

    return {
      locked: true,
      attempts: currentAttempts,
      lockedUntil,
      lockMinutesRemaining: Math.ceil(lockoutSeconds / 60),
    };
  }

  db.prepare(`
    INSERT INTO auth_rate_limits (key, attempts, locked_until, last_attempt_at)
    VALUES (?, ?, NULL, ?)
    ON CONFLICT(key) DO UPDATE SET
      attempts = excluded.attempts,
      last_attempt_at = excluded.last_attempt_at
  `).run(key, currentAttempts, nowIso);

  return {
    locked: false,
    attempts: currentAttempts,
  };
}

/**
 * Reset rate limit counter upon successful authentication
 */
export function resetRateLimit(key: string): void {
  try {
    db.prepare('DELETE FROM auth_rate_limits WHERE key = ?').run(key);
  } catch (err) {
    console.error('Error resetting rate limit:', err);
  }
}
