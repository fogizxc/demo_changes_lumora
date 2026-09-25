import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { Product, Sale, Shop, Employee } from '../../types';
import { GSTReceiptModal } from '../pos/GSTReceiptModal';
import { PaymentModal, PaymentEntry } from '../pos/PaymentModal';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
  Printer,
  Barcode,
  PauseCircle,
  Calculator,
  User,
  Tag,
  ArrowRight,
  TrendingUp,
  Package,
  ClipboardList,
  Users,
  Bell,
  HelpCircle,
  LogOut,
  ChevronDown,
  Sparkles,
  Lightbulb,
  CreditCard,
  Banknote,
  QrCode,
  MoreHorizontal,
  Box,
  Store,
  Check,
  Database,
  Menu,
} from 'lucide-react';
import { DatabaseConsole } from '../database/DatabaseConsole';

export type EmployeePortalTab = 'POS' | 'Products' | 'Orders' | 'Customers' | 'My Shifts' | 'Databases';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

// Initial demo products aligned with the reference design image
const INITIAL_DEMO_PRODUCTS = [
  {
    id: 'prd_maggi_01',
    name: 'Maggi Noodles 70g',
    price: 14,
    cost_price: 10.5,
    stock: 64,
    low_stock_threshold: 15,
    tax_rate: 5,
    category: 'Snacks',
    sku: 'SNK-MAG-70',
    barcode: '8901058852331',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&auto=format&fit=crop&q=80',
    colorBg: '#FEF08A',
  },
  {
    id: 'prd_coke_01',
    name: 'Coca-Cola 500ml',
    price: 60,
    cost_price: 45,
    stock: 42,
    low_stock_threshold: 10,
    tax_rate: 18,
    category: 'Beverages',
    sku: 'BEV-COK-500',
    barcode: '8901764012211',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
    colorBg: '#FEE2E2',
  },
  {
    id: 'prd_lays_01',
    name: "Lay's Classic 52g",
    price: 20,
    cost_price: 15,
    stock: 58,
    low_stock_threshold: 12,
    tax_rate: 12,
    category: 'Snacks',
    sku: 'SNK-LAY-52',
    barcode: '8901491101552',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop&q=80',
    colorBg: '#FEF9C3',
  },
  {
    id: 'prd_amul_01',
    name: 'Amul Milk 1L',
    price: 68,
    cost_price: 58,
    stock: 35,
    low_stock_threshold: 8,
    tax_rate: 5,
    category: 'Dairy',
    sku: 'DAR-AMU-1L',
    barcode: '8901262010055',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
    colorBg: '#E0F2FE',
  },
  {
    id: 'prd_bread_01',
    name: 'Britannia Bread',
    price: 30,
    cost_price: 23,
    stock: 26,
    low_stock_threshold: 6,
    tax_rate: 5,
    category: 'Grocery',
    sku: 'GRO-BRT-400',
    barcode: '8901063012011',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80',
    colorBg: '#FFEDD5',
  },
  {
    id: 'prd_salt_01',
    name: 'Tata Salt 1kg',
    price: 22,
    cost_price: 16.5,
    stock: 80,
    low_stock_threshold: 15,
    tax_rate: 5,
    category: 'Grocery',
    sku: 'GRO-TAT-1K',
    barcode: '8904043901005',
    image: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=300&auto=format&fit=crop&q=80',
    colorBg: '#FED7AA',
  },
  {
    id: 'prd_surf_01',
    name: 'Surf Excel 1kg',
    price: 145,
    cost_price: 115,
    stock: 4, // Low stock
    low_stock_threshold: 8,
    tax_rate: 18,
    category: 'Household',
    sku: 'HSH-SRF-1K',
    barcode: '8901030012022',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80',
    colorBg: '#DBEAFE',
  },
  {
    id: 'prd_dove_01',
    name: 'Dove Soap 100g',
    price: 48,
    cost_price: 37,
    stock: 32,
    low_stock_threshold: 10,
    tax_rate: 18,
    category: 'Personal Care',
    sku: 'PC-DOV-100',
    barcode: '8901030383074',
    image: 'https://images.unsplash.com/photo-1607006314644-88377b7ee38c?w=300&auto=format&fit=crop&q=80',
    colorBg: '#F3F4F6',
  },
  {
    id: 'prd_atta_01',
    name: 'Aashirvaad Atta 1kg',
    price: 56,
    cost_price: 42,
    stock: 45,
    low_stock_threshold: 10,
    tax_rate: 5,
    category: 'Grocery',
    sku: 'GRO-ASH-1K',
    barcode: '8901725181017',
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300&auto=format&fit=crop&q=80',
    colorBg: '#FEF3C7',
  },
  {
    id: 'prd_tea_01',
    name: 'Red Label Tea 250g',
    price: 132,
    cost_price: 102,
    stock: 24,
    low_stock_threshold: 8,
    tax_rate: 5,
    category: 'Beverages',
    sku: 'BEV-RED-250',
    barcode: '8901030825000',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop&q=80',
    colorBg: '#FEE2E2',
  },
  {
    id: 'prd_pepsi_01',
    name: 'Pepsi 500ml',
    price: 60,
    cost_price: 45,
    stock: 30,
    low_stock_threshold: 8,
    tax_rate: 18,
    category: 'Beverages',
    sku: 'BEV-PEP-500',
    barcode: '8902080000018',
    image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=300&auto=format&fit=crop&q=80',
    colorBg: '#DBEAFE',
  },
  {
    id: 'prd_colgate_01',
    name: 'Colgate Toothpaste',
    price: 85,
    cost_price: 65,
    stock: 5, // Low stock
    low_stock_threshold: 10,
    tax_rate: 18,
    category: 'Personal Care',
    sku: 'PC-COL-150',
    barcode: '8901314010505',
    image: 'https://images.unsplash.com/photo-1559591937-e62fb330bc1f?w=300&auto=format&fit=crop&q=80',
    colorBg: '#FEE2E2',
  },
];

export const EmployeePortal: React.FC = () => {
  const { employee, shop, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<EmployeePortalTab>('POS');
  const [products, setProducts] = useState<any[]>(INITIAL_DEMO_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Barcode Scanning State
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart State - preloaded with items matching the reference design!
  const [cart, setCart] = useState<CartItem[]>([
    { product: INITIAL_DEMO_PRODUCTS[0] as any, quantity: 2, discount: 0 }, // Maggi Noodles 70g x 2
    { product: INITIAL_DEMO_PRODUCTS[1] as any, quantity: 1, discount: 0 }, // Coca-Cola 500ml x 1
    { product: INITIAL_DEMO_PRODUCTS[4] as any, quantity: 1, discount: 0 }, // Britannia Bread x 1
  ]);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'MORE'>('CASH');
  const [orderNote, setOrderNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  // Payment Modal & Receipt Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [completedSale, setCompletedSale] = useState<{
    sale: Sale;
    items: any[];
    payments?: any[];
    shop: Shop;
    employee: Employee;
  } | null>(null);

  // Notifications Drawer & Help Modal
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Live time ticker
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live products from backend to merge
  useEffect(() => {
    const loadLiveProducts = async () => {
      try {
        const res = await api.pos.getProducts();
        if (res.products && res.products.length > 0) {
          // Merge with initial demo visual images
          const merged = INITIAL_DEMO_PRODUCTS.map((demo) => {
            const liveMatch = res.products.find((p) => p.sku === demo.sku);
            return liveMatch ? { ...demo, ...liveMatch, image: demo.image } : demo;
          });
          // Also append extra items from db if any
          res.products.forEach((dbP) => {
            if (!merged.some((m) => m.sku === dbP.sku)) {
              merged.push({
                ...dbP,
                image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80',
                colorBg: '#F3F4F6',
              } as any);
            }
          });
          setProducts(merged);
        }
      } catch (err) {
        // use default demo products
      }
    };
    loadLiveProducts();
  }, []);

  // Keyboard shortcut Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) setShowPaymentModal(true);
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setCart([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length]);

  // Categories list
  const categories = useMemo(() => {
    return ['All', 'Grocery', 'Beverages', 'Snacks', 'Personal Care', 'Household', 'Dairy', 'More'];
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        prod.name.toLowerCase().includes(q) ||
        prod.sku.toLowerCase().includes(q) ||
        (prod.barcode && prod.barcode.includes(q));

      const matchesCat =
        selectedCategory === 'All' ||
        selectedCategory === 'More' ||
        prod.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [products, searchTerm, selectedCategory]);

  // Cart operations
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Clear all items from the current cart?')) {
      setCart([]);
      setOrderNote('');
      setOrderDiscount(0);
    }
  };

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return Math.min(subtotal, orderDiscount);
  }, [subtotal, orderDiscount]);

  const taxAmount = useMemo(() => {
    // 5% standard GST representation aligned with the UI design
    const taxable = Math.max(0, subtotal - discountAmount);
    return Math.round(taxable * 0.05 * 100) / 100;
  }, [subtotal, discountAmount]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + taxAmount);
  }, [subtotal, discountAmount, taxAmount]);

  // Total items sold representation
  const itemsCountInCart = useMemo(() => {
    return cart.reduce((acc, i) => acc + i.quantity, 0);
  }, [cart]);

  // Checkout handling
  const handleConfirmPayment = async (payments: PaymentEntry[]) => {
    setIsProcessingPayment(true);
    try {
      const payload = {
        items: cart.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
          discount: c.discount || 0,
        })),
        orderDiscount: discountAmount,
        payments,
        customerName: undefined,
        customerPhone: undefined,
        note: orderNote || undefined,
      };

      const res = await api.pos.checkout(payload);

      setCompletedSale({
        sale: res.sale,
        items: res.items,
        payments: res.payments,
        shop: res.shop || (shop as any),
        employee: res.employee || (employee as any),
      });

      setShowPaymentModal(false);
      setCart([]);
      setOrderNote('');
      setOrderDiscount(0);
    } catch (err: any) {
      alert('Checkout failed: ' + (err.message || 'Payment processing error'));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Quick Barcode Scanning handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedBarcode.trim()) return;

    const found = products.find(
      (p) =>
        p.barcode === scannedBarcode.trim() ||
        p.sku.toLowerCase() === scannedBarcode.trim().toLowerCase()
    );

    if (found) {
      addToCart(found);
      setScannedBarcode('');
      setShowBarcodeScanner(false);
    } else {
      alert(`No product found matching barcode or SKU: "${scannedBarcode}"`);
    }
  };

  // Format date: "Tue, 16 Sep 2026"
  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [currentTime]);

  // Format time: "09:32 AM"
  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [currentTime]);

  const employeeName = employee?.name || 'Amit Kumar';
  const employeeRole = employee?.tier === 'SHIFT_LEAD' ? 'Shift Lead' : 'Store Employee';
  const employeeInitials = employeeName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex font-sans antialiased selection:bg-[#6A101C] selection:text-white">
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* 1. LEFT DARK FIXED SIDEBAR (RESPONSIVE SLIDE-OVER ON MOBILE) */}
      <aside
        className={`w-60 bg-[#0F1115] text-white flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-50 border-r border-neutral-900/60 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-5 pb-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                {/* LUMORA brand symbol */}
                <div className="relative flex items-center">
                  <div className="w-3.5 h-6 rounded-r-full bg-[#E11D48] mr-1.5" />
                  <span className="text-xl font-black tracking-widest text-white font-serif">LUMORA</span>
                </div>
              </div>
              <p className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase mt-1">
                One System. More Possibilities.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-white/60 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Navigation */}
          <nav className="px-3 pt-4 space-y-1">
            {/* POS Tab */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('POS');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'POS'
                  ? 'bg-[#6A101C] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>POS</span>
            </button>

            {/* Products Tab */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('Products');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'Products'
                  ? 'bg-[#6A101C] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Products</span>
            </button>

            {/* Orders Tab */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('Orders');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'Orders'
                  ? 'bg-[#6A101C] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Orders</span>
            </button>

            {/* Customers Tab */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('Customers');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'Customers'
                  ? 'bg-[#6A101C] text-white shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Customers</span>
            </button>
          </nav>

          {/* Secondary Navigation */}
          <div className="px-3 pt-6 mt-4 border-t border-white/5 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('My Shifts');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                activeTab === 'My Shifts'
                  ? 'bg-white/10 text-white font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>My Shifts</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('Databases');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                activeTab === 'Databases'
                  ? 'bg-white/10 text-white font-bold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>4-DB Architecture</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </div>
              <span className="w-4 h-4 rounded-full bg-[#E11D48] text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Help</span>
            </button>
          </div>
        </div>

        {/* Bottom Profile Card & Logout */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-neutral-700 text-white font-bold text-xs flex items-center justify-center border border-white/10">
              {employeeInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{employeeName}</div>
              <div className="text-[11px] text-neutral-400 truncate">{employeeRole}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>

          <div className="text-[10px] font-mono text-neutral-500 mt-2 text-center">
            LUMORA v1.0.0
          </div>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CANVAS */}
      <div className="flex-1 lg:pl-60 pl-0 flex flex-col min-w-0 min-h-screen">
        {/* TOP APP BAR */}
        <header className="h-16 bg-white border-b border-neutral-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 mr-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl cursor-pointer"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Bar matching screenshot */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products by name, barcode or SKU..."
              className="w-full bg-[#F3F4F6]/70 border border-neutral-200/80 rounded-xl pl-10 pr-24 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6A101C] focus:border-[#6A101C] transition"
            />
            {/* Barcode scanner icon & Ctrl+K badge */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(true)}
                className="text-neutral-500 hover:text-[#6A101C] transition cursor-pointer"
                title="Scan Barcode"
              >
                <Barcode className="w-4 h-4" />
              </button>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-neutral-400 bg-neutral-200/60 border border-neutral-300/50">
                Ctrl + K
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-4 ml-4">
            {/* Store Pill */}
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white border border-neutral-200 text-xs font-semibold text-neutral-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{shop?.name || 'Main Store'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-neutral-600 hover:text-neutral-900 rounded-full hover:bg-neutral-100 transition cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {/* Live Date & Time */}
            <div className="text-right border-l border-neutral-200 pl-4">
              <div className="text-[10px] text-neutral-500 font-medium">{formattedDate}</div>
              <div className="text-xs font-bold text-neutral-900 font-mono tracking-tight">{formattedTime}</div>
            </div>
          </div>
        </header>

        {/* 3. MAIN TERMINAL WORKSPACE */}
        {activeTab === 'POS' ? (
          <main className="flex-1 p-6 space-y-6">
            {/* Top Grid: Products Catalog (Left) + Current Cart (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT: PRODUCTS CATALOG (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                {/* Section Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">All Products</h2>
                    <p className="text-xs text-neutral-500 mt-0.5">Scan or search to add items to cart</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border border-[#E11D48]/30 bg-white hover:bg-red-50 text-[#6A101C] text-xs font-bold shadow-2xs transition cursor-pointer"
                  >
                    <Barcode className="w-4 h-4 text-[#E11D48]" />
                    <span>Scan Barcode</span>
                  </button>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[#6A101C] text-white shadow-2xs'
                          : 'bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-50'
                      }`}
                    >
                      {cat} {cat === 'More' && '▾'}
                    </button>
                  ))}
                </div>

                {/* Products Grid (4 columns exactly like the screenshot) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {filteredProducts.map((prod) => {
                    const isLowStock = prod.stock <= prod.low_stock_threshold;

                    return (
                      <div
                        key={prod.id}
                        onClick={() => addToCart(prod)}
                        className="group bg-white rounded-2xl p-3 border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-neutral-300 transition cursor-pointer flex flex-col justify-between select-none"
                      >
                        {/* Product Visual */}
                        <div
                          className="w-full aspect-square rounded-xl flex items-center justify-center p-3 mb-2.5 overflow-hidden transition group-hover:scale-105"
                          style={{ backgroundColor: prod.colorBg || '#F9FAFB' }}
                        >
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="max-h-full max-w-full object-contain drop-shadow-sm rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Title & Price */}
                        <div>
                          <div className="text-xs font-bold text-neutral-900 line-clamp-1 group-hover:text-[#6A101C] transition">
                            {prod.name}
                          </div>
                          <div className="text-sm font-extrabold text-neutral-900 mt-1">₹{prod.price}</div>
                        </div>

                        {/* Stock status pill */}
                        <div className="mt-2">
                          {isLowStock ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F4EA] text-[#137333] border border-emerald-200/60">
                              In Stock
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: CURRENT CART (4 cols) */}
              <div className="lg:col-span-4 bg-white border border-neutral-200/90 rounded-3xl p-5 shadow-2xs flex flex-col justify-between sticky top-20">
                <div>
                  {/* Cart Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-extrabold text-neutral-900 tracking-tight">Current Cart</h3>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                        {itemsCountInCart}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={clearCart}
                      className="flex items-center space-x-1 text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  </div>

                  {/* Cart Table Header */}
                  <div className="grid grid-cols-12 text-[11px] font-bold text-neutral-400 py-2.5 border-b border-neutral-100">
                    <div className="col-span-5">Item</div>
                    <div className="col-span-3 text-center">Qty</div>
                    <div className="col-span-2 text-right">Price</div>
                    <div className="col-span-2 text-right">Total</div>
                  </div>

                  {/* Cart Items List */}
                  <div className="divide-y divide-neutral-100 max-h-72 overflow-y-auto pr-1">
                    {cart.length === 0 ? (
                      <div className="py-12 text-center text-neutral-400">
                        <ShoppingCart className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-neutral-700">Your cart is empty</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">Click any product to add to bill</p>
                      </div>
                    ) : (
                      cart.map((item) => {
                        const lineTotal = item.product.price * item.quantity;

                        return (
                          <div key={item.product.id} className="grid grid-cols-12 items-center py-2.5 text-xs gap-1">
                            {/* Product thumb & name */}
                            <div className="col-span-5 flex items-center space-x-2 pr-1">
                              <div
                                className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center p-1 overflow-hidden"
                                style={{ backgroundColor: (item.product as any).colorBg || '#F3F4F6' }}
                              >
                                <img
                                  src={(item.product as any).image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'}
                                  alt={item.product.name}
                                  className="max-h-full max-w-full object-contain rounded"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-neutral-900 truncate text-[11px]">
                                  {item.product.name}
                                </div>
                              </div>
                            </div>

                            {/* Qty Stepper */}
                            <div className="col-span-3 flex items-center justify-center space-x-1">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, -1)}
                                className="w-5 h-5 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                -
                              </button>
                              <span className="font-bold font-mono text-neutral-900 text-xs w-4 text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, 1)}
                                className="w-5 h-5 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            {/* Unit Price */}
                            <div className="col-span-2 text-right font-mono font-medium text-neutral-600 text-xs">
                              ₹{item.product.price}
                            </div>

                            {/* Line Total & Remove */}
                            <div className="col-span-2 text-right flex items-center justify-end space-x-1.5">
                              <span className="font-mono font-bold text-neutral-900 text-xs">₹{lineTotal}</span>
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.product.id)}
                                className="text-neutral-400 hover:text-red-600 transition cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add note toggle */}
                  <div className="pt-2 mt-1">
                    {showNoteInput ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          value={orderNote}
                          onChange={(e) => setOrderNote(e.target.value)}
                          placeholder="Receipt note (e.g. Table 4 / Express Delivery)"
                          className="flex-1 text-[11px] px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#6A101C]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNoteInput(false)}
                          className="p-1 text-neutral-400 hover:text-neutral-700"
                        >
                          <Check className="w-4 h-4 text-emerald-600" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowNoteInput(true)}
                        className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-[#6A101C]" />
                        <span>Add a note (visible on receipt)</span>
                      </button>
                    )}
                  </div>

                  {/* Bill Breakdown */}
                  <div className="mt-4 pt-3 border-t border-neutral-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-neutral-600">
                      <span>Subtotal</span>
                      <span className="font-mono font-bold text-neutral-900">₹{subtotal.toFixed(0)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <span className="text-neutral-600">Discount</span>
                        <button
                          type="button"
                          onClick={() => setShowDiscountInput(!showDiscountInput)}
                          className="text-[#6A101C] hover:underline font-bold text-[11px] cursor-pointer"
                        >
                          {showDiscountInput ? 'Done' : 'Add Discount'}
                        </button>
                      </div>
                      <span className="font-mono font-bold text-neutral-900">- ₹{discountAmount.toFixed(0)}</span>
                    </div>

                    {showDiscountInput && (
                      <div className="flex items-center space-x-2 py-1">
                        <span className="text-[11px] text-neutral-500">Discount (₹):</span>
                        <input
                          type="number"
                          min="0"
                          value={orderDiscount}
                          onChange={(e) => setOrderDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-20 text-xs px-2 py-1 bg-neutral-50 border border-neutral-200 rounded-md font-mono"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-neutral-600">
                      <span>Tax (GST 5%)</span>
                      <span className="font-mono font-bold text-neutral-900">₹{taxAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="mt-4 pt-3 border-t border-neutral-200/90 flex items-center justify-between">
                    <span className="text-base font-extrabold text-neutral-900">Total</span>
                    <span className="text-2xl font-black text-neutral-900 font-mono tracking-tight">
                      ₹{totalAmount.toFixed(2)}
                    </span>
                  </div>

                  {/* Payment Method Selector (4 tiles matching the design) */}
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {/* Cash */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('CASH')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                        selectedPaymentMethod === 'CASH'
                          ? 'border-[#6A101C] bg-red-50/40 text-[#6A101C] shadow-xs'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <Banknote className="w-5 h-5 mb-1" />
                      <span className="text-[11px]">Cash</span>
                    </button>

                    {/* UPI */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('UPI')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                        selectedPaymentMethod === 'UPI'
                          ? 'border-[#6A101C] bg-red-50/40 text-[#6A101C] shadow-xs'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="w-5 h-5 mb-1 flex items-center justify-center">
                        <QrCode className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-[11px]">UPI</span>
                    </button>

                    {/* Card */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('CARD')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                        selectedPaymentMethod === 'CARD'
                          ? 'border-[#6A101C] bg-red-50/40 text-[#6A101C] shadow-xs'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <Box className="w-5 h-5 mb-1 text-blue-600" />
                      <span className="text-[11px]">Card</span>
                    </button>

                    {/* More */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('MORE')}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                        selectedPaymentMethod === 'MORE'
                          ? 'border-[#6A101C] bg-red-50/40 text-[#6A101C] shadow-xs'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <MoreHorizontal className="w-5 h-5 mb-1 text-neutral-500" />
                      <span className="text-[11px]">More</span>
                    </button>
                  </div>
                </div>

                {/* Big Call to Action Button: Proceed to Payment */}
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => setShowPaymentModal(true)}
                  className="mt-5 w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-[#6A101C] hover:bg-[#7D1422] text-white rounded-2xl font-bold text-sm tracking-wide shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <span>Proceed to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4. BOTTOM 4 STATS CARDS (Matching the bottom row in screenshot) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* Card 1: Today's Sales */}
              <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-500 block">Today's Sales</span>
                  <div className="text-xl font-extrabold text-neutral-900 mt-1">₹8,420</div>
                </div>
                <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>12%</span>
                </div>
              </div>

              {/* Card 2: Orders Today */}
              <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#6A101C] flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-500 block">Orders Today</span>
                  <div className="text-xl font-extrabold text-neutral-900 mt-0.5">28</div>
                </div>
              </div>

              {/* Card 3: Items Sold */}
              <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#6A101C] flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-500 block">Items Sold</span>
                  <div className="text-xl font-extrabold text-neutral-900 mt-0.5">124</div>
                </div>
              </div>

              {/* Card 4: Pro Tip */}
              <div className="bg-[#FFFBEB] border border-amber-200/80 rounded-2xl p-4 shadow-2xs flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-900 block">Pro Tip</span>
                  <p className="text-[11px] text-amber-800 leading-tight mt-0.5">
                    Use barcode scanner for faster billing.
                  </p>
                </div>
              </div>
            </div>
          </main>
        ) : activeTab === 'Products' ? (
          /* Products Catalog View */
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Products Catalog</h2>
                <p className="text-xs text-neutral-500">Quickly check retail pricing, SKU numbers, and stock status</p>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4">SKU / Barcode</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/70">
                      <td className="py-3 px-4 font-bold text-neutral-900">{p.name}</td>
                      <td className="py-3 px-4 font-mono text-neutral-600">{p.sku}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">{p.category}</span>
                      </td>
                      <td className="py-3 px-4 font-bold">₹{p.price}</td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {p.stock <= p.low_stock_threshold ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                            {p.stock} (Low)
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {p.stock}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(p);
                            setActiveTab('POS');
                          }}
                          className="px-3 py-1 bg-[#6A101C] text-white rounded-lg text-xs font-bold hover:bg-[#7D1422] cursor-pointer"
                        >
                          + Add to Cart
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'Orders' ? (
          /* Recent Orders View */
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Today's Register Orders</h2>
              <p className="text-xs text-neutral-500">View past sales receipts, customer invoices, and issue returns</p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-2xs">
              <div className="space-y-3">
                {[
                  { id: 'INV-2026-0042', time: '09:24 AM', total: 420, items: 3, method: 'UPI', customer: 'Rahul Verma' },
                  { id: 'INV-2026-0041', time: '09:12 AM', total: 118, items: 2, method: 'CASH', customer: 'Walk-in Customer' },
                  { id: 'INV-2026-0040', time: '08:55 AM', total: 1250, items: 6, method: 'CARD', customer: 'Deepak S.' },
                ].map((ord) => (
                  <div key={ord.id} className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/50">
                    <div>
                      <div className="font-bold text-neutral-900 text-xs">{ord.id} · <span className="text-neutral-500 font-normal">{ord.customer}</span></div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">{ord.time} · {ord.items} items · {ord.method}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-neutral-900 font-mono text-sm">₹{ord.total}</div>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                        Completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'Customers' ? (
          /* Customers CRM View */
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Customer Directory</h2>
              <p className="text-xs text-neutral-500">Lookup customer loyalty points and purchase frequency</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Rahul Verma', phone: '+91 98201 22334', points: 340, tier: 'Gold' },
                { name: 'Priya Sharma', phone: '+91 98211 44556', points: 180, tier: 'Silver' },
                { name: 'Vikram Joshi', phone: '+91 98333 77889', points: 520, tier: 'Platinum' },
              ].map((c) => (
                <div key={c.phone} className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 text-[#6A101C] font-bold flex items-center justify-center text-xs">
                      {c.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-neutral-900">{c.name}</div>
                      <div className="text-[11px] text-neutral-500 font-mono">{c.phone}</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Loyalty Points:</span>
                    <span className="font-bold font-mono text-emerald-700">{c.points} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'My Shifts' ? (
          /* My Shifts View */
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">My Shift & Till Overview</h2>
              <p className="text-xs text-neutral-500">Real-time session status, cash balance, and shift logs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-bold text-neutral-500">Shift Started</span>
                <div className="text-lg font-bold text-neutral-900 mt-1">Today · 08:00 AM</div>
                <div className="text-[11px] text-emerald-600 mt-1 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Till Register Active</span>
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-bold text-neutral-500">Cash in Till</span>
                <div className="text-lg font-bold text-neutral-900 mt-1">₹3,420.00</div>
                <div className="text-[11px] text-neutral-400 mt-1">Starting float: ₹1,000</div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
                <span className="text-xs font-bold text-neutral-500">Digital / UPI Sales</span>
                <div className="text-lg font-bold text-neutral-900 mt-1">₹5,000.00</div>
                <div className="text-[11px] text-neutral-400 mt-1">Direct to shop bank account</div>
              </div>
            </div>
          </div>
        ) : (
          /* Databases Architecture View */
          <div className="p-6">
            <DatabaseConsole />
          </div>
        )}
      </div>

      {/* 4. BARCODE SCANNER MODAL */}
      {showBarcodeScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-red-50 text-[#6A101C]">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Scan Barcode / Enter SKU</h3>
                  <p className="text-[11px] text-neutral-500">Simulate barcode scanner hardware or enter code</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1.5">
                  Scan Barcode or Type Code:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={scannedBarcode}
                  onChange={(e) => setScannedBarcode(e.target.value)}
                  placeholder="e.g. 8901058852331 or SNK-MAG-70"
                  className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#6A101C]"
                />
              </div>

              {/* Clickable Quick Sample Barcodes */}
              <div>
                <span className="text-[11px] font-bold text-neutral-500 block mb-2">Quick Test Barcodes:</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {INITIAL_DEMO_PRODUCTS.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        addToCart(p);
                        setShowBarcodeScanner(false);
                      }}
                      className="p-2 text-left rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition cursor-pointer"
                    >
                      <div className="font-bold text-neutral-900 truncate text-[11px]">{p.name}</div>
                      <div className="text-[10px] font-mono text-neutral-500">{p.barcode}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBarcodeScanner(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#6A101C] hover:bg-[#7D1422] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Add to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. PAYMENT MODAL */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={totalAmount}
        isProcessing={isProcessingPayment}
        onConfirmPayment={handleConfirmPayment}
      />

      {/* 6. GST TAX INVOICE RECEIPT MODAL */}
      {completedSale && (
        <GSTReceiptModal
          isOpen={true}
          sale={completedSale.sale}
          items={completedSale.items}
          payments={completedSale.payments}
          shop={completedSale.shop}
          employee={completedSale.employee}
          onClose={() => setCompletedSale(null)}
        />
      )}

      {/* 7. NOTIFICATIONS FLYOUT */}
      {showNotifications && (
        <div className="fixed top-16 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-4 animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <span className="text-xs font-bold text-neutral-900">Notifications (3)</span>
            <button
              type="button"
              onClick={() => setShowNotifications(false)}
              className="text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-neutral-100 text-xs mt-2 space-y-2">
            <div className="pt-2">
              <div className="font-bold text-amber-900">Low Stock Alert: Surf Excel 1kg</div>
              <div className="text-[11px] text-neutral-500">Remaining units: 4. Reorder required.</div>
            </div>
            <div className="pt-2">
              <div className="font-bold text-amber-900">Low Stock Alert: Colgate Toothpaste</div>
              <div className="text-[11px] text-neutral-500">Remaining units: 5. Reorder required.</div>
            </div>
            <div className="pt-2">
              <div className="font-bold text-emerald-800">Shift Started</div>
              <div className="text-[11px] text-neutral-500">Till logged in by Amit Kumar (EMP-02)</div>
            </div>
          </div>
        </div>
      )}

      {/* 8. HELP MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">POS Keyboard Shortcuts</h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
                <span className="text-neutral-600">Focus Product Search</span>
                <kbd className="px-2 py-1 bg-white border border-neutral-300 rounded font-mono font-bold text-[10px]">
                  Ctrl + K
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
                <span className="text-neutral-600">Proceed to Payment</span>
                <kbd className="px-2 py-1 bg-white border border-neutral-300 rounded font-mono font-bold text-[10px]">
                  F4
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
                <span className="text-neutral-600">Clear Current Cart</span>
                <kbd className="px-2 py-1 bg-white border border-neutral-300 rounded font-mono font-bold text-[10px]">
                  F2
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
                <span className="text-neutral-600">Close Modals</span>
                <kbd className="px-2 py-1 bg-white border border-neutral-300 rounded font-mono font-bold text-[10px]">
                  Esc
                </kbd>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="mt-5 w-full py-2 bg-[#6A101C] text-white rounded-xl text-xs font-bold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
