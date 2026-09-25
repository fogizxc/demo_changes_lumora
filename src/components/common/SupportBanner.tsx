import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, LogOut } from 'lucide-react';

export const SupportBanner: React.FC = () => {
  const { isImpersonating, shop, exitImpersonation, isLoading } = useAuth();

  if (!isImpersonating) return null;

  return (
    <aside aria-label="Support Mode Alert" id="support-view-as-banner" className="bg-amber-500 text-neutral-950 px-4 py-2.5 shadow-md flex items-center justify-between z-50 sticky top-0">
      <div className="flex items-center space-x-3">
        <span className="p-1 bg-amber-600 rounded text-amber-950 font-bold flex items-center justify-center">
          <AlertTriangle className="w-4 h-4" />
        </span>
        <div className="text-sm">
          <span className="font-extrabold tracking-wide uppercase mr-2 text-xs px-2 py-0.5 bg-neutral-950 text-amber-400 rounded">
            SUPPORT / VIEW-AS MODE
          </span>
          <span className="font-semibold">
            Viewing {shop?.name ? `"${shop.name}"` : 'Shop'} as Shop Admin
          </span>
          <span className="hidden sm:inline text-neutral-800 ml-2 font-medium">
            (Real Identity: Super Admin — All sensitive support actions remain fully audited)
          </span>
        </div>
      </div>
      <button
        id="btn-exit-support-mode"
        onClick={exitImpersonation}
        disabled={isLoading}
        className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-950 text-amber-400 hover:bg-neutral-900 rounded font-medium text-xs transition shadow cursor-pointer disabled:opacity-50 whitespace-nowrap"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Exit Support Mode</span>
      </button>
    </aside>
  );
};
