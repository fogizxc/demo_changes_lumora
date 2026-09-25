import React, { useState } from 'react';
import {
  ShoppingCart,
  Package,
  Boxes,
  Users,
  TrendingUp,
  BarChart3,
  Layers,
  AlertTriangle,
  FileText,
  Trophy,
  ArrowRight,
  ChevronDown,
  Store,
  Zap,
  PlusCircle,
  UserPlus,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import fixedRetailBg from '../../assets/images/lumora_store_bg_1789807039446.jpg';

interface ShopDashboardOverviewProps {
  onNavigate: (tab: string) => void;
  shopName?: string;
  storeLocation?: string;
  managerName?: string;
}

export const ShopDashboardOverview: React.FC<ShopDashboardOverviewProps> = ({
  onNavigate,
  shopName = 'Main Store',
  storeLocation = 'Delhi, IN',
  managerName = 'Raghav',
}) => {
  const [salesTimeframe, setSalesTimeframe] = useState<'Today' | 'This Week' | 'This Month'>('Today');
  const [topProductsTimeframe, setTopProductsTimeframe] = useState<'Today' | 'This Week'>('Today');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(7); // Peak at 3 PM default active

  // Hourly sales data matching the reference image
  const hourlyData = [
    { label: '6 AM', val: 2500, height: 18 },
    { label: '7 AM', val: 5200, height: 26 },
    { label: '8 AM', val: 7800, height: 35 },
    { label: '9 AM', val: 12400, height: 44 },
    { label: '10 AM', val: 18200, height: 58 },
    { label: '11 AM', val: 16100, height: 52 },
    { label: '12 PM', val: 22400, height: 68 },
    { label: '1 PM', val: 19800, height: 60 },
    { label: '2 PM', val: 24500, height: 74 },
    { label: '3 PM', val: 28450, height: 86, isPeak: true },
    { label: '4 PM', val: 21100, height: 64 },
    { label: '5 PM', val: 23600, height: 72 },
    { label: '6 PM', val: 17900, height: 54 },
    { label: '7 PM', val: 22800, height: 70 },
    { label: '8 PM', val: 26200, height: 80 },
    { label: '9 PM', val: 19400, height: 60 },
  ];

  // Payment methods breakdown
  const paymentMethods = [
    { label: 'UPI', percentage: 46, amount: '₹ 40,213', color: '#6A101C' },
    { label: 'Card', percentage: 28, amount: '₹ 24,477', color: '#1E3A8A' },
    { label: 'Cash', percentage: 20, amount: '₹ 17,484', color: '#D97706' },
    { label: 'Wallet', percentage: 6, amount: '₹ 5,245', color: '#94A3B8' },
  ];

  // Low stock products
  const lowStockItems = [
    { name: 'Maggi Noodles 70g', sku: 'MAG001', stock: 5, category: 'Instant Food' },
    { name: 'Coca-Cola 500ml', sku: 'COK002', stock: 8, category: 'Beverages' },
    { name: 'Amul Milk 1L', sku: 'AMU003', stock: 6, category: 'Dairy' },
    { name: 'Lay\'s Classic 52g', sku: 'LAY004', stock: 4, category: 'Snacks' },
  ];

  // Recent orders
  const recentOrders = [
    { id: '#ORD1256', amount: '₹420', time: '2 min ago', status: 'Completed' },
    { id: '#ORD1255', amount: '₹1,240', time: '12 min ago', status: 'Completed' },
    { id: '#ORD1254', amount: '₹360', time: '25 min ago', status: 'Completed' },
    { id: '#ORD1253', amount: '₹980', time: '41 min ago', status: 'Pending' },
    { id: '#ORD1252', amount: '₹650', time: '1 hr ago', status: 'Completed' },
  ];

  // Top products
  const topProducts = [
    { rank: 1, name: 'Maggi Noodles 70g', sales: '124 sold' },
    { rank: 2, name: 'Coca-Cola 500ml', sales: '98 sold' },
    { rank: 3, name: 'Lay\'s Classic 52g', sales: '86 sold' },
    { rank: 4, name: 'Amul Milk 1L', sales: '72 sold' },
    { rank: 5, name: 'Britannia Bread', sales: '62 sold' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* GREETING & STORE SELECTOR HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#171717] tracking-tight font-serif"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Good Morning, {managerName}!
          </h1>
          <p className="text-xs sm:text-sm text-[#6B625A] mt-0.5">
            Here's what's happening at your store today.
          </p>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-[#6B625A] font-medium">Tuesday, 16 Sep 2026</div>
            <div className="text-sm font-bold text-[#171717]">09:24 AM</div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl px-4 py-2 flex items-center space-x-3 shadow-2xs hover:border-[#D1D5DB] transition cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[#171717]">
              <Store className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-[#171717] leading-tight">{shopName}</div>
              <div className="text-[10px] text-[#6B625A]">{storeLocation}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] ml-1" />
          </div>
        </div>
      </div>

      {/* 4 SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Today's Sales */}
        <div className="bg-[#FFF5F5] border border-rose-100 rounded-3xl p-5 sm:p-6 transition hover:shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100/80 flex items-center justify-center text-rose-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl sm:text-[26px] font-black text-[#171717] tracking-tight block">
                ₹ 87,420
              </span>
              <span className="text-xs text-[#6B625A] font-medium">Today's Sales</span>
            </div>
          </div>

          <div className="flex items-end justify-between mt-4">
            <span className="text-xs font-bold text-emerald-600 flex items-center">
              <span className="mr-0.5">↑</span> 12%
            </span>

            {/* Sparkline curve */}
            <svg className="w-24 h-8 overflow-visible" viewBox="0 0 100 30" fill="none">
              <path
                d="M 0 25 Q 25 22, 45 20 T 75 12 T 100 4"
                stroke="#E11D48"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Orders */}
        <div className="bg-[#F0F9FF] border border-sky-100 rounded-3xl p-5 sm:p-6 transition hover:shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100/80 flex items-center justify-center text-sky-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl sm:text-[26px] font-black text-[#171717] tracking-tight block">
                128
              </span>
              <span className="text-xs text-[#6B625A] font-medium">Orders</span>
            </div>
          </div>

          <div className="flex items-end justify-between mt-4">
            <span className="text-xs font-bold text-emerald-600 flex items-center">
              <span className="mr-0.5">↑</span> 8%
            </span>

            {/* Sparkline curve */}
            <svg className="w-24 h-8 overflow-visible" viewBox="0 0 100 30" fill="none">
              <path
                d="M 0 26 Q 30 24, 55 18 T 80 14 T 100 6"
                stroke="#0284C7"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: Products */}
        <div className="bg-[#F0FDF4] border border-emerald-100 rounded-3xl p-5 sm:p-6 transition hover:shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 flex items-center justify-center text-emerald-600">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl sm:text-[26px] font-black text-[#171717] tracking-tight block">
                1,284
              </span>
              <span className="text-xs text-[#6B625A] font-medium">Products</span>
            </div>
          </div>

          <div className="flex items-end justify-between mt-4">
            <span className="text-xs font-bold text-emerald-600 flex items-center">
              <span className="mr-0.5">↑</span> 5%
            </span>

            {/* Sparkline curve */}
            <svg className="w-24 h-8 overflow-visible" viewBox="0 0 100 30" fill="none">
              <path
                d="M 0 24 Q 25 24, 50 16 T 80 12 T 100 5"
                stroke="#16A34A"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 4: Customers */}
        <div className="bg-[#FFFBEB] border border-amber-100 rounded-3xl p-5 sm:p-6 transition hover:shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100/80 flex items-center justify-center text-amber-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl sm:text-[26px] font-black text-[#171717] tracking-tight block">
                842
              </span>
              <span className="text-xs text-[#6B625A] font-medium">Customers</span>
            </div>
          </div>

          <div className="flex items-end justify-between mt-4">
            <span className="text-xs font-bold text-emerald-600 flex items-center">
              <span className="mr-0.5">↑</span> 11%
            </span>

            {/* Sparkline curve */}
            <svg className="w-24 h-8 overflow-visible" viewBox="0 0 100 30" fill="none">
              <path
                d="M 0 25 Q 30 22, 60 18 T 85 14 T 100 8"
                stroke="#D97706"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ROW 2: SALES OVERVIEW (BAR CHART) + PAYMENT METHODS (DONUT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sales Overview (7-8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2.5">
              <div className="w-4 h-4 text-rose-600">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-[#171717]">Sales Overview</h2>
            </div>

            <div className="relative">
              <select
                value={salesTimeframe}
                onChange={(e) => setSalesTimeframe(e.target.value as any)}
                className="text-xs font-semibold bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-[#374151] pr-7 appearance-none cursor-pointer focus:outline-none"
              >
                <option value="Today">Today</option>
                <option value="This Week">This Week</option>
                <option value="This Month">This Month</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[#6B7280] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Chart Container */}
          <div className="relative pt-6">
            {/* Peak Tooltip above 3 PM */}
            {hoveredBarIndex !== null && (
              <div
                className="absolute z-10 -top-2 transform -translate-x-1/2 bg-[#111827] text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-lg flex items-center space-x-1 pointer-events-none transition-all duration-150"
                style={{
                  left: `${((hoveredBarIndex + 0.5) / hourlyData.length) * 100}%`,
                }}
              >
                <span className="font-bold">₹ {hourlyData[hoveredBarIndex].val.toLocaleString()}</span>
                <span className="text-gray-400">| {hourlyData[hoveredBarIndex].label}</span>
              </div>
            )}

            {/* Grid Lines */}
            <div className="h-52 flex flex-col justify-between relative border-b border-[#E5E7EB] pb-2">
              <div className="w-full border-t border-[#F3F4F6] relative">
                <span className="absolute -top-2.5 -left-8 text-[10px] text-[#9CA3AF] font-medium">40K</span>
              </div>
              <div className="w-full border-t border-[#F3F4F6] relative">
                <span className="absolute -top-2.5 -left-8 text-[10px] text-[#9CA3AF] font-medium">30K</span>
              </div>
              <div className="w-full border-t border-[#F3F4F6] relative">
                <span className="absolute -top-2.5 -left-8 text-[10px] text-[#9CA3AF] font-medium">20K</span>
              </div>
              <div className="w-full border-t border-[#F3F4F6] relative">
                <span className="absolute -top-2.5 -left-8 text-[10px] text-[#9CA3AF] font-medium">10K</span>
              </div>
              <div className="w-full border-t border-transparent relative">
                <span className="absolute -top-2.5 -left-8 text-[10px] text-[#9CA3AF] font-medium">0</span>
              </div>

              {/* Bars flex row */}
              <div className="absolute inset-0 pl-2 pr-2 flex items-end justify-between gap-1.5 sm:gap-2">
                {hourlyData.map((item, index) => {
                  const isHovered = hoveredBarIndex === index;
                  return (
                    <div
                      key={item.label}
                      onMouseEnter={() => setHoveredBarIndex(index)}
                      className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                    >
                      <div
                        className="w-full max-w-[18px] sm:max-w-[22px] rounded-t-sm transition-all duration-200"
                        style={{
                          height: `${item.height}%`,
                          backgroundColor: item.isPeak || isHovered ? '#6A101C' : '#8B1E2D',
                          opacity: hoveredBarIndex !== null && !isHovered ? 0.75 : 1,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between pl-2 pr-2 pt-2 text-[11px] text-[#6B7280] font-medium">
              <span>6 AM</span>
              <span>9 AM</span>
              <span>12 PM</span>
              <span>3 PM</span>
              <span>6 PM</span>
              <span>9 PM</span>
            </div>
          </div>
        </div>

        {/* Payment Methods (4-5 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E5E7EB] rounded-3xl p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center space-x-2.5 mb-4">
            <div className="w-4 h-4 text-rose-600">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-[#171717]">Payment Methods</h2>
          </div>

          {/* Donut Chart & Legend Row */}
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center justify-center gap-6 my-auto py-2">
            {/* SVG Donut */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
                {/* UPI: 46% (0 to 165.6 deg) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#6A101C"
                  strokeWidth="18"
                  strokeDasharray="109.8 238.7"
                  strokeDashoffset="0"
                />
                {/* Card: 28% (165.6 to 266.4 deg) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#1E3A8A"
                  strokeWidth="18"
                  strokeDasharray="66.8 238.7"
                  strokeDashoffset="-109.8"
                />
                {/* Cash: 20% (266.4 to 338.4 deg) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#D97706"
                  strokeWidth="18"
                  strokeDasharray="47.7 238.7"
                  strokeDashoffset="-176.6"
                />
                {/* Wallet: 6% (338.4 to 360 deg) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#94A3B8"
                  strokeWidth="18"
                  strokeDasharray="14.3 238.7"
                  strokeDashoffset="-224.3"
                />
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-base font-black text-[#171717] tracking-tight">₹ 87,420</span>
                <span className="text-[10px] text-[#6B7280] font-medium">Total Sales</span>
              </div>
            </div>

            {/* Legend List */}
            <div className="space-y-3 w-full max-w-[160px]">
              {paymentMethods.map((m) => (
                <div key={m.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="text-[#374151] font-medium">{m.label}</span>
                  </div>
                  <span className="font-bold text-[#111827]">{m.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#F3F4F6] flex items-center justify-between text-[11px] text-[#6B7280]">
            <span>Fastest growing method:</span>
            <span className="font-bold text-[#6A101C]">UPI (+18%)</span>
          </div>
        </div>
      </div>

      {/* ROW 3: TRIPLE CARDS (LOW STOCK ALERTS + RECENT ORDERS + TOP PRODUCTS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Low Stock Alerts */}
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#171717]">Low Stock Alerts</h3>
              </div>
              <button
                onClick={() => onNavigate('Inventory')}
                className="text-xs font-bold text-[#6A101C] hover:underline flex items-center space-x-0.5 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>

            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div
                  key={item.sku}
                  className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-none"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-center text-xs font-bold text-[#6B7280]">
                      {item.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#171717] leading-tight">{item.name}</h4>
                      <p className="text-[10px] text-[#6B7280] font-mono mt-0.5">SKU: {item.sku}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                    {item.stock} left
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Recent Orders */}
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 text-rose-600">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#171717]">Recent Orders</h3>
              </div>
              <button
                onClick={() => onNavigate('Orders')}
                className="text-xs font-bold text-[#6A101C] hover:underline flex items-center space-x-0.5 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </button>
            </div>

            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-none"
                >
                  <div className="flex items-center space-x-3">
                    <div>
                      <span className="text-xs font-bold text-[#111827]">{order.id}</span>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">{order.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-bold text-[#171717]">{order.amount}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        order.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Top Products */}
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 text-amber-500">
                  <Trophy className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#171717]">Top Products</h3>
              </div>

              <div className="relative">
                <select
                  value={topProductsTimeframe}
                  onChange={(e) => setTopProductsTimeframe(e.target.value as any)}
                  className="text-[11px] font-semibold bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-2.5 py-1 text-[#374151] pr-6 appearance-none cursor-pointer focus:outline-none"
                >
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#6B7280] absolute right-2 top-2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              {topProducts.map((p) => (
                <div
                  key={p.rank}
                  className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-none"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-5 text-center text-xs font-bold text-[#6B7280]">{p.rank}</span>
                    <span className="text-xs font-medium text-[#171717]">{p.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-[#6B7280]">{p.sales}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ROW 4: BOTTOM HERO PROMO CARD + QUICK ACTIONS + QUOTE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Hero Card with Photographic Store Background (7-8 cols) */}
        <div className="lg:col-span-8 relative rounded-3xl overflow-hidden min-h-[220px] sm:min-h-[250px] shadow-sm flex items-center p-6 sm:p-10 border border-black/10">
          {/* Background image */}
          <img
            src={fixedRetailBg}
            alt="Faster Billing. Happier Customers."
            className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.6] contrast-[1.08]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />

          <div className="relative z-10 max-w-lg">
            <h3
              className="text-2xl sm:text-3xl lg:text-[34px] font-bold text-white tracking-tight leading-tight font-serif"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Faster Billing.
              <br />
              Happier Customers.
            </h3>
            <p className="text-xs sm:text-sm text-gray-200 mt-2 max-w-md">
              Everything you need to run your store, in one powerful system.
            </p>

            <button
              type="button"
              onClick={() => onNavigate('Billing (POS)')}
              className="mt-5 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#7A1422] hover:bg-[#8D1827] text-white text-xs sm:text-sm font-bold shadow-lg shadow-black/40 transition transform active:scale-98 cursor-pointer"
            >
              <span>Start Billing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Quick Actions + Quote (4-5 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Quick Actions */}
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-5 shadow-2xs flex-1 flex flex-col justify-between">
            <div className="flex items-center space-x-2 mb-3">
              <Zap className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-[#171717]">Quick Actions</h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onNavigate('Billing (POS)')}
                className="flex items-center space-x-2 p-3 rounded-2xl border border-[#E5E7EB] hover:border-rose-300 hover:bg-rose-50/50 transition text-left cursor-pointer group"
              >
                <ShoppingCart className="w-4 h-4 text-[#6A101C] group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-[#171717]">New Sale</span>
              </button>

              <button
                onClick={() => onNavigate('Products')}
                className="flex items-center space-x-2 p-3 rounded-2xl border border-[#E5E7EB] hover:border-sky-300 hover:bg-sky-50/50 transition text-left cursor-pointer group"
              >
                <Package className="w-4 h-4 text-sky-600 group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-[#171717]">Add Product</span>
              </button>

              <button
                onClick={() => onNavigate('Customers')}
                className="flex items-center space-x-2 p-3 rounded-2xl border border-[#E5E7EB] hover:border-amber-300 hover:bg-amber-50/50 transition text-left cursor-pointer group"
              >
                <UserPlus className="w-4 h-4 text-amber-600 group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-[#171717]">Add Customer</span>
              </button>

              <button
                onClick={() => onNavigate('Reports')}
                className="flex items-center space-x-2 p-3 rounded-2xl border border-[#E5E7EB] hover:border-emerald-300 hover:bg-emerald-50/50 transition text-left cursor-pointer group"
              >
                <BarChart3 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-[#171717]">View Reports</span>
              </button>
            </div>
          </div>

          {/* Quote Card */}
          <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-3xl p-5 text-center flex items-center justify-center min-h-[90px]">
            <p
              className="text-xs sm:text-sm text-[#524B43] italic font-serif leading-relaxed"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              “Small steps every day lead to big results.”
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
