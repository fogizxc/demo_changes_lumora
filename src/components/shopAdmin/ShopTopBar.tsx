import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, ChevronDown, Menu, LogOut, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DemoAccountSwitcher } from '../common/DemoAccountSwitcher';
import { getShopArchitecture, ARCHITECTURES } from '../../utils/architecture';

interface ShopTopBarProps {
  onToggleSidebar?: () => void;
  onSearchFocus?: () => void;
  managerName?: string;
  managerRole?: string;
}

export const ShopTopBar: React.FC<ShopTopBarProps> = ({
  onToggleSidebar,
  managerName,
  managerRole,
}) => {
  const { logout, user, shop } = useAuth();
  const architecture = getShopArchitecture(shop?.shop_type);
  const meta = ARCHITECTURES[architecture];

  const resolvedName = managerName || (user?.email ? user.email.split('@')[0].toUpperCase() : 'Store Manager');
  const resolvedRole = managerRole || meta.managerRole;
  const initials = resolvedName.slice(0, 2).toUpperCase();

  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDemoSwitcher, setShowDemoSwitcher] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-shop-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const notifications = [
    { id: 1, title: 'Low Stock Alert', desc: 'Lay\'s Classic 52g is down to 4 units', time: '5m ago', type: 'warning' },
    { id: 2, title: 'New Online Order', desc: 'Order #ORD1256 paid via UPI (₹420)', time: '14m ago', type: 'success' },
    { id: 3, title: 'Till Reconciled', desc: 'Morning till balance matched perfectly', time: '1h ago', type: 'info' },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-white border-b border-[#E5E7EB] px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between shadow-2xs">
        {/* LEFT: Mobile Menu Button + Search Input */}
        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 max-w-xl">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Search Box */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="global-shop-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, customers, orders..."
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#D1D5DB] focus:border-[#6A101C] focus:bg-white text-xs text-neutral-900 pl-10 pr-20 py-2.5 rounded-xl transition placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#6A101C]"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500 bg-white border border-neutral-200 rounded shadow-2xs">
                Ctrl + K
              </kbd>
            </div>
          </div>
        </div>

        {/* RIGHT: Architecture Badge + Notifications + User Profile */}
        <div className="flex items-center space-x-3 sm:space-x-4 ml-4">
          {/* Architectural Badge */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-neutral-100 border border-neutral-200 text-xs shadow-2xs">
            <span className="text-base">{meta.iconEmoji}</span>
            <div className="text-left">
              <div className="text-[11px] font-bold text-neutral-800 leading-none">{shop?.name || meta.label}</div>
              <div className="text-[9px] font-bold text-rose-600 tracking-wider uppercase leading-tight mt-0.5">{meta.badgeLabel}</div>
            </div>
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#DC2626] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                3
              </span>
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl z-50 p-3 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-[#F3F4F6] px-1">
                  <span className="text-xs font-bold text-neutral-900">Notifications</span>
                  <span className="text-[10px] font-semibold text-[#6A101C] cursor-pointer hover:underline">
                    Mark all read
                  </span>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2 rounded-xl hover:bg-neutral-50 transition cursor-pointer flex items-start space-x-2.5 text-left"
                    >
                      {n.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="text-xs font-bold text-neutral-900 leading-tight">{n.title}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">{n.desc}</div>
                        <div className="text-[9px] text-neutral-400 mt-1">{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-3 p-1 sm:px-2 py-1 rounded-2xl hover:bg-neutral-100 transition cursor-pointer"
            >
              {/* Initials avatar in dark navy/slate */}
              <div className="w-9 h-9 rounded-full bg-[#1E293B] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                {initials}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-neutral-900 leading-tight">
                  {resolvedName}
                </div>
                <div className="text-[10px] text-neutral-500 leading-tight">
                  {resolvedRole}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-fade-in text-xs">
                <div className="px-3 py-2 border-b border-[#F3F4F6]">
                  <div className="font-bold text-neutral-900">{resolvedName}</div>
                  <div className="text-[11px] text-neutral-500 truncate">{user?.email || 'raghav@lumora.store'}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowDemoSwitcher(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Switch Test Role</span>
                </button>

                <div className="border-t border-[#F3F4F6] my-1" />

                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition cursor-pointer font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Demo Account Switcher Dialog */}
      <DemoAccountSwitcher
        isOpen={showDemoSwitcher}
        onClose={() => setShowDemoSwitcher(false)}
      />
    </>
  );
};
