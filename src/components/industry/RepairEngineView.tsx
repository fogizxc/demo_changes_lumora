import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { RepairJob } from '../../types';
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Laptop,
  Cpu,
  Smartphone,
  DollarSign,
  User,
} from 'lucide-react';

interface RepairEngineViewProps {
  initialSubTab?: 'jobs' | 'diagnostics' | 'parts' | 'billing';
}

export const RepairEngineView: React.FC<RepairEngineViewProps> = ({ initialSubTab = 'jobs' }) => {
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState<RepairJob | null>(null);

  // Modals
  const [showJobModal, setShowJobModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newJob, setNewJob] = useState({
    customerName: '',
    customerPhone: '',
    deviceType: 'Smartphone',
    brand: 'Apple',
    model: 'iPhone 14 Pro',
    serialNumber: '',
    reportedFault: 'Cracked OLED screen and intermittent charging',
    technicianName: 'Sanjay Rawat',
    estimatedCost: 8500,
  });

  const [updateData, setUpdateData] = useState({
    status: 'DIAGNOSING',
    diagnosis: '',
    partsCost: 0,
    laborCost: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.repair.getJobs({
        status: statusFilter || undefined,
        q: searchQuery || undefined,
      });
      setJobs(res.jobs);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.repair.createJob(newJob);
      setSuccessMessage(`Job Card #${res.job.job_number} created successfully`);
      setShowJobModal(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create job card');
    }
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    try {
      await api.repair.updateJobStatus(selectedJob.id, updateData);
      setSuccessMessage(`Job #${selectedJob.job_number} updated to ${updateData.status}`);
      setSelectedJob(null);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update job');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Repair Lab & Diagnostics Engine</h1>
              <p className="text-xs text-neutral-500 font-medium">
                Device intake, technical diagnostics, parts & labor calculation, and job status pipelines
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowJobModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#68151F] text-white text-xs font-bold hover:bg-[#521118] transition shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Repair Job Card</span>
        </button>
      </div>

      {/* FEEDBACK BANNERS */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
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

      {/* FILTER CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {['', 'RECEIVED', 'DIAGNOSING', 'WAITING_APPROVAL', 'IN_REPAIR', 'READY', 'DELIVERED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {st || 'All Jobs'}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
          <input
            type="text"
            placeholder="Search job #, model, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs focus:ring-1 focus:ring-neutral-900 outline-hidden"
          />
        </div>
      </div>

      {/* JOBS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4 relative"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {job.job_number}
                </span>
                <h3 className="text-sm font-bold text-neutral-900 mt-1">
                  {job.brand} {job.model}
                </h3>
                <div className="text-xs text-neutral-400">{job.device_type}</div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  job.status === 'RECEIVED'
                    ? 'bg-neutral-100 text-neutral-700'
                    : job.status === 'DIAGNOSING'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : job.status === 'IN_REPAIR'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : job.status === 'READY'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-purple-50 text-purple-700'
                }`}
              >
                {job.status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              <div>
                <span className="text-neutral-400">Client:</span>{' '}
                <span className="font-semibold text-neutral-800">{job.customer_name}</span> ({job.customer_phone})
              </div>
              <div>
                <span className="text-neutral-400">Fault:</span>{' '}
                <span className="font-medium text-neutral-700">{job.reported_fault}</span>
              </div>
              {job.diagnosis && (
                <div className="text-blue-900 bg-blue-50/60 p-1.5 rounded text-[11px] font-medium mt-1">
                  Diagnosis: {job.diagnosis}
                </div>
              )}
            </div>

            <div className="flex items-baseline justify-between text-xs pt-1">
              <div>
                <span className="text-neutral-400">Parts: ₹{job.parts_cost}</span>
                <span className="mx-1 text-neutral-300">•</span>
                <span className="text-neutral-400">Labor: ₹{job.labor_cost}</span>
              </div>
              <div className="text-sm font-black text-neutral-900">
                Total: ₹{job.total_cost || job.estimated_cost}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedJob(job);
                setUpdateData({
                  status: job.status,
                  diagnosis: job.diagnosis || '',
                  partsCost: job.parts_cost || 0,
                  laborCost: job.labor_cost || 0,
                });
              }}
              className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Update Status & Diagnostics
            </button>
          </div>
        ))}
      </div>

      {/* MODAL: CREATE JOB CARD */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-neutral-900">New Repair Intake Job Card</h2>
            <form onSubmit={handleCreateJob} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newJob.customerName}
                    onChange={(e) => setNewJob({ ...newJob, customerName: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={newJob.customerPhone}
                    onChange={(e) => setNewJob({ ...newJob, customerPhone: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Device Type</label>
                  <input
                    type="text"
                    value={newJob.deviceType}
                    onChange={(e) => setNewJob({ ...newJob, deviceType: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Brand</label>
                  <input
                    type="text"
                    value={newJob.brand}
                    onChange={(e) => setNewJob({ ...newJob, brand: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Model</label>
                  <input
                    type="text"
                    value={newJob.model}
                    onChange={(e) => setNewJob({ ...newJob, model: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Reported Fault</label>
                <textarea
                  rows={2}
                  required
                  value={newJob.reportedFault}
                  onChange={(e) => setNewJob({ ...newJob, reportedFault: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Assigned Technician</label>
                  <input
                    type="text"
                    value={newJob.technicianName}
                    onChange={(e) => setNewJob({ ...newJob, technicianName: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Initial Estimate (₹)</label>
                  <input
                    type="number"
                    value={newJob.estimatedCost}
                    onChange={(e) => setNewJob({ ...newJob, estimatedCost: Number(e.target.value) })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJobModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#68151F] text-white rounded-xl font-bold hover:bg-[#521118]"
                >
                  Generate Job Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE JOB STATUS & DIAGNOSTICS */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-neutral-900">
              Update Job #{selectedJob.job_number}
            </h2>
            <form onSubmit={handleUpdateJob} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Status Progression</label>
                <select
                  value={updateData.status}
                  onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl font-bold"
                >
                  {['RECEIVED', 'DIAGNOSING', 'WAITING_APPROVAL', 'IN_REPAIR', 'READY', 'DELIVERED', 'CANCELLED'].map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Diagnostic Findings</label>
                <textarea
                  rows={2}
                  value={updateData.diagnosis}
                  onChange={(e) => setUpdateData({ ...updateData, diagnosis: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  placeholder="Technical findings & replaced components..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Parts Cost (₹)</label>
                  <input
                    type="number"
                    value={updateData.partsCost}
                    onChange={(e) => setUpdateData({ ...updateData, partsCost: Number(e.target.value) })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Labor Cost (₹)</label>
                  <input
                    type="number"
                    value={updateData.laborCost}
                    onChange={(e) => setUpdateData({ ...updateData, laborCost: Number(e.target.value) })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex justify-between font-black text-sm">
                <span>Total Bill Amount:</span>
                <span className="text-[#68151F]">₹{updateData.partsCost + updateData.laborCost}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
