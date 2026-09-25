import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import crypto from 'node:crypto';
import { requireTenantContext, requireModule, requirePermission } from '../services/tenantContext.js';

export const gymRouter = Router();

// Enterprise Security Hardening: All gym operations require authenticated tenant membership + GYM module entitlement
gymRouter.use(requireTenantContext);
gymRouter.use(requireModule('GYM'));

// 1. Overview stats
gymRouter.get('/overview', requirePermission('gym.member.read'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const todayStr = new Date().toISOString().split('T')[0];

  const totalMembers = (db.prepare("SELECT COUNT(id) as count FROM gym_members WHERE business_id = ? AND status = 'ACTIVE'").get(bizId) as any)?.count || 0;
  const activeMemberships = (db.prepare("SELECT COUNT(id) as count FROM gym_memberships WHERE business_id = ? AND status = 'ACTIVE'").get(bizId) as any)?.count || 0;
  const todayCheckins = (db.prepare('SELECT COUNT(id) as count FROM gym_attendance WHERE business_id = ?').get(bizId) as any)?.count || 0;
  const totalRevenue = (db.prepare('SELECT COALESCE(SUM(price_paid), 0) as total FROM gym_memberships WHERE business_id = ?').get(bizId) as any)?.total || 0;

  const recentAttendance = db.prepare(`
    SELECT * FROM gym_attendance WHERE business_id = ? ORDER BY rowid DESC LIMIT 8
  `).all(bizId);

  res.json({
    stats: {
      totalMembers,
      activeMemberships,
      todayCheckins,
      totalRevenue,
    },
    recentAttendance,
  });
});

// 2. Members list
gymRouter.get('/members', requirePermission('gym.member.read'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const q = (req.query.q as string || '').trim();

  let query = `
    SELECT 
      m.*,
      ms.id as membership_id,
      ms.plan_name,
      ms.start_date,
      ms.end_date,
      ms.status as membership_status,
      ms.freeze_status,
      ms.frozen_until
    FROM gym_members m
    LEFT JOIN gym_memberships ms ON ms.member_id = m.id AND ms.status = 'ACTIVE'
    WHERE m.business_id = ?
  `;
  const params: any[] = [bizId];

  if (q) {
    query += ' AND (m.name LIKE ? OR m.member_number LIKE ? OR m.phone LIKE ?)';
    const search = `%${q}%`;
    params.push(search, search, search);
  }

  query += ' ORDER BY m.created_at DESC';
  const members = db.prepare(query).all(...params);
  res.json({ members });
});

// 3. Register Member
gymRouter.post('/members', requirePermission('gym.member.write'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { name, phone, email, emergencyContact, trainerName, fitnessGoal, planId } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Member name and contact phone are required' });
  }

  const id = 'gmb_' + crypto.randomBytes(6).toString('hex');
  const count = (db.prepare('SELECT COUNT(id) as count FROM gym_members WHERE business_id = ?').get(bizId) as any)?.count || 0;
  const memberNumber = `APX-${200 + count + 1}`;
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];

  db.prepare(`
    INSERT INTO gym_members (id, business_id, member_number, name, phone, email, emergency_contact, status, join_date, trainer_name, fitness_goal, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)
  `).run(id, bizId, memberNumber, name, phone, email || null, emergencyContact || null, todayStr, trainerName || null, fitnessGoal || null, now);

  // If a plan is provided, activate membership right away
  if (planId) {
    const plan = db.prepare('SELECT * FROM gym_plans WHERE id = ? AND business_id = ?').get(planId, bizId) as any;
    if (plan) {
      const msId = 'gms_' + crypto.randomBytes(6).toString('hex');
      const endDate = new Date(Date.now() + plan.duration_months * 30 * 86400000).toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO gym_memberships (id, business_id, member_id, plan_id, plan_name, start_date, end_date, status, freeze_status, price_paid, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'NORMAL', ?, ?, ?)
      `).run(msId, bizId, id, plan.id, plan.name, todayStr, endDate, plan.price, now, now);
    }
  }

  res.status(201).json({
    success: true,
    member: { id, member_number: memberNumber, name, phone, status: 'ACTIVE' },
  });
});

// 4. Plans list
gymRouter.get('/plans', (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const plans = db.prepare('SELECT * FROM gym_plans WHERE business_id = ? ORDER BY price ASC').all(bizId);
  res.json({ plans });
});

// 5. Create Plan
gymRouter.post('/plans', requirePermission('gym.plans.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { name, description, durationMonths, price, benefits, freezeLimitDays } = req.body;

  if (!name || !durationMonths || price === undefined) {
    return res.status(400).json({ error: 'Plan name, duration (months), and price are required' });
  }

  const id = 'gpl_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO gym_plans (id, business_id, name, description, duration_months, price, benefits, freeze_limit_days, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
  `).run(id, bizId, name, description || null, durationMonths, price, benefits || null, freezeLimitDays || 14, now);

  res.status(201).json({ success: true, plan: { id, name, duration_months: durationMonths, price } });
});

// 6. Freeze Membership
gymRouter.post('/memberships/freeze', requirePermission('gym.member.write'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { membershipId, freezeDays } = req.body;

  if (!membershipId || !freezeDays || freezeDays <= 0) {
    return res.status(400).json({ error: 'Valid membership ID and freeze days (positive number) are required' });
  }

  const ms = db.prepare('SELECT * FROM gym_memberships WHERE id = ? AND business_id = ?').get(membershipId, bizId) as any;
  if (!ms) {
    return res.status(404).json({ error: 'Membership not found' });
  }

  const plan = db.prepare('SELECT * FROM gym_plans WHERE id = ?').get(ms.plan_id) as any;
  const maxFreeze = plan?.freeze_limit_days || 30;

  if (freezeDays > maxFreeze) {
    return res.status(400).json({
      error: `Requested freeze duration of ${freezeDays} days exceeds this plan's maximum freeze entitlement of ${maxFreeze} days.`,
    });
  }

  const now = new Date();
  const frozenUntil = new Date(now.getTime() + freezeDays * 86400000).toISOString().split('T')[0];

  // Extend the membership end date by the frozen days
  const currentEnd = new Date(ms.end_date);
  const newEnd = new Date(currentEnd.getTime() + freezeDays * 86400000).toISOString().split('T')[0];

  db.prepare(`
    UPDATE gym_memberships
    SET freeze_status = 'FROZEN', frozen_until = ?, end_date = ?, updated_at = ?
    WHERE id = ? AND business_id = ?
  `).run(frozenUntil, newEnd, now.toISOString(), membershipId, bizId);

  res.json({
    success: true,
    message: `Membership successfully frozen until ${frozenUntil}. Expiration extended to ${newEnd}.`,
    frozen_until: frozenUntil,
    new_end_date: newEnd,
  });
});

// 7. Renew Membership
gymRouter.post('/memberships/renew', requirePermission('gym.member.write'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { memberId, planId } = req.body;

  if (!memberId || !planId) {
    return res.status(400).json({ error: 'Member ID and Plan ID are required for renewal' });
  }

  const plan = db.prepare('SELECT * FROM gym_plans WHERE id = ? AND business_id = ?').get(planId, bizId) as any;
  if (!plan) {
    return res.status(404).json({ error: 'Membership plan not found' });
  }

  const now = new Date();
  const id = 'gms_' + crypto.randomBytes(6).toString('hex');
  const startDate = now.toISOString().split('T')[0];
  const endDate = new Date(now.getTime() + plan.duration_months * 30 * 86400000).toISOString().split('T')[0];

  // Deactivate old memberships
  db.prepare("UPDATE gym_memberships SET status = 'EXPIRED' WHERE member_id = ? AND business_id = ?").run(memberId, bizId);

  // Insert newly renewed membership
  db.prepare(`
    INSERT INTO gym_memberships (id, business_id, member_id, plan_id, plan_name, start_date, end_date, status, freeze_status, price_paid, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'NORMAL', ?, ?, ?)
  `).run(id, bizId, memberId, plan.id, plan.name, startDate, endDate, plan.price, now.toISOString(), now.toISOString());

  res.json({
    success: true,
    membership: { id, plan_name: plan.name, start_date: startDate, end_date: endDate, price_paid: plan.price },
  });
});

// 8. Member Attendance Check-in
gymRouter.post('/attendance/checkin', requirePermission('gym.attendance.manage'), (req: Request, res: Response) => {
  const bizId = req.tenantContext!.tenantId;
  const { memberId, workoutType, notes } = req.body;

  if (!memberId) {
    return res.status(400).json({ error: 'Member ID is required' });
  }

  const member = db.prepare('SELECT * FROM gym_members WHERE id = ? AND business_id = ?').get(memberId, bizId) as any;
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const id = 'att_' + crypto.randomBytes(6).toString('hex');

  db.prepare(`
    INSERT INTO gym_attendance (id, business_id, member_id, member_name, check_in_time, workout_type, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, bizId, member.id, member.name, timeStr, workoutType || 'GENERAL_WORKOUT', notes || null);

  res.json({
    success: true,
    checkin: { id, member_name: member.name, check_in_time: timeStr },
  });
});
