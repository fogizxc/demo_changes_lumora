import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Package,
  Users,
  ClipboardList,
  Store,
  Settings,
  Database,
  ShieldCheck,
  Plus,
  ArrowRight,
  X,
  CreditCard,
  Truck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Actions' | 'Administration';
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
  onOpenSaleModal?: () => void;
  onOpenTestRunner?: () => void;
  onOpenRoleSwitcher?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenSaleModal,
  onOpenTestRunner,
  onOpenRoleSwitcher,
}) => {
  const { role, shop } = useAuth();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Construct comprehensive command catalogue
  const allCommands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Dashboard Overview',
      description: 'View real-time sales, revenue trends, and operational metrics',
      icon: Store,
      shortcut: 'G D',
      onSelect: () => {
        onNavigateTab?.('Dashboard');
        onClose();
      },
    },
    {
      id: 'nav-pos',
      category: 'Navigation',
      title: 'POS Terminal (Billing)',
      description: 'Open live cashier billing register with barcode scanner',
      icon: ShoppingCart,
      shortcut: 'G B',
      onSelect: () => {
        onNavigateTab?.('Billing (POS)');
        onClose();
      },
    },
    {
      id: 'nav-products',
      category: 'Navigation',
      title: 'Products & Inventory',
      description: 'Manage SKU catalog, stock levels, and low-stock alerts',
      icon: Package,
      shortcut: 'G P',
      onSelect: () => {
        onNavigateTab?.('Products');
        onClose();
      },
    },
    {
      id: 'nav-customers',
      category: 'Navigation',
      title: 'Customers & Khata Ledger',
      description: 'Customer directory, credit balances, and loyalty points',
      icon: Users,
      shortcut: 'G C',
      onSelect: () => {
        onNavigateTab?.('Customers');
        onClose();
      },
    },
    {
      id: 'nav-orders',
      category: 'Navigation',
      title: 'Order History & Invoices',
      description: 'Search completed sales, print tax receipts, or process refunds',
      icon: ClipboardList,
      shortcut: 'G O',
      onSelect: () => {
        onNavigateTab?.('Orders');
        onClose();
      },
    },
    {
      id: 'nav-suppliers',
      category: 'Navigation',
      title: 'Suppliers & Purchases',
      description: 'Vendor directory and procurement purchase orders',
      icon: Truck,
      shortcut: 'G S',
      onSelect: () => {
        onNavigateTab?.('Suppliers');
        onClose();
      },
    },
    {
      id: 'nav-staff',
      category: 'Navigation',
      title: 'Staff Management',
      description: 'Manage employees, cashier PINs, and shift performance',
      icon: Users,
      onSelect: () => {
        onNavigateTab?.('Employees');
        onClose();
      },
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      title: 'Business Profile & Tax Settings',
      description: 'Configure GSTIN, store address, and receipt metadata',
      icon: Settings,
      onSelect: () => {
        onNavigateTab?.('Settings');
        onClose();
      },
    },

    // Actions
    {
      id: 'act-new-sale',
      category: 'Actions',
      title: 'Start New Cashier Sale',
      description: 'Open billing register and focus barcode scanner',
      icon: Plus,
      shortcut: 'N',
      onSelect: () => {
        onNavigateTab?.('Billing (POS)');
        onOpenSaleModal?.();
        onClose();
      },
    },
    {
      id: 'act-switch-role',
      category: 'Actions',
      title: 'Switch Role / Portal',
      description: 'Switch between Super Admin, Shopkeeper, and Cashier modes',
      icon: RotateCcw,
      shortcut: 'S P',
      onSelect: () => {
        onClose();
        onOpenRoleSwitcher?.();
      },
    },

    // Administration
    {
      id: 'adm-test-suite',
      category: 'Administration',
      title: 'Run System Compliance Tests',
      description: 'Execute automated 23-test security, RBAC & isolation suite',
      icon: ShieldCheck,
      shortcut: 'T',
      onSelect: () => {
        onClose();
        onOpenTestRunner?.();
      },
    },
    {
      id: 'adm-database-console',
      category: 'Administration',
      title: 'Polyglot Database Architecture',
      description: 'Monitor PostgreSQL, Mongo, Redis, and Cassandra engines',
      icon: Database,
      onSelect: () => {
        onNavigateTab?.('Databases');
        onClose();
      },
    },
  ];

  // Filter commands by search query
  const filteredCommands = allCommands.filter((cmd) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.description && cmd.description.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150">
        {/* Search Input Box */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-neutral-100 bg-neutral-50/50">
          <Search className="w-5 h-5 text-neutral-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search anything in Lumora..."
            className="w-full bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded text-neutral-400 hover:text-neutral-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="ml-2 hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold text-neutral-500 bg-white border border-neutral-200 rounded shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Command Items List */}
        <div ref={listRef} className="overflow-y-auto p-2 divide-y divide-neutral-50 max-h-[420px]">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-sm font-semibold text-neutral-800">No matching commands</p>
              <p className="text-xs text-neutral-500 mt-1">Try searching for "POS", "Products", "Customer", or "Test"</p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={cmd.id}
                  onClick={cmd.onSelect}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#6A101C] text-white' : 'text-neutral-700 hover:bg-neutral-100/70'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-neutral-900'}`}>
                          {cmd.title}
                        </span>
                        <span
                          className={`text-[10px] font-medium opacity-60 ${
                            isSelected ? 'text-white/80' : 'text-neutral-400'
                          }`}
                        >
                          · {cmd.category}
                        </span>
                      </div>
                      {cmd.description && (
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? 'text-white/80' : 'text-neutral-500'
                          }`}
                        >
                          {cmd.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {cmd.shortcut && (
                    <div className="ml-3 shrink-0">
                      <span
                        className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                        }`}
                      >
                        {cmd.shortcut}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white border border-neutral-200 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white border border-neutral-200 rounded">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-white border border-neutral-200 rounded">↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <span className="text-neutral-400 font-mono text-[10px]">Lumora Navigation Engine</span>
        </div>
      </div>
    </div>
  );
};
