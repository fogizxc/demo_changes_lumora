import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SupportBanner } from './SupportBanner';
import { DemoAccountSwitcher } from './DemoAccountSwitcher';
import { SystemTestRunner } from '../test/SystemTestRunner';
import { BrandLogo } from './BrandLogo';
import { LogOut, RefreshCw, Store, ShieldCheck, Bell } from 'lucide-react';

export const Header: React.FC = () => {
  const { role, user, employee, shop, logout } = useAuth();
  const [showDemoSwitcher, setShowDemoSwitcher] = useState(false);
  const [showTestRunner, setShowTestRunner] = useState(false);

  const getRoleBadge = () => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#68151F] text-white">
            Super Admin
          </span>
        );
      case 'SHOP_ADMIN':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#102A43] text-white">
            Shopkeeper
          </span>
        );
      case 'SHIFT_LEAD':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#EBF7EE] text-[#1F7A37] border border-[#C6E7CD]">
            Shift Lead
          </span>
        );
      case 'CASHIER':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#FFF5E6] text-[#B25E00] border border-[#FFDEAC]">
            Cashier
          </span>
        );
      default:
        return null;
    }
  };

  const getInitials = () => {
    if (employee?.name) {
      return employee.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    if (role === 'SUPER_ADMIN') return 'RS';
    if (role === 'SHOP_ADMIN') return 'SG';
    return 'AK';
  };

  return (
    <header className="border-b border-[#E5DDCF] bg-[#FFFDF8] sticky top-0 z-40 shadow-xs">
      <SupportBanner />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Context */}
        <div className="flex items-center space-x-4">
          <BrandLogo size="md" variant="dark" />

          {shop && (
            <div className="hidden md:flex items-center space-x-2 pl-4 border-l border-[#E5DDCF]">
              <Store className="w-4 h-4 text-[#68151F]" />
              <span className="text-xs font-bold text-[#171717]">{shop.name}</span>
              {shop.gst_number && (
                <span className="text-[10px] text-[#6B625A] font-mono">({shop.gst_number})</span>
              )}
            </div>
          )}
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Notifications sample matching image */}
          <div className="relative p-2 rounded-lg text-[#6B625A] hover:bg-[#F7F1E7] transition cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#9A303B]"></span>
          </div>

          {/* Quick Demo Switcher */}
          <button
            id="btn-open-role-switcher"
            onClick={() => setShowDemoSwitcher(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#E5DDCF] bg-[#F7F1E7] hover:bg-[#EAE3D6] text-[#171717] text-xs font-semibold transition cursor-pointer"
            title="Switch between Admin, Shopkeeper, and Employee Portals"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#68151F]" />
            <span className="hidden sm:inline">Switch Portal</span>
          </button>

          {/* Test Runner */}
          <button
            id="btn-open-test-runner"
            onClick={() => setShowTestRunner(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#C6E7CD] bg-[#EBF7EE] hover:bg-[#D7EFE0] text-[#1F7A37] text-xs font-semibold transition cursor-pointer"
            title="Run Automated Verification Tests"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#1F7A37]" />
            <span className="hidden sm:inline">Tests</span>
          </button>

          {/* Role & Name */}
          <div className="flex items-center space-x-2 pl-2">
            {getRoleBadge()}
            <div className="hidden lg:flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-[#68151F] text-white flex items-center justify-center text-xs font-bold font-mono">
                {getInitials()}
              </div>
              <div className="text-left leading-tight">
                <span className="text-xs font-bold text-[#171717] block">
                  {employee ? employee.name : user?.email === 'superadmin@pos-erp.com' ? 'Raghav Sharma' : user?.email || 'User'}
                </span>
                <span className="text-[10px] text-[#6B625A] block">
                  {role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'SHOP_ADMIN' ? 'Shopkeeper' : 'Employee'}
                </span>
              </div>
            </div>
          </div>

          {/* Logout button */}
          <button
            id="btn-logout"
            onClick={logout}
            className="p-2 rounded-lg text-[#6B625A] hover:text-[#9A303B] hover:bg-[#FDF0F0] transition cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <DemoAccountSwitcher isOpen={showDemoSwitcher} onClose={() => setShowDemoSwitcher(false)} />
      <SystemTestRunner isOpen={showTestRunner} onClose={() => setShowTestRunner(false)} />
    </header>
  );
};
