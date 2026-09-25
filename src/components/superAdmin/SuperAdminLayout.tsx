import React, { useState } from 'react';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { ShopDirectory } from './ShopDirectory';
import { PlatformInvoices } from './PlatformInvoices';
import { AllTransactions } from './AllTransactions';
import { PlatformAuditLog } from './PlatformAuditLog';
import { DatabaseConsole } from '../database/DatabaseConsole';
import { IndustryEnginesHub } from '../industry/IndustryEnginesHub';
import {
  LayoutDashboard,
  Store,
  FileText,
  Receipt,
  ShieldAlert,
  Menu,
  X,
  Search,
  ChevronRight,
  Database,
  Layers,
} from 'lucide-react';

type Tab = 'DASHBOARD' | 'SHOPS' | 'ENGINES' | 'INVOICES' | 'TRANSACTIONS' | 'AUDIT' | 'DATABASES';

export const SuperAdminLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'DASHBOARD' as Tab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'SHOPS' as Tab, label: 'Shops', icon: Store },
    { id: 'ENGINES' as Tab, label: 'Industry Engines', icon: Layers },
    { id: 'TRANSACTIONS' as Tab, label: 'Orders & Transactions', icon: Receipt },
    { id: 'INVOICES' as Tab, label: 'Finance & Invoices', icon: FileText },
    { id: 'AUDIT' as Tab, label: 'Platform Audit', icon: ShieldAlert },
    { id: 'DATABASES' as Tab, label: 'Database Architecture', icon: Database },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-[#F7F1E7]">
      {/* Mobile Sidebar Toggle Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#68151F] text-white border-b border-[#521017]">
        <div className="flex items-center space-x-2">
          <div className="flex items-center font-extrabold text-lg tracking-[0.14em] text-white">
            <span>LUM</span>
            <span className="w-3.5 h-3.5 mx-0.5 rounded-full border border-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E84E59]" />
            </span>
            <span>RA</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-semibold uppercase">Admin</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Admin Portal Left Sidebar (Matching Design Image) */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:flex flex-col w-full md:w-64 bg-[#68151F] text-white shrink-0 md:sticky md:top-16 md:h-[calc(100vh-4rem)] border-r border-[#521017] z-20 shadow-sm`}
      >
        {/* Brand Banner in Sidebar */}
        <div className="p-5 border-b border-white/10 hidden md:block">
          <div className="flex items-center font-extrabold text-2xl tracking-[0.16em] text-white">
            <span>LUM</span>
            <span className="w-5 h-5 mx-1 rounded-full border-[2px] border-white flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-[#E84E59]" />
            </span>
            <span>RA</span>
          </div>
          <span className="text-[9px] uppercase tracking-[0.2em] font-semibold text-white/60 block mt-1">
            Admin Portal
          </span>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
            Platform Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-super-${item.id.toLowerCase()}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-[#FFFDF8] text-[#68151F] shadow-sm font-bold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#68151F]' : 'text-white/70'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#68151F]" />}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer Profile (Matching RS from Image) */}
        <div className="p-4 border-t border-white/10 bg-[#521017]/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#FFFDF8] text-[#68151F] flex items-center justify-center font-bold text-xs font-mono shadow-xs">
              RS
            </div>
            <div className="text-left leading-tight">
              <span className="text-xs font-bold text-white block">Raghav Sharma</span>
              <span className="text-[10px] text-white/70 block">Super Admin</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'DASHBOARD' && (
          <SuperAdminDashboard
            onNavigateToShops={() => setActiveTab('SHOPS')}
            onNavigateToInvoices={() => setActiveTab('INVOICES')}
            onNavigateToTransactions={() => setActiveTab('TRANSACTIONS')}
            onNavigateToAudit={() => setActiveTab('AUDIT')}
          />
        )}
        {activeTab === 'SHOPS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DDCF]">
              <div>
                <h1 className="text-xl font-serif font-bold text-[#171717]">Shop Directory</h1>
                <p className="text-xs text-[#6B625A]">Manage registered shops, commission tier, and store status</p>
              </div>
            </div>
            <ShopDirectory />
          </div>
        )}
        {activeTab === 'ENGINES' && (
          <IndustryEnginesHub />
        )}
        {activeTab === 'INVOICES' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DDCF]">
              <div>
                <h1 className="text-xl font-serif font-bold text-[#171717]">Finance & Commission Invoices</h1>
                <p className="text-xs text-[#6B625A]">Authoritative 2% monthly billing statements and collection</p>
              </div>
            </div>
            <PlatformInvoices />
          </div>
        )}
        {activeTab === 'TRANSACTIONS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DDCF]">
              <div>
                <h1 className="text-xl font-serif font-bold text-[#171717]">Network Transactions</h1>
                <p className="text-xs text-[#6B625A]">Real-time sales feed across all connected retail outlets</p>
              </div>
            </div>
            <AllTransactions />
          </div>
        )}
        {activeTab === 'AUDIT' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DDCF]">
              <div>
                <h1 className="text-xl font-serif font-bold text-[#171717]">Platform Audit Log</h1>
                <p className="text-xs text-[#6B625A]">Authoritative security, impersonation, and policy audit trails</p>
              </div>
            </div>
            <PlatformAuditLog />
          </div>
        )}
        {activeTab === 'DATABASES' && (
          <DatabaseConsole />
        )}
      </main>
    </div>
  );
};
