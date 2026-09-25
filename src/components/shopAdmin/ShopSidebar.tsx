import React, { useState } from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import { getShopArchitecture, ARCHITECTURES } from '../../utils/architecture';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  ClipboardList,
  Truck,
  BarChart3,
  Receipt,
  UserCheck,
  Settings,
  Crown,
  X,
  ArrowRight,
  Database,
  Calendar,
  Stethoscope,
  FileText,
  Award,
  PauseCircle,
  Utensils,
  Flame,
  Coffee,
  Car,
  RotateCcw,
  Wrench,
  Cpu,
} from 'lucide-react';

export type ShopSidebarTab =
  | 'Dashboard'
  | 'Billing (POS)'
  | 'Products'
  | 'Inventory'
  | 'Customers'
  | 'Orders'
  | 'Suppliers'
  | 'Reports'
  | 'Expenses'
  | 'Employees'
  | 'Settings'
  | 'Databases'
  // Healthcare
  | 'Appointments'
  | 'Patients'
  | 'Doctors'
  | 'Consultations'
  // Gym
  | 'Members'
  | 'Attendance'
  | 'Plans'
  | 'Freezes'
  // Restaurant
  | 'Floor & Tables'
  | 'Kitchen (KOT)'
  | 'Menu & Bar'
  | 'Dining POS'
  // Rental
  | 'Fleet & Assets'
  | 'Reservations'
  | 'Returns & Deposits'
  // Repair
  | 'Job Cards'
  | 'Diagnostics'
  | 'Spare Parts'
  | 'Repair Billing';

interface ShopSidebarProps {
  activeTab: ShopSidebarTab;
  onSelectTab: (tab: ShopSidebarTab) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const ShopSidebar: React.FC<ShopSidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen = true,
  onClose,
}) => {
  const [showPromo, setShowPromo] = useState(true);
  const { shop } = useAuth();

  const architecture = getShopArchitecture(shop?.shop_type);
  const meta = ARCHITECTURES[architecture];

  // Strictly filter menu items per industry architecture.
  // Grocery store owners will NEVER see hospital/gym/restaurant items, and vice versa!
  const getMenuItems = () => {
    switch (architecture) {
      case 'HEALTHCARE':
        return [
          { id: 'Dashboard' as ShopSidebarTab, label: 'Hospital Overview', icon: LayoutDashboard },
          { id: 'Appointments' as ShopSidebarTab, label: 'Appointments Queue', icon: Calendar },
          { id: 'Patients' as ShopSidebarTab, label: 'Patient EHR Records', icon: Users },
          { id: 'Doctors' as ShopSidebarTab, label: 'Specialist Doctors', icon: Stethoscope },
          { id: 'Consultations' as ShopSidebarTab, label: 'Prescriptions & Billing', icon: FileText },
          { id: 'Reports' as ShopSidebarTab, label: 'Clinical Analytics', icon: BarChart3 },
          { id: 'Employees' as ShopSidebarTab, label: 'Hospital Staff', icon: UserCheck },
          { id: 'Databases' as ShopSidebarTab, label: '4-DB Engine', icon: Database },
          { id: 'Settings' as ShopSidebarTab, label: 'Clinic Settings', icon: Settings },
        ];

      case 'GYM':
        return [
          { id: 'Dashboard' as ShopSidebarTab, label: 'Gym Overview', icon: LayoutDashboard },
          { id: 'Members' as ShopSidebarTab, label: 'Member Roster', icon: Users },
          { id: 'Attendance' as ShopSidebarTab, label: 'Turnstile Check-In', icon: Calendar },
          { id: 'Plans' as ShopSidebarTab, label: 'Membership Tiers', icon: Award },
          { id: 'Freezes' as ShopSidebarTab, label: 'Freeze Requests', icon: PauseCircle },
          { id: 'Reports' as ShopSidebarTab, label: 'Club Revenue', icon: BarChart3 },
          { id: 'Employees' as ShopSidebarTab, label: 'Trainers & Staff', icon: UserCheck },
          { id: 'Databases' as ShopSidebarTab, label: '4-DB Engine', icon: Database },
          { id: 'Settings' as ShopSidebarTab, label: 'Facility Settings', icon: Settings },
        ];

      case 'RESTAURANT':
        return [
          { id: 'Dashboard' as ShopSidebarTab, label: 'Dining Overview', icon: LayoutDashboard },
          { id: 'Floor & Tables' as ShopSidebarTab, label: 'Floor Plan (Tables)', icon: Utensils },
          { id: 'Kitchen (KOT)' as ShopSidebarTab, label: 'Kitchen Tickets (KOT)', icon: Flame },
          { id: 'Menu & Bar' as ShopSidebarTab, label: 'Food & Bar Menu', icon: Coffee },
          { id: 'Dining POS' as ShopSidebarTab, label: 'Table Checkout POS', icon: Receipt },
          { id: 'Reports' as ShopSidebarTab, label: 'Dining Sales Reports', icon: BarChart3 },
          { id: 'Employees' as ShopSidebarTab, label: 'Waiters & Kitchen Staff', icon: UserCheck },
          { id: 'Databases' as ShopSidebarTab, label: '4-DB Engine', icon: Database },
          { id: 'Settings' as ShopSidebarTab, label: 'Restaurant Settings', icon: Settings },
        ];

      case 'RENTAL':
        return [
          { id: 'Dashboard' as ShopSidebarTab, label: 'Rental Overview', icon: LayoutDashboard },
          { id: 'Fleet & Assets' as ShopSidebarTab, label: 'Fleet & Equipment', icon: Car },
          { id: 'Reservations' as ShopSidebarTab, label: 'Date Bookings Guard', icon: Calendar },
          { id: 'Returns & Deposits' as ShopSidebarTab, label: 'Returns & Deposits', icon: RotateCcw },
          { id: 'Reports' as ShopSidebarTab, label: 'Utilization Reports', icon: BarChart3 },
          { id: 'Employees' as ShopSidebarTab, label: 'Logistics Handlers', icon: UserCheck },
          { id: 'Databases' as ShopSidebarTab, label: '4-DB Engine', icon: Database },
          { id: 'Settings' as ShopSidebarTab, label: 'Rental Policies', icon: Settings },
        ];

      case 'REPAIR':
        return [
          { id: 'Dashboard' as ShopSidebarTab, label: 'Repair Lab Overview', icon: LayoutDashboard },
          { id: 'Job Cards' as ShopSidebarTab, label: 'Device Intake Jobs', icon: ClipboardList },
          { id: 'Diagnostics' as ShopSidebarTab, label: 'Diagnostics Pipeline', icon: Cpu },
          { id: 'Spare Parts' as ShopSidebarTab, label: 'Spare Parts Inventory', icon: Wrench },
          { id: 'Repair Billing' as ShopSidebarTab, label: 'Repair Invoices', icon: Receipt },
          { id: 'Reports' as ShopSidebarTab, label: 'Repair Statistics', icon: BarChart3 },
          { id: 'Employees' as ShopSidebarTab, label: 'Lab Technicians', icon: UserCheck },
          { id: 'Databases' as ShopSidebarTab, label: '4-DB Engine', icon: Database },
          { id: 'Settings' as ShopSidebarTab, label: 'Warranty Settings', icon: Settings },
        ];

      case 'RETAIL':
      default:
        return [
          { id: 'Dashboard' as ShopSidebarTab, label: 'Dashboard', icon: LayoutDashboard },
          { id: 'Billing (POS)' as ShopSidebarTab, label: 'Billing (POS)', icon: ShoppingCart },
          { id: 'Products' as ShopSidebarTab, label: 'Products', icon: Package },
          { id: 'Inventory' as ShopSidebarTab, label: 'Inventory', icon: Boxes },
          { id: 'Customers' as ShopSidebarTab, label: 'Customers', icon: Users },
          { id: 'Orders' as ShopSidebarTab, label: 'Orders', icon: ClipboardList },
          { id: 'Suppliers' as ShopSidebarTab, label: 'Suppliers', icon: Truck },
          { id: 'Reports' as ShopSidebarTab, label: 'Reports', icon: BarChart3 },
          { id: 'Expenses' as ShopSidebarTab, label: 'Expenses', icon: Receipt },
          { id: 'Employees' as ShopSidebarTab, label: 'Employees', icon: UserCheck },
          { id: 'Databases' as ShopSidebarTab, label: '4-DB Engine', icon: Database },
          { id: 'Settings' as ShopSidebarTab, label: 'Settings', icon: Settings },
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0F0F14] text-white flex flex-col justify-between border-r border-white/5 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* TOP SECTION: BRAND LOGO */}
        <div>
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <BrandLogo size="md" variant="on-dark" align="left" showTagline={true} />
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 text-white/60 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* DEDICATED INDUSTRY BADGE: Clear proof of isolated portal */}
          <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center space-x-2.5">
            <span className="text-xl shrink-0" role="img" aria-label={meta.label}>
              {meta.iconEmoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-white truncate">
                {shop?.name || meta.label}
              </div>
              <div className="text-[9px] font-bold text-rose-400 tracking-wider uppercase truncate">
                {meta.badgeLabel} Portal
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION: SCROLLABLE NAVIGATION ITEMS */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#6A101C] text-white shadow-md shadow-[#6A101C]/30 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-neutral-400 group-hover:text-white'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* BOTTOM PROMO WIDGET & FOOTER */}
        <div className="p-3.5 space-y-3 border-t border-white/5">
          {showPromo && (
            <div className="bg-[#181820] border border-white/10 rounded-2xl p-3.5 relative overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPromo(false)}
                className="absolute top-2.5 right-2.5 text-neutral-400 hover:text-white p-0.5 rounded-md transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400 mb-2">
                <Crown className="w-4 h-4" />
              </div>

              <h4 className="text-xs font-bold text-white leading-snug">
                {meta.portalTitle}
              </h4>
              <p className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed line-clamp-2">
                {meta.summary}
              </p>

              <button
                type="button"
                onClick={() => onSelectTab('Reports')}
                className="mt-3 w-7 h-7 rounded-full border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition cursor-pointer"
                title="View Performance Reports"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Version & Status */}
          <div className="px-1 text-[11px]">
            <div className="text-neutral-500 font-mono text-[10px]">LUMORA v1.0.0 • {architecture}</div>
            <div className="flex items-center space-x-2 mt-1 text-neutral-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Isolated Tenant Online</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
