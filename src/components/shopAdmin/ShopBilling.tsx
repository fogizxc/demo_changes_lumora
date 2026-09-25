import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { MonthlyInvoice } from '../../types';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileText,
  Info,
  CreditCard,
  Plus,
  DollarSign,
  TrendingDown,
  Calendar,
  Tag,
  Building,
  Check,
} from 'lucide-react';

export const ShopBilling: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'EXPENSES' | 'PLATFORM_INVOICES'>('EXPENSES');

  // Platform Invoices State
  const [invoices, setInvoices] = useState<MonthlyInvoice[]>([]);
  const [amountDue, setAmountDue] = useState(0);
  const [shopStatus, setShopStatus] = useState('ACTIVE');
  const [isPosSuspended, setIsPosSuspended] = useState(false);
  const [gracePeriodDaysLeft, setGracePeriodDaysLeft] = useState<number | null>(null);
  const [overdueInvoice, setOverdueInvoice] = useState<MonthlyInvoice | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);

  // Store Expenses State
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalExpensesAmount, setTotalExpensesAmount] = useState<number>(0);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState('ALL');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

  // New Expense Form State
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('Utilities');
  const [newExpensePaymentMethod, setNewExpensePaymentMethod] = useState('CASH');
  const [newExpenseVendor, setNewExpenseVendor] = useState('');
  const [newExpenseDate, setNewExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [newExpenseDescription, setNewExpenseDescription] = useState('');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const fetchBilling = async () => {
    setBillingLoading(true);
    try {
      const data = await api.shopAdmin.getBilling();
      setInvoices(data.invoices || []);
      setAmountDue(data.amountDue || 0);
      setShopStatus(data.shopStatus || 'ACTIVE');
      setIsPosSuspended(data.isPosSuspended || false);
      setGracePeriodDaysLeft(data.gracePeriodDaysLeft ?? null);
      setOverdueInvoice(data.overdueInvoice ?? null);
    } catch (err: any) {
      console.error('Failed to load billing:', err);
    } finally {
      setBillingLoading(false);
    }
  };

  const fetchExpenses = async () => {
    setExpensesLoading(true);
    try {
      const cat = selectedExpenseCategory === 'ALL' ? undefined : selectedExpenseCategory;
      const data = await api.expenses.getExpenses(cat);
      setExpenses(data.expenses || []);
      setTotalExpensesAmount(data.totalAmount || 0);
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
    } finally {
      setExpensesLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
    fetchExpenses();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [selectedExpenseCategory]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseTitle.trim() || !newExpenseAmount) return;

    setSubmittingExpense(true);
    try {
      await api.expenses.createExpense({
        title: newExpenseTitle.trim(),
        amount: parseFloat(newExpenseAmount),
        category: newExpenseCategory,
        paymentMethod: newExpensePaymentMethod,
        vendor: newExpenseVendor.trim() || undefined,
        date: newExpenseDate,
        description: newExpenseDescription.trim() || undefined,
      });

      setShowAddExpenseModal(false);
      setNewExpenseTitle('');
      setNewExpenseAmount('');
      setNewExpenseVendor('');
      setNewExpenseDescription('');
      fetchExpenses();
    } catch (err: any) {
      alert('Failed to log expense: ' + err.message);
    } finally {
      setSubmittingExpense(false);
    }
  };

  const getStatusBadge = (inv: MonthlyInvoice) => {
    const isOverdue = inv.status === 'OVERDUE' || (inv.status === 'PENDING' && new Date(inv.grace_period_ends_at) < new Date());
    if (inv.status === 'PAID') {
      return (
        <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Settled / Paid</span>
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-200">
          <AlertTriangle className="w-3 h-3 text-red-600" />
          <span>Overdue (POS Locked)</span>
        </span>
      );
    }
    return (
      <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600" />
        <span>Pending Grace Period</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Sub-Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">Financials & Expenses Ledger</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage operational store expenditures, petty cash, vendor disbursements, and platform SaaS commission invoices
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-200 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('EXPENSES')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'EXPENSES'
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Store Expenses</span>
            </button>
            <button
              onClick={() => setActiveSubTab('PLATFORM_INVOICES')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'PLATFORM_INVOICES'
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Platform Invoices</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (activeSubTab === 'EXPENSES') fetchExpenses();
              else fetchBilling();
            }}
            className="p-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeSubTab === 'EXPENSES' ? (
        <div className="space-y-6">
          {/* Expenses Summary KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block">
                Total Recorded Expenses
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-2xl font-black text-neutral-900 font-mono">
                  ₹{totalExpensesAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-semibold text-neutral-500">{expenses.length} entries</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 block">
                Average Expense Entry
              </span>
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-2xl font-black text-neutral-900 font-mono">
                  ₹{expenses.length > 0 ? (totalExpensesAmount / expenses.length).toFixed(2) : '0.00'}
                </span>
                <span className="text-xs text-neutral-500">per voucher</span>
              </div>
            </div>

            <div className="bg-[#68151F]/5 p-5 rounded-2xl border border-[#68151F]/20 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#68151F] block">
                  Quick Actions
                </span>
                <p className="text-xs text-neutral-600 mt-0.5">Log new vendor disbursement or petty expense</p>
              </div>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="mt-3 w-full py-2 bg-[#68151F] hover:bg-[#521018] text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Log New Expense</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider text-[10px] mr-1">
                Category:
              </span>
              {['ALL', 'Utilities', 'Rent', 'Supplies', 'Salaries', 'Maintenance', 'Logistics', 'Marketing', 'Other'].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedExpenseCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      selectedExpenseCategory === cat
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-bold text-neutral-900 text-sm">Store Expense Register</h3>
              <span className="text-xs text-neutral-400 font-mono">{expenses.length} Records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-xs text-left">
                <thead className="text-neutral-500 font-bold uppercase text-[10px] bg-neutral-50/80">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Expense Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Vendor / Payee</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {expensesLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading expense ledger...
                      </td>
                    </tr>
                  ) : expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-400">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-semibold text-neutral-600">No expenses recorded yet</p>
                        <p className="text-xs mt-1 text-neutral-400">Use "+ Log New Expense" to start tracking store disbursements.</p>
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-neutral-50/60 transition">
                        <td className="py-3.5 px-4 font-mono text-neutral-500">{exp.date}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-neutral-900 block">{exp.title}</span>
                          {exp.description && (
                            <span className="text-[11px] text-neutral-400 truncate max-w-xs block">
                              {exp.description}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700 border border-neutral-200">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-neutral-600 font-medium">
                          {exp.vendor || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] font-bold text-neutral-700 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">
                            {exp.payment_method}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-neutral-900">
                          ₹{exp.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* PLATFORM INVOICES VIEW */
        <div className="space-y-6">
          {/* Account Status Card */}
          <div
            className={`p-6 rounded-2xl border ${
              isPosSuspended
                ? 'bg-red-50/90 border-red-200 text-red-950'
                : gracePeriodDaysLeft !== null
                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div
                  className={`p-2.5 rounded-xl ${
                    isPosSuspended
                      ? 'bg-red-600 text-white'
                      : gracePeriodDaysLeft !== null
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isPosSuspended ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : gracePeriodDaysLeft !== null ? (
                    <Clock className="w-6 h-6" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm uppercase tracking-wide">
                      {isPosSuspended
                        ? 'POS TERMINAL ACCESS SUSPENDED'
                        : gracePeriodDaysLeft !== null
                        ? 'INVOICE PAYMENT DUE — 7-DAY GRACE PERIOD ACTIVE'
                        : 'ACCOUNT IN GOOD STANDING'}
                    </span>
                  </div>
                  <p className="text-xs opacity-80 mt-1 max-w-xl">
                    {isPosSuspended
                      ? 'An invoice has exceeded the mandatory 7-day grace period. POS terminal checkout has been automatically disabled. Please settle the invoice with platform administrators.'
                      : gracePeriodDaysLeft !== null
                      ? `You have ${gracePeriodDaysLeft} day(s) remaining before automatic POS terminal suspension takes effect. Payment is processed manually via platform administrators.`
                      : 'All platform commission invoices are up to date. POS checkout is fully operational.'}
                  </p>
                </div>
              </div>

              <div className="text-right sm:border-l sm:pl-6 border-current/20">
                <span className="text-[11px] uppercase tracking-wider font-semibold opacity-70 block">
                  Total Commission Due
                </span>
                <span className="text-2xl font-black tracking-tight font-mono block mt-0.5">
                  ₹{amountDue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Commission Model Notice */}
          <div className="p-4 bg-white border border-neutral-200 rounded-2xl shadow-2xs flex items-center space-x-3 text-xs text-neutral-600">
            <Info className="w-5 h-5 text-neutral-400 shrink-0" />
            <div>
              <span className="font-bold text-neutral-900">Platform Commission Policy: </span>
              A standard 2.0% fee is calculated strictly on monthly gross sales. Invoices are issued on the 1st of each month with a 7-day grace period for settlement via platform administrators.
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/80">
              <h3 className="font-bold text-neutral-900 text-sm">Monthly Platform Invoices</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-xs text-left">
                <thead className="text-neutral-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Invoice ID</th>
                    <th className="py-3 px-4">Billing Period</th>
                    <th className="py-3 px-4">Gross Sales</th>
                    <th className="py-3 px-4">Commission Rate</th>
                    <th className="py-3 px-4">Commission Due</th>
                    <th className="py-3 px-4">Grace Period Expiry</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {billingLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading invoices...
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-400">
                        No invoices generated yet.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-neutral-50/60 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">{inv.id}</td>
                        <td className="py-3.5 px-4 font-mono font-medium">{inv.billing_period}</td>
                        <td className="py-3.5 px-4 font-mono font-medium">
                          ₹{inv.gross_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-neutral-600">
                          {(inv.commission_rate * 100).toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-sm text-neutral-900">
                          ₹{(inv.commission_due || inv.commission_amount || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-neutral-600">
                          {new Date(inv.grace_period_ends_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end">{getStatusBadge(inv)}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="text-base font-bold text-neutral-900">Record Store Expense</h2>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Store Electricity Bill - Oct"
                  value={newExpenseTitle}
                  onChange={(e) => setNewExpenseTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#68151F] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="2500.00"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#68151F] focus:outline-hidden font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Category *</label>
                  <select
                    value={newExpenseCategory}
                    onChange={(e) => setNewExpenseCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#68151F] focus:outline-hidden"
                  >
                    <option value="Utilities">Utilities</option>
                    <option value="Rent">Rent</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Payment Method</label>
                  <select
                    value={newExpensePaymentMethod}
                    onChange={(e) => setNewExpensePaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#68151F] focus:outline-hidden"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="CARD">Debit / Credit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={newExpenseDate}
                    onChange={(e) => setNewExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#68151F] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Vendor / Payee (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Adani Electricity Ltd"
                  value={newExpenseVendor}
                  onChange={(e) => setNewExpenseVendor(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#68151F] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Internal Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="Voucher # / Reference"
                  value={newExpenseDescription}
                  onChange={(e) => setNewExpenseDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#68151F] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl text-neutral-700 hover:bg-neutral-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="px-4 py-2 bg-[#68151F] hover:bg-[#521018] text-white rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  {submittingExpense ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Record Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
