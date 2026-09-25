import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { ShopAdminOverviewStats } from '../../types';
import { TrendingUp, ShoppingBag, AlertTriangle, Users, Award, RefreshCw, Clock } from 'lucide-react';

export const ShopOverview: React.FC = () => {
  const [stats, setStats] = useState<ShopAdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.shopAdmin.getOverview();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load shop overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin mr-2" />
        <span className="text-sm font-medium text-neutral-500">Loading shop overview...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        {error || 'Failed to load shop overview.'}
        <button onClick={fetchOverview} className="ml-3 underline font-semibold cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overdue / Grace Period Status Banner */}
      {stats.shopStatus === 'SUSPENDED' && (
        <div className="p-4 bg-red-100 border border-red-300 text-red-950 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-700 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">POS Terminal Checkout Suspended</h4>
              <p className="text-xs text-red-800 mt-0.5">
                Your account has an overdue commission invoice of ₹{stats.amountDue.toFixed(2)}. Cashier and Shift Lead checkout is currently locked.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold uppercase px-3 py-1 bg-red-700 text-white rounded-lg">
            Suspended
          </span>
        </div>
      )}

      {stats.shopStatus === 'OVERDUE' && stats.gracePeriodDaysLeft !== null && (
        <div className="p-4 bg-amber-100 border border-amber-300 text-amber-950 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-amber-700 shrink-0" />
            <div>
              <h4 className="text-sm font-bold">Commission Invoice Payment Due (Grace Period Active)</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                You have {stats.gracePeriodDaysLeft} day(s) remaining in your 7-day grace period to settle ₹{stats.amountDue.toFixed(2)}. Failure to pay will result in automated POS suspension.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold uppercase px-3 py-1 bg-amber-600 text-white rounded-lg">
            {stats.gracePeriodDaysLeft} Days Left
          </span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="p-5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Today's Sales</span>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-neutral-900 tracking-tight">
              ₹{stats.todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-neutral-400 block mt-0.5 font-medium">
              {stats.todayTransactionsCount} completed transaction(s) today
            </span>
          </div>
        </div>

        {/* This Month's Sales */}
        <div className="p-5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">This Month's Sales</span>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-neutral-900 tracking-tight">
              ₹{stats.monthSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-neutral-400 block mt-0.5 font-medium">
              {stats.monthTransactionsCount} transaction(s) this month
            </span>
          </div>
        </div>

        {/* 2% Commission Accrued */}
        <div className="p-5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Platform Commission (2%)</span>
            <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-purple-950 tracking-tight">
              ₹{(stats.monthSales * 0.02).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-purple-700 block mt-0.5 font-medium">
              Accrued for end-of-month invoice
            </span>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="p-5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Outstanding Balance</span>
            <div className={`p-2 rounded-lg ${stats.amountDue > 0 ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-500'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black tracking-tight ${stats.amountDue > 0 ? 'text-amber-700' : 'text-neutral-900'}`}>
              ₹{stats.amountDue.toFixed(2)}
            </span>
            <span className="text-[11px] text-neutral-400 block mt-0.5 font-medium">
              {stats.amountDue > 0 ? 'Pending invoice payment' : 'All prior invoices settled'}
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Top-Selling Items & Sales by Employee */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top-Selling Items */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Top-Selling Products</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Ranked by units sold across all completed orders</p>
            </div>
          </div>

          {stats.topSellingItems.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">No product sales recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-100 text-xs text-left">
                <thead className="text-neutral-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3 text-right">Units Sold</th>
                    <th className="py-2 px-3 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 text-neutral-800">
                  {stats.topSellingItems.map((item, idx) => (
                    <tr key={item.productId} className="hover:bg-neutral-50/50">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-neutral-900 block">
                          {idx + 1}. {item.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                        ₹{item.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sales by Employee */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Sales by Staff Member</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Performance attribution across Cashiers and Shift Leads</p>
            </div>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>

          {stats.salesByEmployee.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">No employee sales on record.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-100 text-xs text-left">
                <thead className="text-neutral-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Staff Member</th>
                    <th className="py-2 px-3">Tier</th>
                    <th className="py-2 px-3 text-right">Transactions</th>
                    <th className="py-2 px-3 text-right">Gross Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50 text-neutral-800">
                  {stats.salesByEmployee.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-neutral-50/50">
                      <td className="py-2.5 px-3 font-semibold text-neutral-900">{emp.name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          emp.tier === 'SHIFT_LEAD' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {emp.tier === 'SHIFT_LEAD' ? 'Shift Lead' : 'Cashier'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{emp.salesCount}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                        ₹{emp.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 7-Day Sales Trend */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-neutral-900 mb-1">7-Day Sales Trend</h3>
        <p className="text-xs text-neutral-500 mb-4">Daily gross receipts from POS checkout</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {stats.salesTrend.map((day) => (
            <div key={day.date} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-center">
              <span className="text-[11px] font-bold text-neutral-500 uppercase block">
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
              </span>
              <span className="text-sm font-black text-neutral-900 block mt-1">
                ₹{day.amount.toFixed(2)}
              </span>
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                {day.count} sale(s)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
