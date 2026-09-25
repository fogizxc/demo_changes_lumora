import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { MonthlyInvoice, Shop } from '../../types';
import { CheckCircle2, Clock, AlertTriangle, RefreshCw, DollarSign, Filter, FileText, Plus } from 'lucide-react';

export const PlatformInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<MonthlyInvoice[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [shopFilter, setShopFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Bill Generation modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genPeriod, setGenPeriod] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [genShopId, setGenShopId] = useState<string>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, shopRes] = await Promise.all([
        api.superAdmin.getInvoices(statusFilter || undefined, shopFilter || undefined),
        api.superAdmin.getShops(),
      ]);
      setInvoices(invRes.invoices);
      setShops(shopRes.shops);
    } catch (err: any) {
      alert('Failed to load invoices: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, shopFilter]);

  const handleMarkPaid = async (invoice: MonthlyInvoice) => {
    const due = invoice.commission_due || invoice.commission_amount || 0;
    if (!window.confirm(`Mark invoice ${invoice.id} for "${invoice.shop_name}" as PAID (₹${due.toFixed(2)})? This will also reactivate POS access if suspended.`)) {
      return;
    }

    setActionLoading(invoice.id);
    try {
      await api.superAdmin.markInvoicePaid(invoice.id);
      fetchData();
    } catch (err: any) {
      alert('Action failed: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateInvoices = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenMessage(null);
    try {
      const res = await api.superAdmin.generateInvoices(genPeriod, genShopId);
      setGenMessage(res.message || 'Invoices generated successfully');
      await fetchData();
      setTimeout(() => {
        setShowGenerateModal(false);
        setGenMessage(null);
      }, 1200);
    } catch (err: any) {
      alert('Bill generation failed: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (inv: MonthlyInvoice) => {
    const isOverdue = inv.status === 'OVERDUE' || (inv.status === 'PENDING' && new Date(inv.grace_period_ends_at) < new Date());
    if (inv.status === 'PAID') {
      return (
        <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Paid</span>
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-red-100 text-red-800 border border-red-200">
          <AlertTriangle className="w-3 h-3 text-red-600" />
          <span>Overdue (POS Suspended)</span>
        </span>
      );
    }
    return (
      <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600" />
        <span>Pending Grace</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">Platform Commission Invoices</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            2.0% gross sales monthly invoices with 7-day grace period enforcement and manual payment reconciliation
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-700 focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
            <option value="PAID">Paid</option>
          </select>

          {/* Shop Filter */}
          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="px-3 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-700 focus:outline-hidden"
          >
            <option value="">All Shops</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchData}
            className="p-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Platform Bills</span>
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-xs text-left">
            <thead className="bg-neutral-50/80 text-neutral-600 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice / Shop</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Gross Sales</th>
                <th className="py-3 px-4">Rate</th>
                <th className="py-3 px-4">Commission Due</th>
                <th className="py-3 px-4">Status & Grace Period</th>
                <th className="py-3 px-4 text-right">Payment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    No invoices matching filter.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const graceEnds = new Date(inv.grace_period_ends_at);
                  const now = new Date();
                  const diffDays = Math.ceil((graceEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <tr key={inv.id} className="hover:bg-neutral-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900">{inv.id}</div>
                        <div className="text-[11px] text-neutral-600 font-semibold">{inv.shop_name}</div>
                        <div className="text-[10px] text-neutral-400">Sent: {new Date(inv.sent_at).toLocaleDateString()}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">{inv.billing_period}</td>
                      <td className="py-3 px-4 font-mono font-medium">
                        ₹{inv.gross_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-600">{(inv.commission_rate * 100).toFixed(1)}%</td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-900 text-sm">
                        ₹{(inv.commission_due || inv.commission_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(inv)}
                        </div>
                        {inv.status === 'PAID' ? (
                          <div className="text-[10px] text-emerald-700 font-medium mt-1">
                            Paid: {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : 'Recorded'}
                          </div>
                        ) : diffDays >= 0 ? (
                          <div className="text-[10px] text-amber-700 font-medium mt-1">
                            {diffDays} days grace left (Ends {graceEnds.toLocaleDateString()})
                          </div>
                        ) : (
                          <div className="text-[10px] text-red-700 font-bold mt-1">
                            Grace expired {Math.abs(diffDays)} days ago
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {inv.status === 'PAID' ? (
                          <span className="text-xs font-semibold text-neutral-400">Settled</span>
                        ) : (
                          <button
                            id={`btn-mark-paid-${inv.id}`}
                            onClick={() => handleMarkPaid(inv)}
                            disabled={actionLoading === inv.id}
                            className="flex items-center space-x-1 ml-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-2xs transition cursor-pointer disabled:opacity-50"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>{actionLoading === inv.id ? 'Recording...' : 'Mark as Paid'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Monthly Bill Generation Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-neutral-800" />
                <h3 className="font-extrabold text-sm text-neutral-900">Generate Platform Commission Bills</h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateInvoices} className="space-y-4 text-xs">
              <p className="text-neutral-600 leading-relaxed">
                Calculate 2.0% platform commission on gross sales for each shop, create official billing invoices, and initiate the 7-day grace period.
              </p>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Billing Period (YYYY-MM):</label>
                <input
                  type="month"
                  value={genPeriod}
                  onChange={(e) => setGenPeriod(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-800 font-mono focus:outline-hidden"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  e.g., current month {genPeriod} or previous monthly cycle
                </span>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Target Shop:</label>
                <select
                  value={genShopId}
                  onChange={(e) => setGenShopId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white text-neutral-800 focus:outline-hidden"
                >
                  <option value="ALL">All Active Stores (Batch Invoicing)</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              {genMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{genMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-3 py-2 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isGenerating ? 'Generating Bills...' : 'Run Bill Generation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
