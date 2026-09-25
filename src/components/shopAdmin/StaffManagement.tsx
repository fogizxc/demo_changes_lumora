import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { Employee } from '../../types';
import { Plus, UserPlus, UserCheck, Users, Ban, Edit, RefreshCw, X, KeyRound, Shield } from 'lucide-react';

interface EmployeeRow extends Employee {
  total_sales_count: number;
  total_sales_amount: number;
}

export const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    name: '',
    tier: 'CASHIER' as 'CASHIER' | 'SHIFT_LEAD',
    pin: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal
  const [editModalEmp, setEditModalEmp] = useState<EmployeeRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', pin: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.shopAdmin.getStaff();
      setStaff(data.staff);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await api.shopAdmin.createStaff(createForm);
      setShowCreateModal(false);
      setCreateForm({ employeeId: '', name: '', tier: 'CASHIER', pin: '' });
      fetchStaff();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create employee');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalEmp) return;
    setEditSubmitting(true);
    try {
      await api.shopAdmin.updateStaff(editModalEmp.id, {
        name: editForm.name,
        pin: editForm.pin || undefined,
      });
      setEditModalEmp(null);
      fetchStaff();
    } catch (err: any) {
      alert('Failed to update employee: ' + err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleTier = async (emp: EmployeeRow) => {
    const newTier = emp.tier === 'SHIFT_LEAD' ? 'CASHIER' : 'SHIFT_LEAD';
    if (!window.confirm(`Change ${emp.name}'s tier to ${newTier}? ${newTier === 'SHIFT_LEAD' ? 'They will gain permission to apply discounts and void sales.' : 'They will be restricted to standard sales.'}`)) {
      return;
    }

    try {
      await api.shopAdmin.updateStaffTier(emp.id, newTier);
      fetchStaff();
    } catch (err: any) {
      alert('Failed to update tier: ' + err.message);
    }
  };

  const handleToggleStatus = async (emp: EmployeeRow) => {
    const newStatus = emp.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    const confirmMsg =
      newStatus === 'DEACTIVATED'
        ? `Deactivate ${emp.name}? They will immediately be barred from logging into the POS terminal till.`
        : `Reactivate ${emp.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.shopAdmin.updateStaffStatus(emp.id, newStatus);
      fetchStaff();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">Staff Management</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure POS terminal operators, assign Cashier and Shift Lead tiers, and manage secure PIN credentials
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchStaff}
            className="p-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            id="btn-add-staff"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-neutral-950 text-white hover:bg-neutral-800 rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-xs text-left">
            <thead className="bg-neutral-50/80 text-neutral-600 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Staff ID</th>
                <th className="py-3 px-4">Tier & Permissions</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Total Sales</th>
                <th className="py-3 px-4">Gross Revenue</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading staff directory...
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    No employees enrolled yet.
                  </td>
                </tr>
              ) : (
                staff.map((emp) => (
                  <tr key={emp.id} className="hover:bg-neutral-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900">{emp.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">Enrolled: {new Date(emp.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-neutral-800">{emp.employee_id}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          emp.tier === 'SHIFT_LEAD'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {emp.tier === 'SHIFT_LEAD' ? 'Shift Lead' : 'Cashier'}
                        </span>
                        <button
                          onClick={() => handleToggleTier(emp)}
                          className="text-[10px] text-neutral-500 hover:text-neutral-900 underline font-medium cursor-pointer"
                          title="Switch between Cashier and Shift Lead"
                        >
                          Change Tier
                        </button>
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-1">
                        {emp.tier === 'SHIFT_LEAD' ? 'Can authorize discounts & voids' : 'Standard billing only'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {emp.status === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-neutral-100 text-neutral-500 border border-neutral-200">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">{emp.total_sales_count} sales</td>
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                      ₹{emp.total_sales_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => {
                            setEditModalEmp(emp);
                            setEditForm({ name: emp.name, pin: '' });
                          }}
                          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded transition cursor-pointer"
                          title="Edit Name or Reset PIN"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`p-1.5 rounded transition cursor-pointer ${
                            emp.status === 'ACTIVE'
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={emp.status === 'ACTIVE' ? 'Deactivate Employee' : 'Reactivate Employee'}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Employee Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-neutral-950 text-white">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Enroll New Employee</h3>
                  <p className="text-[11px] text-neutral-500">Assign Staff ID, Tier, and POS Login PIN</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-3.5 text-xs">
              {createError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
                  {createError}
                </div>
              )}

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Employee ID / Staff Badge Code *</label>
                <input
                  type="text"
                  required
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value.toUpperCase() })}
                  placeholder="e.g. EMP-03"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Maya Sharma"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Operational Tier *</label>
                <select
                  value={createForm.tier}
                  onChange={(e) => setCreateForm({ ...createForm, tier: e.target.value as any })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                >
                  <option value="CASHIER">CASHIER (Standard POS Till Operator)</option>
                  <option value="SHIFT_LEAD">SHIFT LEAD (Authorized for Discounts & Voids)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Terminal Login PIN *</label>
                <input
                  type="password"
                  required
                  pattern="[0-9]{4,8}"
                  value={createForm.pin}
                  onChange={(e) => setCreateForm({ ...createForm, pin: e.target.value })}
                  placeholder="4 to 8 digit numeric PIN"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono tracking-widest focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
                <span className="text-[10px] text-neutral-400 mt-0.5 block">Stored securely as salted bcrypt hash. Never plaintext.</span>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-xs font-semibold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 disabled:opacity-50"
                >
                  {createSubmitting ? 'Enrolling...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Edit Employee: {editModalEmp.employee_id}</h3>
                <p className="text-[11px] text-neutral-500">Update display name or reset terminal PIN</p>
              </div>
              <button
                onClick={() => setEditModalEmp(null)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Reset PIN (Leave blank to keep existing)</label>
                <input
                  type="password"
                  pattern="[0-9]{4,8}"
                  value={editForm.pin}
                  onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })}
                  placeholder="Enter new 4-8 digit PIN"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono tracking-widest focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditModalEmp(null)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-xs font-semibold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 bg-neutral-950 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
