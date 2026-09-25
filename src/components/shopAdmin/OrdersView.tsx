import React, { useState } from 'react';
import { Search, Filter, ArrowUpDown, CheckCircle2, Clock, Eye, Download, ChevronRight } from 'lucide-react';

export const OrdersView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const orders = [
    { id: '#ORD1256', customer: 'Walk-in Customer', items: 3, total: 420, method: 'UPI', status: 'Completed', time: '2 min ago', date: '16 Sep 2026, 09:22 AM' },
    { id: '#ORD1255', customer: 'Aakash Verma', items: 5, total: 1240, method: 'Card', status: 'Completed', time: '12 min ago', date: '16 Sep 2026, 09:12 AM' },
    { id: '#ORD1254', customer: 'Pooja Sharma', items: 2, total: 360, method: 'UPI', status: 'Completed', time: '25 min ago', date: '16 Sep 2026, 08:59 AM' },
    { id: '#ORD1253', customer: 'Vikas Malhotra', items: 6, total: 980, method: 'Cash', status: 'Pending', time: '41 min ago', date: '16 Sep 2026, 08:43 AM' },
    { id: '#ORD1252', customer: 'Walk-in Customer', items: 4, total: 650, method: 'UPI', status: 'Completed', time: '1 hr ago', date: '16 Sep 2026, 08:24 AM' },
    { id: '#ORD1251', customer: 'Sneha Rao', items: 8, total: 2150, method: 'Card', status: 'Completed', time: '2 hrs ago', date: '16 Sep 2026, 07:15 AM' },
    { id: '#ORD1250', customer: 'Rohan Gupta', items: 1, total: 120, method: 'UPI', status: 'Completed', time: '3 hrs ago', date: '16 Sep 2026, 06:40 AM' },
  ];

  const filtered = orders.filter((o) => {
    const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) || o.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight font-serif">Recent Store Orders</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Real-time ledger of completed and pending checkout transactions</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order ID or customer..."
            className="w-full bg-neutral-50 border border-neutral-200 text-xs pl-9 pr-3 py-2 rounded-xl focus:bg-white focus:outline-none focus:border-[#6A101C]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Time</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-neutral-50/70 transition">
                  <td className="py-3 px-4 font-bold text-[#6A101C]">{order.id}</td>
                  <td className="py-3 px-4 font-medium text-neutral-900">{order.customer}</td>
                  <td className="py-3 px-4 text-neutral-500">{order.items} items</td>
                  <td className="py-3 px-4 font-bold text-neutral-900">₹{order.total.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-neutral-100 font-medium text-neutral-700 text-[11px]">
                      {order.method}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-neutral-500 text-[11px]">{order.time}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
