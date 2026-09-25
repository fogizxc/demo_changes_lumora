import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { GymMember, GymPlan, GymAttendance } from '../../types';
import {
  Dumbbell,
  Users,
  CalendarCheck,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  Award,
  CreditCard,
  UserCheck,
} from 'lucide-react';

interface GymEngineViewProps {
  initialSubTab?: 'members' | 'attendance' | 'plans' | 'freezes';
}

export const GymEngineView: React.FC<GymEngineViewProps> = ({ initialSubTab = 'members' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'attendance' | 'plans'>(
    initialSubTab === 'freezes' ? 'members' : initialSubTab
  );

  useEffect(() => {
    if (initialSubTab) {
      if (initialSubTab === 'freezes') {
        setActiveSubTab('members');
      } else {
        setActiveSubTab(initialSubTab);
      }
    }
  }, [initialSubTab]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [members, setMembers] = useState<GymMember[]>([]);
  const [plans, setPlans] = useState<GymPlan[]>([]);
  const [attendance, setAttendance] = useState<GymAttendance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GymMember | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forms
  const [newMember, setNewMember] = useState({
    name: '',
    phone: '',
    email: '',
    emergencyContact: '',
    trainerName: 'Vikram Seth',
    fitnessGoal: 'Muscle Hypertrophy & Strength',
    planId: '',
  });

  const [newPlan, setNewPlan] = useState({
    name: '',
    durationMonths: 3,
    price: 6000,
    benefits: 'Full Gym Floor + Steam + Locker',
    freezeLimitDays: 14,
  });

  const [freezeData, setFreezeData] = useState({
    freezeDays: 14,
  });

  const [renewPlanId, setRenewPlanId] = useState('');

  const [checkinData, setCheckinData] = useState({
    memberId: '',
    workoutType: 'HEAVY_LIFTING',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, membersRes, plansRes] = await Promise.all([
        api.gym.getOverview(),
        api.gym.getMembers(searchQuery),
        api.gym.getPlans(),
      ]);

      setStats(overviewRes.stats);
      setAttendance(overviewRes.recentAttendance);
      setMembers(membersRes.members);
      setPlans(plansRes.plans);

      if (plansRes.plans.length > 0 && !newMember.planId) {
        setNewMember((prev) => ({ ...prev, planId: plansRes.plans[0].id }));
      }
      if (plansRes.plans.length > 0 && !renewPlanId) {
        setRenewPlanId(plansRes.plans[0].id);
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

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const res = await api.gym.createMember(newMember);
      setSuccessMessage(`Athlete ${res.member.name} registered successfully (${res.member.member_number})`);
      setShowMemberModal(false);
      setNewMember({ name: '', phone: '', email: '', emergencyContact: '', trainerName: 'Vikram Seth', fitnessGoal: 'Strength', planId: plans[0]?.id || '' });
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register gym member');
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      await api.gym.createPlan(newPlan);
      setSuccessMessage(`Plan ${newPlan.name} created successfully`);
      setShowPlanModal(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create plan');
    }
  };

  const handleFreezeMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !selectedMember.membership_id) return;
    setErrorMessage(null);
    try {
      const res = await api.gym.freezeMembership({
        membershipId: selectedMember.membership_id,
        freezeDays: Number(freezeData.freezeDays),
      });
      setSuccessMessage(res.message);
      setShowFreezeModal(false);
      loadData();
    } catch (err: any) {
      // Highlights plan freeze limit enforcement
      setErrorMessage(err.message || 'Freeze limit exceeded or invalid');
    }
  };

  const handleRenewMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setErrorMessage(null);
    try {
      await api.gym.renewMembership({
        memberId: selectedMember.id,
        planId: renewPlanId,
      });
      setSuccessMessage(`Membership for ${selectedMember.name} renewed successfully!`);
      setShowRenewModal(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to renew membership');
    }
  };

  const handleCheckIn = async (memberId: string) => {
    try {
      const res = await api.gym.checkInMember({
        memberId,
        workoutType: checkinData.workoutType,
      });
      setSuccessMessage(`Checked in ${res.checkin.member_name} at ${res.checkin.check_in_time}!`);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Check-in failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Gym & Fitness Club Engine</h1>
              <p className="text-xs text-neutral-500 font-medium">
                Membership lifecycles, freeze entitlement rules, plan renewals & turnstile attendance
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMemberModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#68151F] text-white text-xs font-bold hover:bg-[#521118] transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Join New Member</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPlanModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition shadow-xs cursor-pointer"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Configure Plan</span>
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
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Members</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900">{stats.totalMembers || members.length}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Enrolled gym athletes</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Active Memberships</span>
            <CalendarCheck className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900">{stats.activeMemberships || members.filter(m => m.membership_status === 'ACTIVE').length}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Valid access passes</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Today's Check-ins</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-neutral-900">{stats.todayCheckins || attendance.length}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Gym floor check-ins</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Membership Revenue</span>
            <CreditCard className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-[#68151F]">₹{(stats.totalRevenue || 0).toLocaleString()}</div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Subscriptions collected</div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-neutral-200 gap-6">
        {[
          { id: 'members', label: `Athletes & Members (${members.length})`, icon: Users },
          { id: 'attendance', label: `Today's Check-ins (${attendance.length})`, icon: UserCheck },
          { id: 'plans', label: `Membership Plans (${plans.length})`, icon: Award },
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

      {/* TAB 1: MEMBERS ROSTER */}
      {activeSubTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                placeholder="Search member name, ID, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-xs focus:ring-1 focus:ring-neutral-900 outline-hidden"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowMemberModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#68151F] text-white rounded-xl text-xs font-bold hover:bg-[#521118]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-700">
                <thead className="bg-neutral-50/80 text-neutral-500 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="py-3.5 px-4">Member Info</th>
                    <th className="py-3.5 px-4">Active Plan</th>
                    <th className="py-3.5 px-4">Validity</th>
                    <th className="py-3.5 px-4">Trainer & Goal</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900">{m.name}</div>
                        <div className="text-[11px] text-neutral-400 flex items-center space-x-1.5">
                          <span className="font-semibold text-amber-700">{m.member_number}</span>
                          <span>•</span>
                          <span>{m.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-800">{m.plan_name || 'No Active Plan'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {m.end_date ? (
                          <div>
                            <div className="font-bold text-neutral-800">Expires {m.end_date}</div>
                            {m.freeze_status === 'FROZEN' && (
                              <div className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                                ❄️ Frozen until {m.frozen_until}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-neutral-700">{m.trainer_name || 'Floor Trainer'}</div>
                        <div className="text-[11px] text-neutral-400">{m.fitness_goal}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.freeze_status === 'FROZEN'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : m.membership_status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {m.freeze_status === 'FROZEN' ? 'FROZEN' : m.membership_status || 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        {/* Quick Attendance Check-in */}
                        <button
                          type="button"
                          onClick={() => handleCheckIn(m.id)}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-bold transition"
                        >
                          Check In
                        </button>
                        {/* Freeze button */}
                        {m.membership_status === 'ACTIVE' && m.freeze_status !== 'FROZEN' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMember(m);
                              setShowFreezeModal(true);
                            }}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-bold transition"
                          >
                            Freeze
                          </button>
                        )}
                        {/* Renew button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMember(m);
                            setShowRenewModal(true);
                          }}
                          className="px-2.5 py-1 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 rounded-lg text-[10px] font-bold transition"
                        >
                          Renew
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE TRACKER */}
      {activeSubTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-neutral-800">Live Turnstile / Check-in Logs</span>
            </div>
            <span className="text-[11px] font-semibold text-neutral-500">
              Today's logs: {attendance.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-50/80 text-neutral-500 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="py-3 px-4">Athlete Name</th>
                  <th className="py-3 px-4">Check-in Time</th>
                  <th className="py-3 px-4">Workout Routine</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {attendance.map((att) => (
                  <tr key={att.id} className="hover:bg-neutral-50/60 transition">
                    <td className="py-3 px-4 font-bold text-neutral-900">{att.member_name}</td>
                    <td className="py-3 px-4 font-semibold text-neutral-700 flex items-center space-x-1.5">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>{att.check_in_time}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-neutral-100 px-2 py-0.5 rounded text-[11px] font-medium text-neutral-700">
                        {att.workout_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-700 font-bold text-[11px] flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified Active</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PLANS PRICING & FREEZE ENTITLEMENTS */}
      {activeSubTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.id} className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4 relative">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">{p.name}</h3>
                  <div className="text-xs text-neutral-400 font-medium">{p.duration_months} Months Access</div>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                  {p.freeze_limit_days} Days Freeze
                </span>
              </div>

              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-black text-neutral-900">₹{p.price.toLocaleString()}</span>
                <span className="text-xs text-neutral-400">/ subscription</span>
              </div>

              <div className="space-y-2 text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                <div className="font-semibold text-neutral-800">Plan Inclusions:</div>
                <div className="text-[11px] text-neutral-600">{p.benefits || 'Full Gym Access'}</div>
              </div>

              <div className="text-[11px] text-neutral-400 pt-2 border-t border-neutral-100">
                Freeze policy: Maximum {p.freeze_limit_days} days suspension allowed per lifecycle.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: JOIN NEW MEMBER */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-neutral-900">Join New Gym Member</h2>
            <form onSubmit={handleRegisterMember} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Athlete Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aryan Malhotra"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 9898989898"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Membership Plan</label>
                  <select
                    value={newMember.planId}
                    onChange={(e) => setNewMember({ ...newMember, planId: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl font-medium"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Personal Trainer</label>
                  <input
                    type="text"
                    value={newMember.trainerName}
                    onChange={(e) => setNewMember({ ...newMember, trainerName: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Fitness Goal</label>
                  <input
                    type="text"
                    value={newMember.fitnessGoal}
                    onChange={(e) => setNewMember({ ...newMember, fitnessGoal: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#68151F] text-white rounded-xl font-bold hover:bg-[#521118]"
                >
                  Enroll Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FREEZE MEMBERSHIP (RULES ENFORCEMENT) */}
      {showFreezeModal && selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Freeze Membership</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Suspend {selectedMember.name}'s membership and auto-extend expiration date.
              </p>
            </div>
            <form onSubmit={handleFreezeMembership} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Requested Freeze Duration (Days)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={freezeData.freezeDays}
                  onChange={(e) => setFreezeData({ freezeDays: Number(e.target.value) })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl font-bold"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  System validates that days do not exceed the plan's freeze limit.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFreezeModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                >
                  Apply Freeze & Extend End Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RENEW MEMBERSHIP */}
      {showRenewModal && selectedMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Renew Membership</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Renew subscription for {selectedMember.name} ({selectedMember.member_number})
              </p>
            </div>
            <form onSubmit={handleRenewMembership} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Select Renewal Plan</label>
                <select
                  value={renewPlanId}
                  onChange={(e) => setRenewPlanId(e.target.value)}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl font-medium"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} - ₹{p.price} ({p.duration_months} mo)</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800"
                >
                  Confirm Renewal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
