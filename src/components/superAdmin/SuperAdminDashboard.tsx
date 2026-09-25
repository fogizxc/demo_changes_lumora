import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { SuperAdminDashboardStats } from '../../types';
import {
  AlertTriangle,
  TrendingUp,
  Store,
  DollarSign,
  RefreshCw,
  ArrowUpRight,
  Plus,
  ShoppingBag,
  FileText,
  Users,
  ChevronDown,
} from 'lucide-react';

interface Props {
  onNavigateToShops: () => void;
  onNavigateToInvoices: () => void;
  onNavigateToTransactions?: () => void;
  onNavigateToAudit?: () => void;
}

export const SuperAdminDashboard: React.FC<Props> = ({
  onNavigateToShops,
  onNavigateToInvoices,
  onNavigateToTransactions,
  onNavigateToAudit,
}) => {
  const [stats, setStats] = useState<SuperAdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY');

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.superAdmin.getDashboard();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <RefreshCw className="w-6 h-6 text-[#68151F] animate-spin mr-2" />
        <span className="text-sm font-medium text-[#6B625A]">Loading platform metrics...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-[#FFEBEE] border border-[#FFCDD2] rounded-xl text-[#C62828] text-sm">
        {error || 'Failed to load metrics.'}
        <button onClick={fetchStats} className="ml-3 underline font-semibold cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  // Monthly breakdown mockup data matching the design system image
  const monthlyChartData = [
    { month: 'Jan', sales: 48, profit: 16 },
    { month: 'Feb', sales: 62, profit: 22 },
    { month: 'Mar', sales: 55, profit: 19 },
    { month: 'Apr', sales: 78, profit: 28 },
    { month: 'May', sales: 85, profit: 32 },
    { month: 'Jun', sales: 72, profit: 26 },
    { month: 'Jul', sales: 94, profit: 36 },
    { month: 'Aug', sales: 88, profit: 31 },
    { month: 'Sep', sales: 110, profit: 42 },
  ];

  const topShops = [
    { name: 'Sharma General Store', sales: '₹2,48,230', growth: '+12%', orders: 840 },
    { name: 'City Mart - Bandra', sales: '₹1,92,400', growth: '+8%', orders: 620 },
    { name: 'Fresh Basket', sales: '₹1,76,220', growth: '+6%', orders: 580 },
    { name: 'Gupta Provision', sales: '₹1,21,890', growth: '+4%', orders: 410 },
    { name: 'Daily Needs Koramangala', sales: '₹98,420', growth: '+3%', orders: 320 },
  ];

  return (
    <div className="space-y-6">
      {/* Subheader Greeting Section from Image */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5DDCF]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#171717] tracking-tight">
            Good Morning, Raghav
          </h1>
          <p className="text-xs text-[#6B625A] mt-0.5">
            Here's what's happening across your network today.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="px-3 py-1.5 rounded-lg border border-[#E5DDCF] bg-[#FFFDF8] text-xs font-semibold text-[#6B625A]">
            Tue, 16 Sep 2026
          </div>

          <div className="relative inline-flex items-center">
            <button
              type="button"
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-[#E5DDCF] bg-[#FFFDF8] hover:bg-[#F7F1E7] text-[#171717] rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <span>Last 30 days</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B625A]" />
            </button>
          </div>

          <button
            onClick={fetchStats}
            className="p-1.5 border border-[#E5DDCF] bg-[#FFFDF8] hover:bg-[#F7F1E7] text-[#68151F] rounded-lg text-xs transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Stat Cards from Image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="p-5 bg-[#FFFDF8] rounded-xl border border-[#E5DDCF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B625A]">Total Sales</span>
            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EBF7EE] text-[#1F7A37]">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              +12.5%
            </span>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black font-mono text-[#171717] tracking-tight">
              ₹{stats.totalGrossSales > 0 ? stats.totalGrossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '12,48,230.00'}
            </span>
            <span className="text-[11px] text-[#6B625A] block mt-0.5">Across all registered shops</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-5 bg-[#FFFDF8] rounded-xl border border-[#E5DDCF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B625A]">Total Orders</span>
            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EBF7EE] text-[#1F7A37]">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              +8.4%
            </span>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black font-mono text-[#171717] tracking-tight">
              4,892
            </span>
            <span className="text-[11px] text-[#6B625A] block mt-0.5">Completed transactions</span>
          </div>
        </div>

        {/* Active Shops */}
        <div className="p-5 bg-[#FFFDF8] rounded-xl border border-[#E5DDCF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B625A]">Active Shops</span>
            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EBF7EE] text-[#1F7A37]">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              +6.7%
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-[#171717] tracking-tight">
              {stats.activeShopsCount || 128}
            </span>
            <button
              onClick={onNavigateToShops}
              className="text-xs font-semibold text-[#68151F] hover:underline cursor-pointer"
            >
              Directory →
            </button>
          </div>
          <span className="text-[11px] text-[#6B625A] block mt-0.5">Shops in good standing</span>
        </div>

        {/* Platform Commission (2%) */}
        <div className="p-5 bg-[#FFFDF8] rounded-xl border border-[#E5DDCF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B625A]">Platform Revenue (2%)</span>
            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EBF7EE] text-[#1F7A37]">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              +11.2%
            </span>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black font-mono text-[#68151F] tracking-tight">
              ₹{stats.totalCommissionThisMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-[#6B625A] block mt-0.5">Authoritative 2% billing fee</span>
          </div>
        </div>
      </div>

      {/* Two-Column Section: Sales Overview Chart & Top Performing Shops */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Sales Overview Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-[#FFFDF8] p-5 rounded-xl border border-[#E5DDCF] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#171717]">Sales Overview</h2>
              <p className="text-xs text-[#6B625A]">Monthly platform sales volume vs estimated gross profit</p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#68151F]"></span>
                <span className="text-[11px] text-[#6B625A]">Sales</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#102A43]"></span>
                <span className="text-[11px] text-[#6B625A]">Profit</span>
              </div>
              <div className="ml-2 flex rounded-lg bg-[#F7F1E7] p-0.5 border border-[#E5DDCF]">
                <button
                  type="button"
                  onClick={() => setChartView('MONTHLY')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    chartView === 'MONTHLY' ? 'bg-[#FFFDF8] text-[#171717] shadow-xs' : 'text-[#6B625A]'
                  }`}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('WEEKLY')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    chartView === 'WEEKLY' ? 'bg-[#FFFDF8] text-[#171717] shadow-xs' : 'text-[#6B625A]'
                  }`}
                >
                  Week
                </button>
              </div>
            </div>
          </div>

          {/* Stylized Bar & Line Chart using VyapaarX Palette */}
          <div className="h-56 pt-4 flex items-end justify-between gap-2 border-b border-[#E5DDCF] px-2">
            {monthlyChartData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center justify-end h-full group">
                <div className="w-full flex items-end justify-center space-x-1 h-full">
                  {/* Sales Bar (Dark Red) */}
                  <div
                    style={{ height: `${(d.sales / 120) * 100}%` }}
                    className="w-3.5 sm:w-5 bg-[#68151F] rounded-t-sm transition-all duration-300 group-hover:bg-[#9A303B] relative"
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-[#171717] text-white text-[9px] font-mono py-0.5 px-1 rounded pointer-events-none transition whitespace-nowrap z-10">
                      ₹{d.sales}k
                    </span>
                  </div>
                  {/* Profit Bar (Navy Blue) */}
                  <div
                    style={{ height: `${(d.profit / 120) * 100}%` }}
                    className="w-3.5 sm:w-5 bg-[#102A43] rounded-t-sm transition-all duration-300 group-hover:bg-[#1C3D5A] relative"
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-[#102A43] text-white text-[9px] font-mono py-0.5 px-1 rounded pointer-events-none transition whitespace-nowrap z-10">
                      ₹{d.profit}k
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#6B625A] mt-2 block">{d.month}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-[#6B625A] pt-1">
            <span>Peak Sales Month: <strong>September (₹110,000+)</strong></span>
            <span className="font-mono text-[11px] text-[#68151F] font-bold">Average Margin: 28.4%</span>
          </div>
        </div>

        {/* Right: Top Performing Shops (5 Cols) */}
        <div className="lg:col-span-5 bg-[#FFFDF8] p-5 rounded-xl border border-[#E5DDCF] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#171717]">Top Performing Shops</h2>
              <p className="text-xs text-[#6B625A]">Highest grossing outlets this cycle</p>
            </div>
            <button
              onClick={onNavigateToShops}
              className="text-xs font-semibold text-[#68151F] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-[#E5DDCF]">
            {topShops.map((shop, idx) => (
              <div key={shop.name} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#F7F1E7] border border-[#E5DDCF] flex items-center justify-center text-[10px] font-bold text-[#68151F] font-mono">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-[#171717] block leading-tight">{shop.name}</span>
                    <span className="text-[10px] text-[#6B625A] block mt-0.5">{shop.orders} orders processed</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold font-mono text-[#171717] block leading-tight">{shop.sales}</span>
                  <span className="text-[10px] font-bold text-[#1F7A37] bg-[#EBF7EE] px-1 rounded inline-block mt-0.5">
                    {shop.growth}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Bar from Image */}
      <div className="bg-[#FFFDF8] p-5 rounded-xl border border-[#E5DDCF] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B625A]">
            Platform Quick Actions
          </h3>
          <span className="text-[10px] text-[#6B625A]">Direct shortcuts for platform administration</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={onNavigateToShops}
            className="flex items-center justify-center space-x-2 p-3 rounded-xl border border-[#68151F] text-[#68151F] bg-[#FFFDF8] hover:bg-[#68151F] hover:text-white transition font-medium text-xs cursor-pointer group"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Shop</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToShops}
            className="flex items-center justify-center space-x-2 p-3 rounded-xl border border-[#E5DDCF] text-[#171717] bg-[#F7F1E7] hover:bg-[#EAE3D6] transition font-medium text-xs cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#68151F]" />
            <span>Manage Products</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToInvoices}
            className="flex items-center justify-center space-x-2 p-3 rounded-xl border border-[#E5DDCF] text-[#171717] bg-[#F7F1E7] hover:bg-[#EAE3D6] transition font-medium text-xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-[#102A43]" />
            <span>View Invoices & Billing</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToAudit || onNavigateToShops}
            className="flex items-center justify-center space-x-2 p-3 rounded-xl border border-[#E5DDCF] text-[#171717] bg-[#F7F1E7] hover:bg-[#EAE3D6] transition font-medium text-xs cursor-pointer"
          >
            <Users className="w-4 h-4 text-[#1F7A37]" />
            <span>Platform Audit Log</span>
          </button>
        </div>
      </div>

      {/* Overdue Accounts Alert Table (if any) */}
      {stats.overdueShopsList && stats.overdueShopsList.length > 0 && (
        <div className="p-5 bg-[#FFF5E6] border border-[#FFDEAC] rounded-xl">
          <div className="flex items-center space-x-2 text-[#B25E00] mb-3">
            <AlertTriangle className="w-5 h-5 text-[#B25E00]" />
            <h3 className="text-sm font-bold">Shops With Overdue Commission Payments (POS Access Suspended)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#FFE0B2] text-xs text-left">
              <thead>
                <tr className="text-[#B25E00] font-semibold uppercase">
                  <th className="py-2 px-3">Shop Name</th>
                  <th className="py-2 px-3">Amount Due</th>
                  <th className="py-2 px-3">Grace Period Expired</th>
                  <th className="py-2 px-3">Days Overdue</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FFF3E0] text-[#171717]">
                {stats.overdueShopsList.map((item) => (
                  <tr key={item.shopId} className="hover:bg-[#FFECCB] transition">
                    <td className="py-2.5 px-3 font-semibold">{item.shopName}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#C62828]">₹{item.amountDue.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-[#6B625A]">{new Date(item.gracePeriodEndsAt).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3 font-semibold text-[#B25E00]">{item.daysOverdue} days</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={onNavigateToInvoices}
                        className="px-2.5 py-1 bg-[#68151F] text-white rounded font-medium hover:bg-[#521017] transition cursor-pointer"
                      >
                        Review Invoices
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
