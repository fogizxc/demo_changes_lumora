import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import crypto from 'node:crypto';
import { getActiveBusinessId } from './tenants.js';

export const healthcareRouter = Router();

// 1. Overview stats
healthcareRouter.get('/overview', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const todayStr = new Date().toISOString().split('T')[0];

  const totalPatients = (db.prepare('SELECT COUNT(id) as count FROM healthcare_patients WHERE business_id = ?').get(bizId) as any)?.count || 0;
  const totalDoctors = (db.prepare("SELECT COUNT(id) as count FROM healthcare_doctors WHERE business_id = ? AND status = 'ACTIVE'").get(bizId) as any)?.count || 0;
  
  const todayAppointments = (db.prepare(`
    SELECT COUNT(id) as count FROM appointments
    WHERE business_id = ? AND date = ?
  `).get(bizId, todayStr) as any)?.count || 0;

  const totalConsultationRevenue = (db.prepare(`
    SELECT COALESCE(SUM(fee), 0) as total FROM healthcare_consultations
    WHERE business_id = ?
  `).get(bizId) as any)?.total || 0;

  const upcomingAppointments = db.prepare(`
    SELECT * FROM appointments
    WHERE business_id = ? AND date >= ?
    ORDER BY date ASC, start_time ASC
    LIMIT 6
  `).all(bizId, todayStr);

  res.json({
    stats: {
      totalPatients,
      totalDoctors,
      todayAppointments,
      totalConsultationRevenue,
    },
    upcomingAppointments,
  });
});

// 2. Patients list & search
healthcareRouter.get('/patients', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const q = (req.query.q as string || '').trim();

  let query = 'SELECT * FROM healthcare_patients WHERE business_id = ?';
  const params: any[] = [bizId];

  if (q) {
    query += ' AND (name LIKE ? OR patient_number LIKE ? OR phone LIKE ?)';
    const search = `%${q}%`;
    params.push(search, search, search);
  }

  query += ' ORDER BY created_at DESC';
  const patients = db.prepare(query).all(...params);
  res.json({ patients });
});

// 3. Register patient
healthcareRouter.post('/patients', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const { name, dateOfBirth, gender, bloodGroup, phone, email, address, emergencyContact, medicalHistory, allergies } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Patient name and contact phone are required' });
  }

  const id = 'pt_' + crypto.randomBytes(6).toString('hex');
  const count = (db.prepare('SELECT COUNT(id) as count FROM healthcare_patients WHERE business_id = ?').get(bizId) as any)?.count || 0;
  const patientNumber = `PT-${1000 + count + 1}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO healthcare_patients (
      id, business_id, patient_number, name, date_of_birth, gender, blood_group,
      phone, email, address, emergency_contact, medical_history, allergies, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `).run(
    id, bizId, patientNumber, name, dateOfBirth || null, gender || 'OTHER', bloodGroup || null,
    phone, email || null, address || null, emergencyContact || null, medicalHistory || null, allergies || null, now, now
  );

  res.status(201).json({
    success: true,
    patient: {
      id,
      patient_number: patientNumber,
      name,
      phone,
      blood_group: bloodGroup,
      status: 'ACTIVE',
    },
  });
});

// 4. Doctors list
healthcareRouter.get('/doctors', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const doctors = db.prepare('SELECT * FROM healthcare_doctors WHERE business_id = ? ORDER BY name ASC').all(bizId);
  res.json({ doctors });
});

// 5. Add doctor
healthcareRouter.post('/doctors', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const { name, specialization, department, qualification, licenseNumber, consultationFee, phone, email, availableDays } = req.body;

  if (!name || !specialization) {
    return res.status(400).json({ error: 'Doctor name and specialization are required' });
  }

  const id = 'doc_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO healthcare_doctors (
      id, business_id, name, specialization, department, qualification, license_number,
      consultation_fee, phone, email, status, available_days, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `).run(
    id, bizId, name, specialization, department || 'General Medicine', qualification || 'MBBS',
    licenseNumber || 'REG-PENDING', consultationFee || 500, phone || null, email || null, availableDays || 'Mon,Tue,Wed,Thu,Fri', now
  );

  res.status(201).json({ success: true, doctor: { id, name, specialization, consultation_fee: consultationFee } });
});

// 6. Appointments list
healthcareRouter.get('/appointments', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const date = req.query.date as string;

  let query = 'SELECT * FROM appointments WHERE business_id = ?';
  const params: any[] = [bizId];

  if (date) {
    query += ' AND date = ?';
    params.push(date);
  }

  query += ' ORDER BY date DESC, start_time ASC';
  const appointments = db.prepare(query).all(...params);
  res.json({ appointments });
});

// 7. Book appointment with DOUBLE-BOOKING PREVENTION
healthcareRouter.post('/appointments', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const { customerId, customerName, customerPhone, doctorId, serviceName, date, startTime, endTime, fee, notes } = req.body;

  if (!customerName || !doctorId || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'Patient name, doctor, date, start time, and end time are required' });
  }

  const doctor = db.prepare('SELECT * FROM healthcare_doctors WHERE id = ? AND business_id = ?').get(doctorId, bizId) as any;
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found in this healthcare organization' });
  }

  // STRICT DOUBLE-BOOKING DETECTION:
  // Check if this doctor already has an active appointment on the same date with overlapping time
  const conflict = db.prepare(`
    SELECT * FROM appointments
    WHERE business_id = ? AND resource_id = ? AND date = ?
      AND status NOT IN ('CANCELLED', 'NO_SHOW')
      AND (
        (start_time < ? AND end_time > ?) OR
        (start_time >= ? AND start_time < ?) OR
        (end_time > ? AND end_time <= ?)
      )
  `).get(bizId, doctorId, date, endTime, startTime, startTime, endTime, startTime, endTime) as any;

  if (conflict) {
    return res.status(409).json({
      error: `Double Booking Conflict: Dr. ${doctor.name} is already booked on ${date} from ${conflict.start_time} to ${conflict.end_time} for patient ${conflict.customer_name}. Please choose another slot.`,
      conflictAppointment: conflict,
    });
  }

  const id = 'apt_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const consultFee = fee ?? doctor.consultation_fee ?? 500;

  db.prepare(`
    INSERT INTO appointments (
      id, business_id, customer_id, customer_name, customer_phone, service_id,
      service_name, resource_id, resource_name, resource_type, date, start_time, end_time,
      status, payment_status, fee, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DOCTOR', ?, ?, ?, 'CONFIRMED', 'PENDING', ?, ?, ?, ?)
  `).run(
    id, bizId, customerId || null, customerName, customerPhone || null, 'srv_consult',
    serviceName || `${doctor.specialization} Consultation`, doctor.id, doctor.name,
    date, startTime, endTime, consultFee, notes || null, now, now
  );

  res.status(201).json({
    success: true,
    appointment: {
      id,
      customer_name: customerName,
      doctor_name: doctor.name,
      date,
      start_time: startTime,
      end_time: endTime,
      fee: consultFee,
      status: 'CONFIRMED',
    },
  });
});

// 8. Update appointment status
healthcareRouter.post('/appointments/:id/status', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const { id } = req.params;
  const { status, paymentStatus } = req.body;

  const validStatuses = ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const now = new Date().toISOString();
  let query = 'UPDATE appointments SET updated_at = ?';
  const params: any[] = [now];

  if (status) {
    query += ', status = ?';
    params.push(status);
  }
  if (paymentStatus) {
    query += ', payment_status = ?';
    params.push(paymentStatus);
  }

  query += ' WHERE id = ? AND business_id = ?';
  params.push(id, bizId);

  const result = db.prepare(query).run(...params);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  res.json({ success: true, id, status, paymentStatus });
});

// 9. Consultations & Medical Records (EHR)
healthcareRouter.get('/consultations', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const patientId = req.query.patientId as string;

  let query = `
    SELECT 
      c.*,
      p.name as patient_name,
      p.patient_number,
      d.name as doctor_name,
      d.specialization
    FROM healthcare_consultations c
    JOIN healthcare_patients p ON p.id = c.patient_id
    JOIN healthcare_doctors d ON d.id = c.doctor_id
    WHERE c.business_id = ?
  `;
  const params: any[] = [bizId];

  if (patientId) {
    query += ' AND c.patient_id = ?';
    params.push(patientId);
  }

  query += ' ORDER BY c.visit_date DESC, c.created_at DESC';
  const consultations = db.prepare(query).all(...params).map((c: any) => ({
    ...c,
    vital_signs: JSON.parse(c.vital_signs || '{}'),
    prescriptions: JSON.parse(c.prescriptions || '[]'),
    lab_tests: JSON.parse(c.lab_tests || '[]'),
  }));

  res.json({ consultations });
});

// 10. Record Clinical Consultation
healthcareRouter.post('/consultations', (req: Request, res: Response) => {
  const bizId = getActiveBusinessId(req);
  const {
    appointmentId,
    patientId,
    doctorId,
    visitDate,
    symptoms,
    diagnosis,
    vitalSigns,
    prescriptions,
    labTests,
    doctorNotes,
    followUpDate,
    fee,
  } = req.body;

  if (!patientId || !doctorId || !diagnosis) {
    return res.status(400).json({ error: 'Patient, Doctor, and Diagnosis are required' });
  }

  const id = 'con_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const date = visitDate || now.split('T')[0];

  db.prepare(`
    INSERT INTO healthcare_consultations (
      id, business_id, appointment_id, patient_id, doctor_id, visit_date,
      symptoms, diagnosis, vital_signs, prescriptions, lab_tests, doctor_notes,
      follow_up_date, fee, payment_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?)
  `).run(
    id, bizId, appointmentId || null, patientId, doctorId, date,
    symptoms || null, diagnosis,
    JSON.stringify(vitalSigns || {}),
    JSON.stringify(prescriptions || []),
    JSON.stringify(labTests || []),
    doctorNotes || null,
    followUpDate || null,
    fee || 500.00,
    now
  );

  // If linked to an appointment, mark it completed
  if (appointmentId) {
    db.prepare(`
      UPDATE appointments
      SET status = 'COMPLETED', payment_status = 'PAID', updated_at = ?
      WHERE id = ? AND business_id = ?
    `).run(now, appointmentId, bizId);
  }

  res.status(201).json({
    success: true,
    consultation: {
      id,
      patient_id: patientId,
      diagnosis,
      visit_date: date,
    },
  });
});
