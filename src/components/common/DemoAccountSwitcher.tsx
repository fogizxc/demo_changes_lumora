import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Store, UserCheck, Users, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoAccountSwitcher: React.FC<Props> = ({ isOpen, onClose }) => {
  const { loginAdmin, loginEmployee, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSuperAdmin = async () => {
    setError(null);
    try {
      await loginAdmin('superadmin@pos-erp.com', 'SuperAdmin123!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to switch');
    }
  };

  const handleShopAdmin = async () => {
    setError(null);
    try {
      await loginAdmin('shopadmin@urbanmart.com', 'ShopAdmin123!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to switch');
    }
  };

  const handleShiftLead = async () => {
    setError(null);
    try {
      await loginEmployee('shp_urbanmart_01', 'EMP-01', '1234');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to switch');
    }
  };

  const handleCashier = async () => {
    setError(null);
    try {
      await loginEmployee('shp_urbanmart_01', 'EMP-02', '5678');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to switch');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div id="modal-role-switcher" className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-neutral-200 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/80">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Switch Operational Role</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Quickly test RBAC and terminal workflows across all 4 tiers</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        <div className="p-6 space-y-3">
          {/* Super Admin */}
          <button
            id="switch-super-admin"
            disabled={isLoading}
            onClick={handleSuperAdmin}
            className="w-full text-left p-4 rounded-xl border border-purple-200 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-300 transition group flex items-start space-x-3.5 cursor-pointer disabled:opacity-50"
          >
            <div className="p-2.5 rounded-lg bg-purple-600 text-white shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-900 group-hover:text-purple-900">1. Super Admin</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800">Platform Control</span>
              </div>
              <p className="text-xs text-neutral-600 mt-1">Platform dashboard, shop management, commission invoices, all transactions, view-as support mode</p>
              <p className="text-[11px] text-neutral-400 font-mono mt-1">superadmin@pos-erp.com</p>
            </div>
          </button>

          {/* Shop Admin */}
          <button
            id="switch-shop-admin"
            disabled={isLoading}
            onClick={handleShopAdmin}
            className="w-full text-left p-4 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300 transition group flex items-start space-x-3.5 cursor-pointer disabled:opacity-50"
          >
            <div className="p-2.5 rounded-lg bg-blue-600 text-white shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-900 group-hover:text-blue-900">2. Shop Admin</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">Shop ERP</span>
              </div>
              <p className="text-xs text-neutral-600 mt-1">Manage staff, inventory, business profile & GST, view monthly billing and shop audit log</p>
              <p className="text-[11px] text-neutral-400 font-mono mt-1">Urban Mart Retail • shopadmin@urbanmart.com</p>
            </div>
          </button>

          {/* Shift Lead */}
          <button
            id="switch-shift-lead"
            disabled={isLoading}
            onClick={handleShiftLead}
            className="w-full text-left p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-300 transition group flex items-start space-x-3.5 cursor-pointer disabled:opacity-50"
          >
            <div className="p-2.5 rounded-lg bg-emerald-600 text-white shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-900 group-hover:text-emerald-900">3. Shift Lead (POS)</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Lead Cashier</span>
              </div>
              <p className="text-xs text-neutral-600 mt-1">POS terminal checkout, authorized line discounts, authorized void operations with stock restoration</p>
              <p className="text-[11px] text-neutral-400 font-mono mt-1">Sarah Jenkins (EMP-01) • PIN: 1234</p>
            </div>
          </button>

          {/* Cashier */}
          <button
            id="switch-cashier"
            disabled={isLoading}
            onClick={handleCashier}
            className="w-full text-left p-4 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-300 transition group flex items-start space-x-3.5 cursor-pointer disabled:opacity-50"
          >
            <div className="p-2.5 rounded-lg bg-amber-600 text-white shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-900 group-hover:text-amber-900">4. Cashier (POS)</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800">Standard Till</span>
              </div>
              <p className="text-xs text-neutral-600 mt-1">Normal billing, sales creation, GST receipts. Restricted from applying discounts or performing voids</p>
              <p className="text-[11px] text-neutral-400 font-mono mt-1">Alex Patel (EMP-02) • PIN: 5678</p>
            </div>
          </button>
        </div>

        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-200 text-neutral-700 hover:bg-neutral-300 rounded-lg text-xs font-semibold transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
