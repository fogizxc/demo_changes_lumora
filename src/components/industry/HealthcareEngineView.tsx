import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { HealthcarePatient, HealthcareDoctor, Appointment, HealthcareConsultation } from '../../types';
import {
  HeartPulse,
  Users,
  Calendar,
  Stethoscope,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Activity,
  UserPlus,
  RefreshCw,
} from 'lucide-react';

interface HealthcareEngineViewProps {
  initialSubTab?: 'appointments' | 'patients' | 'doctors' | 'consultations';
}

export const HealthcareEngineView: React.FC<HealthcareEngineViewProps> = ({ initialSubTab = 'appointments' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'appointments' | 'patients' | 'doctors' | 'consultations'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [patients, setPatients] = useState<HealthcarePatient[]>([]);
  const [doctors, setDoctors] = useState<HealthcareDoctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<HealthcareConsultation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [newPatient, setNewPatient] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'FEMALE' as const,
    bloodGroup: 'B+',
    allergies: '',
    medicalHistory: '',
  });

  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialization: 'Cardiologist',
    department: 'Cardiology',
    consultationFee: 750,
    phone: '',
    email: '',
    availableDays: 'Mon,Wed,Fri',
  });

  const [newAppointment, setNewAppointment] = useState({
    customerName: '',
    customerPhone: '',
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '10:30',
    serviceName: 'Specialist Consultation',
    fee: 750,
    notes: '',
  });

  const [newConsultation, setNewConsultation] = useState({
    patientId: '',
    doctorId: '',
    appointmentId: '',
    visitDate: new Date().toISOString().split('T')[0],
    diagnosis: '',
    symptoms: '',
    bp: '120/80',
    hr: '72',
    spo2: '98%',
    temp: '98.6 F',
    doctorNotes: '',
    medicine: '',
    dosage: '1 tablet twice daily',
    duration: '5 days',
    labTest: '',
    fee: 750,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, patientsRes, doctorsRes, apptRes, consultRes] = await Promise.all([
        api.healthcare.getOverview(),
        api.healthcare.getPatients(searchQuery),
        api.healthcare.getDoctors(),
        api.healthcare.getAppointments(),
        api.healthcare.getConsultations(),
      ]);

      setStats(overviewRes.stats);
      setPatients(patientsRes.patients);
      setDoctors(doctorsRes.doctors);
      setAppointments(apptRes.appointments);
      setConsultations(consultRes.consultations);

      if (doctorsRes.doctors.length > 0 && !newAppointment.doctorId) {
        setNewAppointment((prev) => ({
          ...prev,
          doctorId: doctorsRes.doctors[0].id,
          fee: doctorsRes.doctors[0].consultation_fee,
        }));
      }
      if (patientsRes.patients.length > 0 && !newConsultation.patientId) {
        setNewConsultation((prev) => ({ ...prev, patientId: patientsRes.patients[0].id }));
      }
      if (doctorsRes.doctors.length > 0 && !newConsultation.doctorId) {
        setNewConsultation((prev) => ({ ...prev, doctorId: doctorsRes.doctors[0].id }));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const res = await api.healthcare.createPatient(newPatient);
      setSuccessMessage(`Patient ${res.patient.name} registered successfully (${res.patient.patient_number})`);
      setShowPatientModal(false);
      setNewPatient({ name: '', phone: '', email: '', gender: 'FEMALE', bloodGroup: 'B+', allergies: '', medicalHistory: '' });
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register patient');
    }
  };

  const handleRegisterDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await api.healthcare.createDoctor(newDoctor);
      setSuccessMessage(`Dr. ${newDoctor.name} added to roster`);
      setShowDoctorModal(false);
      setNewDoctor({ name: '', specialization: 'Physician', department: 'General', consultationFee: 500, phone: '', email: '', availableDays: 'Mon,Tue,Wed' });
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add doctor');
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const res = await api.healthcare.bookAppointment(newAppointment);
      setSuccessMessage(`Appointment booked for ${res.appointment.customer_name} on ${res.appointment.date} at ${res.appointment.start_time}`);
      setShowAppointmentModal(false);
      loadData();
    } catch (err: any) {
      // Highlights the double-booking prevention error
      setErrorMessage(err.message || 'Booking conflict detected');
    }
  };

  const handleRecordConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await api.healthcare.recordConsultation({
        patientId: newConsultation.patientId,
        doctorId: newConsultation.doctorId,
        appointmentId: newConsultation.appointmentId || undefined,
        visitDate: newConsultation.visitDate,
        diagnosis: newConsultation.diagnosis,
        symptoms: newConsultation.symptoms,
        vitalSigns: {
          bp: newConsultation.bp,
          hr: newConsultation.hr,
          spo2: newConsultation.spo2,
          temp: newConsultation.temp,
        },
        prescriptions: newConsultation.medicine
          ? [{ medicine: newConsultation.medicine, dosage: newConsultation.dosage, frequency: 'BD', duration: newConsultation.duration }]
          : [],
        labTests: newConsultation.labTest ? [newConsultation.labTest] : [],
        doctorNotes: newConsultation.doctorNotes,
        fee: newConsultation.fee,
      });
      setSuccessMessage('Clinical consultation & medical record recorded successfully');
      setShowConsultationModal(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record consultation');
    }
  };

  const handleUpdateApptStatus = async (id: string, status: string) => {
    try {
      await api.healthcare.updateAppointmentStatus(id, { status });
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Healthcare & Clinic Engine</h1>
              <p className="text-xs text-neutral-500 font-medium">
                Patient EHR, doctor scheduling with clash guard, and clinical consultations
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAppointmentModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#68151F] text-white text-xs font-bold hover:bg-[#521118] transition shadow-xs cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Book Consultation</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPatientModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Patient</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDoctorModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition cursor-pointer"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Add Doctor</span>
          </button>
          <button
            type="button"
            onClick={() => setShowConsultationModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition shadow-xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Record Visit (EHR)</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Error:</span> {errorMessage}
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 font-bold">✕</button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">{successMessage}</div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Registered Patients</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900">{stats.totalPatients || patients.length}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Active health profiles</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Active Doctors</span>
            <Stethoscope className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900">{stats.totalDoctors || doctors.length}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Multi-specialty physicians</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Today's Visits</span>
            <Calendar className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900">{stats.todayAppointments || appointments.length}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">No double-booking conflicts</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Consultation Revenue</span>
            <Activity className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-[#68151F]">₹{(stats.totalConsultationRevenue || 0).toLocaleString()}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">From clinical visits</div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-neutral-200 gap-6">
        {[
          { id: 'appointments', label: `Appointments (${appointments.length})`, icon: Calendar },
          { id: 'patients', label: `Patients Directory (${patients.length})`, icon: Users },
          { id: 'doctors', label: `Doctors & Specialists (${doctors.length})`, icon: Stethoscope },
          { id: 'consultations', label: `Clinical Records / EHR (${consultations.length})`, icon: FileText },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveSubTab(t.id as any)}
              className={`flex items-center space-x-2 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                isActive ? 'border-[#68151F] text-[#68151F]' : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: APPOINTMENTS WITH DOUBLE-BOOKING SHIELD */}
      {activeSubTab === 'appointments' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-neutral-500" />
              <span className="text-xs font-bold text-neutral-700">Scheduled Consultations with Double-Booking Guard</span>
            </div>
            <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Conflict Shield Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-50/80 text-neutral-500 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Doctor / Specialty</th>
                  <th className="py-3.5 px-4">Date & Slot</th>
                  <th className="py-3.5 px-4">Service</th>
                  <th className="py-3.5 px-4">Fee</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-neutral-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900">{apt.customer_name}</div>
                      {apt.customer_phone && <div className="text-[11px] text-neutral-400">{apt.customer_phone}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-800">{apt.resource_name}</div>
                      <div className="text-[11px] text-neutral-400">Doctor ID: {apt.resource_id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-800">{apt.date}</div>
                      <div className="text-[11px] text-neutral-500 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>{apt.start_time} - {apt.end_time}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-neutral-600">{apt.service_name}</td>
                    <td className="py-3.5 px-4 font-bold text-neutral-900">₹{apt.fee}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          apt.status === 'CONFIRMED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : apt.status === 'IN_PROGRESS'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : apt.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {apt.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      {apt.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateApptStatus(apt.id, 'IN_PROGRESS')}
                          className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[10px] font-bold transition"
                        >
                          Start Visit
                        </button>
                      )}
                      {apt.status === 'IN_PROGRESS' && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewConsultation((prev) => ({
                              ...prev,
                              appointmentId: apt.id,
                              doctorId: apt.resource_id,
                            }));
                            setShowConsultationModal(true);
                          }}
                          className="px-2 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-[10px] font-bold transition"
                        >
                          Complete & Record EHR
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PATIENTS DIRECTORY */}
      {activeSubTab === 'patients' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                placeholder="Search patient name, ID, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs focus:ring-1 focus:ring-neutral-900 outline-hidden"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPatientModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Patient</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                      {p.patient_number}
                    </span>
                    <h3 className="text-sm font-bold text-neutral-900 mt-1">{p.name}</h3>
                  </div>
                  <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                    {p.blood_group || 'N/A'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-neutral-600">
                  <div><span className="text-neutral-400 font-medium">Contact:</span> {p.phone}</div>
                  {p.email && <div><span className="text-neutral-400 font-medium">Email:</span> {p.email}</div>}
                  {p.allergies && (
                    <div className="text-amber-700 bg-amber-50/80 p-2 rounded-lg text-[11px] font-medium border border-amber-200/60">
                      ⚠️ Allergy: {p.allergies}
                    </div>
                  )}
                  {p.medical_history && (
                    <div className="text-neutral-600 bg-neutral-50 p-2 rounded-lg text-[11px] border border-neutral-200/50">
                      History: {p.medical_history}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">{p.gender}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewAppointment((prev) => ({ ...prev, customerName: p.name, customerPhone: p.phone }));
                      setShowAppointmentModal(true);
                    }}
                    className="text-xs font-bold text-[#68151F] hover:underline cursor-pointer"
                  >
                    Book Slot →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DOCTORS DIRECTORY */}
      {activeSubTab === 'doctors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc) => (
            <div key={doc.id} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#68151F]/10 text-[#68151F] flex items-center justify-center font-bold text-sm">
                  Dr
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm">Dr. {doc.name}</h3>
                  <div className="text-xs text-rose-700 font-semibold">{doc.specialization}</div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Department:</span>
                  <span className="font-semibold text-neutral-800">{doc.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Consultation Fee:</span>
                  <span className="font-bold text-neutral-900">₹{doc.consultation_fee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Available Days:</span>
                  <span className="font-medium text-neutral-700">{doc.available_days}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNewAppointment((prev) => ({ ...prev, doctorId: doc.id, fee: doc.consultation_fee }));
                  setShowAppointmentModal(true);
                }}
                className="w-full py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition"
              >
                Schedule with Dr. {doc.name.split(' ')[0]}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: CLINICAL RECORDS / EHR */}
      {activeSubTab === 'consultations' && (
        <div className="space-y-4">
          {consultations.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-neutral-900">{c.patient_name}</span>
                    <span className="text-[10px] font-bold bg-neutral-100 px-2 py-0.5 rounded text-neutral-600">
                      {c.patient_number}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Attending: Dr. {c.doctor_name} ({c.specialization}) • {c.visit_date}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                    Fee: ₹{c.fee} (Paid)
                  </div>
                </div>
              </div>

              {/* VITALS BADGES */}
              {c.vital_signs && Object.keys(c.vital_signs).length > 0 && (
                <div className="grid grid-cols-4 gap-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100 text-center">
                  <div>
                    <div className="text-[10px] text-neutral-400">BP</div>
                    <div className="text-xs font-bold text-neutral-800">{c.vital_signs.bp || '120/80'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-400">Heart Rate</div>
                    <div className="text-xs font-bold text-neutral-800">{c.vital_signs.hr || '72'} bpm</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-400">SpO2</div>
                    <div className="text-xs font-bold text-neutral-800">{c.vital_signs.spo2 || '99%'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-400">Temperature</div>
                    <div className="text-xs font-bold text-neutral-800">{c.vital_signs.temp || '98.6 F'}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-bold text-neutral-700 mb-1">Clinical Diagnosis & Symptoms</div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-neutral-800">
                    <p className="font-semibold text-rose-900">{c.diagnosis}</p>
                    {c.symptoms && <p className="text-neutral-500 text-[11px] mt-1">{c.symptoms}</p>}
                  </div>
                </div>

                <div>
                  <div className="font-bold text-neutral-700 mb-1">Prescriptions & Rx</div>
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-neutral-800 space-y-1">
                    {c.prescriptions && c.prescriptions.length > 0 ? (
                      c.prescriptions.map((rx, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-neutral-900">{rx.medicine}</span>
                          <span className="text-neutral-500">{rx.dosage} ({rx.duration})</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-neutral-400 text-[11px]">No medication prescribed</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: REGISTER PATIENT */}
      {showPatientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-neutral-900">Register New Patient</h2>
            <form onSubmit={handleRegisterPatient} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suman Mehra"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Blood Group</label>
                  <select
                    value={newPatient.bloodGroup}
                    onChange={(e) => setNewPatient({ ...newPatient, bloodGroup: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Allergies (if any)</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa drugs"
                  value={newPatient.allergies}
                  onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Prior Medical History</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Hypertension, Type 2 Diabetes"
                  value={newPatient.medicalHistory}
                  onChange={(e) => setNewPatient({ ...newPatient, medicalHistory: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPatientModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800"
                >
                  Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD DOCTOR */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-neutral-900">Add Doctor / Specialist</h2>
            <form onSubmit={handleRegisterDoctor} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Doctor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Kothari"
                  value={newDoctor.name}
                  onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Specialization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Orthopedic Surgeon"
                    value={newDoctor.specialization}
                    onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    required
                    value={newDoctor.consultationFee}
                    onChange={(e) => setNewDoctor({ ...newDoctor, consultationFee: Number(e.target.value) })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Available Days</label>
                <input
                  type="text"
                  placeholder="e.g. Mon,Tue,Thu,Sat"
                  value={newDoctor.availableDays}
                  onChange={(e) => setNewDoctor({ ...newDoctor, availableDays: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDoctorModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#68151F] text-white rounded-xl font-bold hover:bg-[#521118]"
                >
                  Save Doctor Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BOOK APPOINTMENT WITH DOUBLE-BOOKING CHECK */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Book Patient Consultation</h2>
              <p className="text-xs text-neutral-500">Strict clash-prevention engine protects doctors from overlapping bookings.</p>
            </div>
            <form onSubmit={handleBookAppointment} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Select Doctor</label>
                <select
                  value={newAppointment.doctorId}
                  onChange={(e) => {
                    const doc = doctors.find((d) => d.id === e.target.value);
                    setNewAppointment({
                      ...newAppointment,
                      doctorId: e.target.value,
                      fee: doc?.consultation_fee || newAppointment.fee,
                    });
                  }}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl font-medium"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.name} ({d.specialization}) - ₹{d.consultation_fee}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Patient Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Patient full name"
                    value={newAppointment.customerName}
                    onChange={(e) => setNewAppointment({ ...newAppointment, customerName: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Patient Phone</label>
                  <input
                    type="text"
                    placeholder="Contact number"
                    value={newAppointment.customerPhone}
                    onChange={(e) => setNewAppointment({ ...newAppointment, customerPhone: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newAppointment.startTime}
                    onChange={(e) => setNewAppointment({ ...newAppointment, startTime: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={newAppointment.endTime}
                    onChange={(e) => setNewAppointment({ ...newAppointment, endTime: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAppointmentModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#68151F] text-white rounded-xl font-bold hover:bg-[#521118]"
                >
                  Confirm Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD VISIT (EHR) */}
      {showConsultationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <h2 className="text-base font-bold text-neutral-900">Record Medical Visit & EHR Consultation</h2>
            <form onSubmit={handleRecordConsultation} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Patient</label>
                  <select
                    value={newConsultation.patientId}
                    onChange={(e) => setNewConsultation({ ...newConsultation, patientId: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.patient_number})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Attending Doctor</label>
                  <select
                    value={newConsultation.doctorId}
                    onChange={(e) => setNewConsultation({ ...newConsultation, doctorId: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  >
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Diagnosis</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Bronchitis"
                  value={newConsultation.diagnosis}
                  onChange={(e) => setNewConsultation({ ...newConsultation, diagnosis: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-neutral-500 text-[10px]">Blood Pressure</label>
                  <input
                    type="text"
                    value={newConsultation.bp}
                    onChange={(e) => setNewConsultation({ ...newConsultation, bp: e.target.value })}
                    className="w-full p-1.5 border rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 text-[10px]">Heart Rate</label>
                  <input
                    type="text"
                    value={newConsultation.hr}
                    onChange={(e) => setNewConsultation({ ...newConsultation, hr: e.target.value })}
                    className="w-full p-1.5 border rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 text-[10px]">SpO2</label>
                  <input
                    type="text"
                    value={newConsultation.spo2}
                    onChange={(e) => setNewConsultation({ ...newConsultation, spo2: e.target.value })}
                    className="w-full p-1.5 border rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="block text-neutral-500 text-[10px]">Temperature</label>
                  <input
                    type="text"
                    value={newConsultation.temp}
                    onChange={(e) => setNewConsultation({ ...newConsultation, temp: e.target.value })}
                    className="w-full p-1.5 border rounded-lg text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Prescription Medicine</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Azithromycin 500mg"
                    value={newConsultation.medicine}
                    onChange={(e) => setNewConsultation({ ...newConsultation, medicine: e.target.value })}
                    className="p-2 border rounded-xl"
                  />
                  <input
                    type="text"
                    placeholder="Dosage (e.g. OD after meal)"
                    value={newConsultation.dosage}
                    onChange={(e) => setNewConsultation({ ...newConsultation, dosage: e.target.value })}
                    className="p-2 border rounded-xl"
                  />
                  <input
                    type="text"
                    placeholder="Duration (e.g. 5 days)"
                    value={newConsultation.duration}
                    onChange={(e) => setNewConsultation({ ...newConsultation, duration: e.target.value })}
                    className="p-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConsultationModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800"
                >
                  Save Clinical Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
