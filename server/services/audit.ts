import crypto from 'node:crypto';
import { db } from '../db.js';

export interface AuditParams {
  actorId: string;
  actorRole: string;
  shopId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  before?: any;
  after?: any;
}

// Sanitizes any sensitive fields such as passwords, tokens, pins, or hashes
function sanitizePayload(data: any): string | null {
  if (data === undefined || data === null) return null;
  try {
    const copy = JSON.parse(JSON.stringify(data));
    const removeKeys = ['password', 'password_hash', 'pin', 'token', 'authentication_reference', 'secret'];
    
    function recurse(obj: any) {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (removeKeys.some(k => key.toLowerCase().includes(k))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          recurse(obj[key]);
        }
      }
    }
    recurse(copy);
    return JSON.stringify(copy);
  } catch {
    return String(data);
  }
}

export function logAuditEvent(params: AuditParams) {
  try {
    const id = 'aud_' + crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const beforeStr = sanitizePayload(params.before);
    const afterStr = sanitizePayload(params.after);

    db.prepare(`
      INSERT INTO audit_log (id, actor_id, actor_role, shop_id, action, target_type, target_id, before, after, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      params.actorId,
      params.actorRole,
      params.shopId || null,
      params.action,
      params.targetType,
      params.targetId,
      beforeStr,
      afterStr,
      timestamp
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export function logImpersonationEvent(params: {
  superAdminId: string;
  targetShopAdminId: string;
  shopId: string;
  action: 'START' | 'END';
  impersonationId?: string;
  actionDetail?: string;
}): string {
  const now = new Date().toISOString();
  if (params.action === 'START') {
    const id = 'imp_' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO impersonation_log (id, super_admin_id, target_shop_admin_id, shop_id, start_time, end_time, actions)
      VALUES (?, ?, ?, ?, ?, NULL, ?)
    `).run(id, params.superAdminId, params.targetShopAdminId, params.shopId, now, JSON.stringify(['Session Started']));
    return id;
  } else if (params.impersonationId) {
    db.prepare(`
      UPDATE impersonation_log
      SET end_time = ?
      WHERE id = ?
    `).run(now, params.impersonationId);
    return params.impersonationId;
  }
  return '';
}
