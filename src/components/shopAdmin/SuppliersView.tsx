import React, { useState } from 'react';
import { Search, Truck, Phone, Plus, CheckCircle2, AlertCircle } from 'lucide-react';

export const SuppliersView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const suppliers = [
    { id: 1, name: 'Nestle India Distribution', category: 'Packaged Foods & Dairy', contact: '+91 11 2345 6789', person: 'Rajesh Nair', pendingOrders: 2, balance: 18450, status: 'Active' },
    { id: 2, name: 'Hindustan Unilever Ltd', category: 'Personal Care & Groceries', contact: '+91 22 3987 6543', person: 'Amitabh Joshi', pendingOrders: 1, balance: 34200, status: 'Active' },
    { id: 3, name: 'Coca-Cola Beverages Pvt', category: 'Cold Drinks & Juices', contact: '+91 12 4455 6677', person: 'Sandeep Sethi', pendingOrders: 0, balance: 0, status: 'Active' },
    { id: 4, name: 'Amul Gujarat Co-op', category: 'Dairy & Ice Cream', contact: '+91 26 9225 8506', person: 'Bhavin Patel', pendingOrders: 3, balance: 12100, status: 'Active' },
    { id: 5, name: 'Britannia Industries', category: 'Bakery & Biscuits', contact: '+91 80 3768 7000', person: 'Kavita Menon', pendingOrders: 0, balance: 4500, status: 'Active' },
  ];

  const filtered = suppliers.filter(
    (s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight font-serif">Suppliers & Vendor Accounts</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Manage inventory distributors, purchase orders, and payable vendor balances</p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search suppliers or categories..."
            className="w-full bg-neutral-50 border border-neutral-200 text-xs pl-9 pr-3 py-2 rounded-xl focus:bg-white focus:outline-none focus:border-[#6A101C]"
          />
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Supplier Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Open POs</th>
                <th className="py-3.5 px-4 text-right">Payable Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-neutral-900 flex items-center space-x-2">
                    <Truck className="w-4 h-4 text-neutral-400" />
                    <span>{s.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-neutral-600">{s.category}</td>
                  <td className="py-3.5 px-4 text-neutral-700 font-medium">{s.person}</td>
                  <td className="py-3.5 px-4 font-mono text-neutral-500 text-[11px]">{s.contact}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-semibold text-[11px]">
                      {s.pendingOrders} PO(s)
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-[#6A101C]">
                    ₹{s.balance.toLocaleString()}
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
