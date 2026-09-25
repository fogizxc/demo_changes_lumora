import React, { useState } from 'react';
import { ShopSidebar, ShopSidebarTab } from './ShopSidebar';
import { ShopTopBar } from './ShopTopBar';
import { ShopDashboardOverview } from './ShopDashboardOverview';
import { StaffManagement } from './StaffManagement';
import { InventoryManagement } from './InventoryManagement';
import { BusinessProfile } from './BusinessProfile';
import { ShopBilling } from './ShopBilling';
import { ShopAuditLog } from './ShopAuditLog';
import { ShopOverview } from './ShopOverview';
import { OrdersView } from './OrdersView';
import { CustomersView } from './CustomersView';
import { SuppliersView } from './SuppliersView';
import { POSTerminal } from '../pos/POSTerminal';
import { HealthcareEngineView } from '../industry/HealthcareEngineView';
import { GymEngineView } from '../industry/GymEngineView';
import { RestaurantEngineView } from '../industry/RestaurantEngineView';
import { RentalEngineView } from '../industry/RentalEngineView';
import { RepairEngineView } from '../industry/RepairEngineView';
import { getShopArchitecture, ARCHITECTURES } from '../../utils/architecture';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CommandPalette } from '../common/CommandPalette';

export const ShopAdminLayout: React.FC = () => {
  const { shop, user } = useAuth();
  const [activeTab, setActiveTab] = useState<ShopSidebarTab>('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const architecture = getShopArchitecture(shop?.shop_type);
  const meta = ARCHITECTURES[architecture];

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-neutral-900 flex font-sans antialiased">
      {/* GLOBAL ENTERPRISE COMMAND PALETTE */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab as ShopSidebarTab)}
      />

      {/* LEFT FIXED SIDEBAR - Strictly filtered to the active shop architecture */}
      <ShopSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* MAIN CONTENT CANVAS */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* STICKY TOP APP BAR */}
        <ShopTopBar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          managerName={(user as any)?.name || (user?.email ? user.email.split('@')[0] : 'Manager')}
          managerRole={meta.managerRole}
        />

        {/* SCROLLABLE INNER WORKSPACE */}
        <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 max-w-7xl w-full mx-auto">
          {/* Retail Billing (POS) mode special banner with back to dashboard */}
          {architecture === 'RETAIL' && activeTab === 'Billing (POS)' && (
            <div className="mb-4 flex items-center justify-between bg-white border border-[#E5E7EB] p-3 rounded-2xl shadow-2xs">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('Dashboard')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Dashboard</span>
                </button>
                <div className="text-xs font-semibold text-neutral-600 hidden sm:block">
                  Live POS Terminal Cashier Session Active
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                ● Till Ready
              </span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1. RETAIL / GROCERY STORE PORTAL                                          */}
          {/* Only rendered when shop architecture is RETAIL                            */}
          {/* ========================================================================= */}
          {architecture === 'RETAIL' && (
            <>
              {activeTab === 'Dashboard' && (
                <ShopDashboardOverview
                  onNavigate={(tab) => setActiveTab(tab as ShopSidebarTab)}
                  shopName={shop?.name || 'Main Store'}
                  storeLocation="Delhi, IN"
                  managerName="Raghav"
                />
              )}
              {activeTab === 'Billing (POS)' && <POSTerminal />}
              {(activeTab === 'Products' || activeTab === 'Inventory') && (
                <InventoryManagement />
              )}
              {activeTab === 'Customers' && <CustomersView />}
              {activeTab === 'Orders' && <OrdersView />}
              {activeTab === 'Suppliers' && <SuppliersView />}
              {activeTab === 'Expenses' && <ShopBilling />}
            </>
          )}

          {/* ========================================================================= */}
          {/* 2. HOSPITAL & HEALTHCARE CLINIC PORTAL                                    */}
          {/* Only rendered when shop architecture is HEALTHCARE                        */}
          {/* ========================================================================= */}
          {architecture === 'HEALTHCARE' && (
            <>
              {activeTab === 'Dashboard' && <HealthcareEngineView initialSubTab="appointments" />}
              {activeTab === 'Appointments' && <HealthcareEngineView initialSubTab="appointments" />}
              {activeTab === 'Patients' && <HealthcareEngineView initialSubTab="patients" />}
              {activeTab === 'Doctors' && <HealthcareEngineView initialSubTab="doctors" />}
              {activeTab === 'Consultations' && <HealthcareEngineView initialSubTab="consultations" />}
            </>
          )}

          {/* ========================================================================= */}
          {/* 3. GYM & FITNESS ATHLETIC CLUB PORTAL                                     */}
          {/* Only rendered when shop architecture is GYM                               */}
          {/* ========================================================================= */}
          {architecture === 'GYM' && (
            <>
              {activeTab === 'Dashboard' && <GymEngineView initialSubTab="members" />}
              {activeTab === 'Members' && <GymEngineView initialSubTab="members" />}
              {activeTab === 'Attendance' && <GymEngineView initialSubTab="attendance" />}
              {activeTab === 'Plans' && <GymEngineView initialSubTab="plans" />}
              {activeTab === 'Freezes' && <GymEngineView initialSubTab="freezes" />}
            </>
          )}

          {/* ========================================================================= */}
          {/* 4. RESTAURANT & DINING LOUNGE PORTAL                                      */}
          {/* Only rendered when shop architecture is RESTAURANT                        */}
          {/* ========================================================================= */}
          {architecture === 'RESTAURANT' && (
            <>
              {activeTab === 'Dashboard' && <RestaurantEngineView initialSubTab="floor" />}
              {activeTab === 'Floor & Tables' && <RestaurantEngineView initialSubTab="floor" />}
              {activeTab === 'Kitchen (KOT)' && <RestaurantEngineView initialSubTab="kot" />}
              {activeTab === 'Menu & Bar' && <RestaurantEngineView initialSubTab="menu" />}
              {activeTab === 'Dining POS' && <RestaurantEngineView initialSubTab="billing" />}
            </>
          )}

          {/* ========================================================================= */}
          {/* 5. EQUIPMENT RENTAL & FLEET HIRE PORTAL                                   */}
          {/* Only rendered when shop architecture is RENTAL                            */}
          {/* ========================================================================= */}
          {architecture === 'RENTAL' && (
            <>
              {activeTab === 'Dashboard' && <RentalEngineView initialSubTab="assets" />}
              {activeTab === 'Fleet & Assets' && <RentalEngineView initialSubTab="assets" />}
              {activeTab === 'Reservations' && <RentalEngineView initialSubTab="bookings" />}
              {activeTab === 'Returns & Deposits' && <RentalEngineView initialSubTab="returns" />}
            </>
          )}

          {/* ========================================================================= */}
          {/* 6. ELECTRONICS REPAIR & SERVICE LAB PORTAL                                */}
          {/* Only rendered when shop architecture is REPAIR                            */}
          {/* ========================================================================= */}
          {architecture === 'REPAIR' && (
            <>
              {activeTab === 'Dashboard' && <RepairEngineView initialSubTab="jobs" />}
              {activeTab === 'Job Cards' && <RepairEngineView initialSubTab="jobs" />}
              {activeTab === 'Diagnostics' && <RepairEngineView initialSubTab="diagnostics" />}
              {activeTab === 'Spare Parts' && <RepairEngineView initialSubTab="parts" />}
              {activeTab === 'Repair Billing' && <RepairEngineView initialSubTab="billing" />}
            </>
          )}

          {/* ========================================================================= */}
          {/* UNIVERSAL MANAGEMENT TABS (Available to all store administrators)         */}
          {/* ========================================================================= */}
          {activeTab === 'Reports' && (
            <div className="space-y-6">
              <ShopOverview />
              <ShopAuditLog />
            </div>
          )}

          {activeTab === 'Employees' && <StaffManagement />}
          {activeTab === 'Settings' && <BusinessProfile />}
        </main>
      </div>
    </div>
  );
};
