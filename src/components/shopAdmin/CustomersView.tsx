import React, { useState } from 'react';
import { Search, UserPlus, Phone, Award, Clock, ArrowUpRight, X } from 'lucide-react';

export const CustomersView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [customers, setCustomers] = useState([
    { id: 1, name: 'Aakash Verma', phone: '+91 98765 43210', points: 420, visits: 18, spent: 14500, lastVisit: 'Today' },
    { id: 2, name: 'Pooja Sharma', phone: '+91 98112 34567', points: 280, visits: 12, spent: 9800, lastVisit: 'Today' },
    { id: 3, name: 'Vikas Malhotra', phone: '+91 99887 76655', points: 610, visits: 24, spent: 22400, lastVisit: 'Yesterday' },
    { id: 4, name: 'Sneha Rao', phone: '+91 97654 32109', points: 150, visits: 8, spent: 5900, lastVisit: '3 days ago' },
    { id: 5, name: 'Rohan Gupta', phone: '+91 98223 34455', points: 95, visits: 5, spent: 3400, lastVisit: '1 week ago' },
  ]);

  const [form, setForm] = useState({ name: '', phone: '' });

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setCustomers([
      {
        id: Date.now(),
        name: form.name,
        phone: form.phone,
        points: 50,
        visits: 1,
        spent: 0,
        lastVisit: 'Just now',
      },
      ...customers,
    ]);
    setForm({ name: '', phone: '' });
    setShowAddModal(false);
  };

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight font-serif">Customer Directory & Loyalty</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Manage customer contact details, order frequency, and reward points</p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#6A101C] hover:bg-[#7D1422] text-white text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full bg-neutral-50 border border-neutral-200 text-xs pl-9 pr-3 py-2 rounded-xl focus:bg-white focus:outline-none focus:border-[#6A101C]"
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Phone Number</th>
                <th className="py-3.5 px-4">Visits</th>
                <th className="py-3.5 px-4">Total Spent</th>
                <th className="py-3.5 px-4">Loyalty Points</th>
                <th className="py-3.5 px-4 text-right">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50/70 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-[10px] font-bold">
                        {c.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-neutral-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-neutral-600">{c.phone}</td>
                  <td className="py-3.5 px-4 text-neutral-600 font-medium">{c.visits} orders</td>
                  <td className="py-3.5 px-4 font-bold text-neutral-900">₹{c.spent.toLocaleString()}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                      ★ {c.points} pts
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-neutral-500">{c.lastVisit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">Add New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-neutral-50 border border-neutral-200 text-xs px-3 py-2 rounded-xl focus:bg-white focus:outline-none focus:border-[#6A101C]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. +91 98765 00000"
                  className="w-full bg-neutral-50 border border-neutral-200 text-xs px-3 py-2 rounded-xl focus:bg-white focus:outline-none focus:border-[#6A101C]"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#6A101C] hover:bg-[#7D1422] text-white text-xs font-bold shadow-xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
