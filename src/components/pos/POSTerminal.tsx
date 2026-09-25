import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../api';
import { Product, Sale, Shop, Employee, HeldBill } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { GSTReceiptModal } from './GSTReceiptModal';
import { PaymentModal, PaymentEntry } from './PaymentModal';
import { HeldBillsModal } from './HeldBillsModal';
import { TillSummaryModal } from './TillSummaryModal';
import { RefundModal } from './RefundModal';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Lock,
  Percent,
  Clock,
  RefreshCw,
  Ban,
  X,
  Printer,
  Barcode,
  PauseCircle,
  Calculator,
  User,
  Tag,
  ArrowRight,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export const POSTerminal: React.FC = () => {
  const { role, employee, shop } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Barcode Scanning State
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeFeedback, setBarcodeFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderDiscount, setOrderDiscount] = useState<string>('0');
  const [previewCalc, setPreviewCalc] = useState<any>(null);

  // Modals & Drawers
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Receipt Modal State
  const [completedSaleData, setCompletedSaleData] = useState<{
    sale: Sale;
    items: any[];
    payments?: any[];
    refunds?: any[];
    shop: Shop;
    employee: Employee;
    isReprint?: boolean;
  } | null>(null);

  // Held Bills State
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [showHeldBillsModal, setShowHeldBillsModal] = useState(false);
  const [showHoldPrompt, setShowHoldPrompt] = useState(false);
  const [holdRefLabel, setHoldRefLabel] = useState('');
  const [holdCustomerName, setHoldCustomerName] = useState('');
  const [isHolding, setIsHolding] = useState(false);

  // Till Summary Modal
  const [showTillSummary, setShowTillSummary] = useState(false);

  // Recent Sales & Void/Refund Drawer
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [salesSearch, setSalesSearch] = useState('');
  const [salesStatusFilter, setSalesStatusFilter] = useState('');

  const [voidModalSale, setVoidModalSale] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  const [refundModalSale, setRefundModalSale] = useState<Sale | null>(null);

  const isShiftLead = role === 'SHIFT_LEAD' || role === 'SHOP_ADMIN' || role === 'SUPER_ADMIN';

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.pos.getProducts({
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
      });
      setProducts(data.products);
      setCategories(data.categories);
    } catch (err: any) {
      alert('Failed to load catalog: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentSales = async () => {
    try {
      const data = await api.pos.getRecentSales({
        search: salesSearch || undefined,
        status: salesStatusFilter || undefined,
      });
      setRecentSales(data.sales);
    } catch {
      // ignore
    }
  };

  const fetchHeldBills = async () => {
    try {
      const res = await api.pos.getHeldBills();
      setHeldBills(res.heldBills || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchRecentSales();
    fetchHeldBills();
  }, [selectedCategory]);

  // Update calculation preview whenever cart or order discount changes
  useEffect(() => {
    if (cart.length === 0) {
      setPreviewCalc(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const payload = cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          discount: item.discount,
        }));
        const discountNum = parseFloat(orderDiscount) || 0;
        const res = await api.pos.calculatePreview(payload, discountNum);
        setPreviewCalc(res.calculation);
      } catch {
        // fallback to preview
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [cart, orderDiscount]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showBarcodeNotification(`"${product.name}" is out of stock`, true);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showBarcodeNotification(`Max available stock reached (${product.stock})`, true);
          return prev;
        }
        showBarcodeNotification(`Added +1 "${product.name}"`);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      showBarcodeNotification(`Added "${product.name}" to cart`);
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) {
              alert(`Maximum available stock is ${item.product.stock} units.`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const updateItemDiscount = (productId: string, disc: number) => {
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, discount: Math.max(0, disc) } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Barcode scanner lookup handler
  const showBarcodeNotification = (text: string, isError = false) => {
    setBarcodeFeedback({ text, isError });
    setTimeout(() => {
      setBarcodeFeedback((curr) => (curr?.text === text ? null : curr));
    }, 2500);
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    setBarcodeLoading(true);
    try {
      const res = await api.pos.getByBarcode(code);
      if (res?.product) {
        addToCart(res.product);
        setBarcodeInput('');
        barcodeInputRef.current?.focus();
      } else {
        showBarcodeNotification(`No product found for barcode "${code}"`, true);
      }
    } catch (err: any) {
      showBarcodeNotification(err.message || `Barcode "${code}" not found`, true);
    } finally {
      setBarcodeLoading(false);
    }
  };

  // Complete Checkout with Tender breakdown
  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    setCheckoutError(null);
    setShowPaymentModal(true);
  };

  const handleExecutePayment = async (payments: PaymentEntry[]) => {
    setIsCheckingOut(true);
    setCheckoutError(null);

    const idempotencyKey = 'idemp_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();

    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        discount: item.discount,
      }));

      const res = await api.pos.checkout({
        items: itemsPayload,
        discount: parseFloat(orderDiscount) || 0,
        idempotencyKey,
        payments,
      });

      setShowPaymentModal(false);

      // Show GST Tax Receipt Modal with payments
      setCompletedSaleData({
        sale: res.sale,
        items: res.items,
        payments: res.payments,
        shop: res.shop,
        employee: res.employee,
        isReprint: false,
      });

      // Clear Cart
      setCart([]);
      setOrderDiscount('0');

      // Refresh Inventory and Recent Sales
      fetchProducts();
      fetchRecentSales();
    } catch (err: any) {
      setCheckoutError(err.message || 'Payment processing failed. Please check stock and try again.');
      throw err;
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Hold / Park Bill
  const handleHoldBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsHolding(true);
    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        discount: item.discount,
      }));

      await api.pos.holdBill({
        items: itemsPayload,
        discount: parseFloat(orderDiscount) || 0,
        referenceLabel: holdRefLabel || undefined,
        customerName: holdCustomerName || undefined,
      });

      setCart([]);
      setOrderDiscount('0');
      setHoldRefLabel('');
      setHoldCustomerName('');
      setShowHoldPrompt(false);
      fetchHeldBills();
      showBarcodeNotification('Order placed on hold successfully');
    } catch (err: any) {
      alert('Failed to hold order: ' + err.message);
    } finally {
      setIsHolding(false);
    }
  };

  const handleResumeHeldBill = async (id: string) => {
    try {
      const res = await api.pos.resumeHeldBill(id);
      if (res.cartData?.items) {
        // Hydrate cart from product catalog
        const newCart: CartItem[] = [];
        for (const item of res.cartData.items) {
          const product = products.find((p) => p.id === item.productId) || {
            id: item.productId,
            sku: item.sku || 'SKU',
            name: item.name || 'Product',
            category: 'Retail',
            price: Number(item.price || item.unitPrice || 0),
            stock: 99,
            low_stock_threshold: 5,
            tax_rate: item.taxRate || 18,
            shop_id: shop?.id || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          newCart.push({
            product,
            quantity: item.quantity,
            discount: item.discount || 0,
          });
        }
        setCart(newCart);
        setOrderDiscount(String(res.cartData.discount || 0));
        fetchHeldBills();
        showBarcodeNotification('Held order resumed into cart');
      }
    } catch (err: any) {
      alert('Failed to resume bill: ' + err.message);
    }
  };

  const handleCancelHeldBill = async (id: string) => {
    try {
      await api.pos.cancelHeldBill(id);
      fetchHeldBills();
      showBarcodeNotification('Held order discarded');
    } catch (err: any) {
      alert('Failed to discard held bill: ' + err.message);
    }
  };

  // View Receipt (Reprint)
  const handleViewReceipt = async (saleId: string) => {
    try {
      const res = await api.pos.getReceipt(saleId);
      setCompletedSaleData({
        sale: res.sale,
        items: res.items,
        payments: res.payments,
        refunds: res.refunds,
        shop: res.shop,
        employee: res.employee,
        isReprint: true,
      });
    } catch (err: any) {
      alert('Failed to load receipt: ' + err.message);
    }
  };

  // Void Sale
  const handleVoidSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidModalSale) return;
    setVoidSubmitting(true);
    try {
      await api.pos.voidSale(voidModalSale.id, voidReason);
      setVoidModalSale(null);
      setVoidReason('');
      fetchRecentSales();
      fetchProducts();
      alert('Sale voided and inventory returned to stock.');
    } catch (err: any) {
      alert('Failed to void sale: ' + err.message);
    } finally {
      setVoidSubmitting(false);
    }
  };

  const totalCartQty = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Session Till Header */}
      <div className="mb-4 bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-black tracking-tight text-sm shadow-xs">
            POS
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-neutral-900 text-sm">{shop?.name || 'Retail Store'}</span>
              <span className="text-[11px] font-mono text-neutral-400">({shop?.gst_number || 'GSTIN Pending'})</span>
            </div>
            <div className="flex items-center space-x-2 text-neutral-500 mt-0.5 text-[11px]">
              <span>
                Till Operator: <strong className="text-neutral-900">{employee?.name || 'Staff'}</strong> ({employee?.employee_id})
              </span>
              <span>•</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  isShiftLead ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {employee?.tier || role}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Held Bills Button */}
          <button
            type="button"
            onClick={() => setShowHeldBillsModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#FFF5E6] hover:bg-[#FFECCB] text-[#B25E00] border border-[#FFDEAC] rounded-xl font-bold transition cursor-pointer"
          >
            <PauseCircle className="w-4 h-4 text-[#B25E00]" />
            <span>Held Bills</span>
            {heldBills.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-[#B25E00] text-white rounded-full text-[10px] font-mono font-bold">
                {heldBills.length}
              </span>
            )}
          </button>

          {/* Till Summary Report */}
          <button
            type="button"
            onClick={() => setShowTillSummary(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#FFFDF8] hover:bg-[#F7F1E7] text-[#171717] border border-[#E5DDCF] rounded-xl font-semibold transition cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5 text-[#68151F]" />
            <span>Till Summary</span>
          </button>

          {/* Recent Sales & Returns */}
          <button
            type="button"
            onClick={() => setShowRecentSales(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#102A43] hover:bg-[#0C2033] text-white rounded-xl font-bold transition cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sales & Returns</span>
          </button>
        </div>
      </div>

      {/* Main Terminal Layout: Left 65% Catalog & Scanner, Right 35% Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* CATALOG AREA (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barcode Quick Scanner Bar */}
          <div className="bg-[#68151F] text-white p-3 rounded-2xl shadow-sm border border-[#521017]">
            <form onSubmit={handleBarcodeSubmit} className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 pl-2 text-white/70">
                <Barcode className="w-5 h-5 text-[#E84E59]" />
                <span className="text-[11px] font-mono uppercase font-bold tracking-wider hidden sm:inline text-white">
                  Scan Barcode
                </span>
              </div>
              <div className="relative flex-1">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan barcode or type SKU and press Enter..."
                  className="w-full px-3 py-2 bg-[#521017] text-white placeholder-white/50 border border-white/20 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#E84E59] focus:outline-hidden"
                />
              </div>
              <button
                type="submit"
                disabled={barcodeLoading || !barcodeInput.trim()}
                className="px-4 py-2 bg-[#FFFDF8] hover:bg-white text-[#68151F] font-black rounded-xl text-xs uppercase tracking-wider transition disabled:opacity-40 cursor-pointer shadow-xs"
              >
                {barcodeLoading ? 'Scanning...' : 'Scan'}
              </button>
            </form>

            {/* Live scan feedback toast */}
            {barcodeFeedback && (
              <div
                className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 ${
                  barcodeFeedback.isError
                    ? 'bg-red-950/80 text-red-200 border border-red-800'
                    : 'bg-emerald-950/80 text-emerald-200 border border-emerald-800'
                }`}
              >
                {barcodeFeedback.isError ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span>{barcodeFeedback.text}</span>
              </div>
            )}
          </div>

          {/* Search & Categories */}
          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                  placeholder="Search products by name or SKU..."
                  className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={fetchProducts}
                className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition cursor-pointer"
              >
                Find
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer whitespace-nowrap ${
                  selectedCategory === ''
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                All Catalog
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer whitespace-nowrap ${
                    selectedCategory === c
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {loading ? (
              <div className="col-span-3 py-12 text-center text-neutral-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading retail inventory...
              </div>
            ) : products.length === 0 ? (
              <div className="col-span-3 py-12 text-center text-neutral-400 text-xs">
                No matching products found in catalog.
              </div>
            ) : (
              products.map((prod) => {
                const isOutOfStock = prod.stock <= 0;
                const isLowStock = prod.stock <= prod.low_stock_threshold && !isOutOfStock;

                return (
                  <button
                    key={prod.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(prod)}
                    className={`p-3.5 bg-white rounded-2xl border text-left transition flex flex-col justify-between group cursor-pointer ${
                      isOutOfStock
                        ? 'opacity-50 border-neutral-200 cursor-not-allowed bg-neutral-50'
                        : 'border-neutral-200 hover:border-neutral-900 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono mb-1">
                        <span>{prod.sku}</span>
                        <span className="font-semibold text-neutral-500 uppercase">{prod.category}</span>
                      </div>
                      <h4 className="font-bold text-neutral-900 text-xs line-clamp-2 group-hover:text-neutral-950">
                        {prod.name}
                      </h4>
                      {prod.barcode && (
                        <div className="flex items-center text-[10px] text-neutral-400 font-mono mt-0.5">
                          <Barcode className="w-3 h-3 mr-1 text-neutral-400" />
                          <span>{prod.barcode}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-100 flex items-baseline justify-between">
                      <span className="text-sm font-black text-neutral-900 font-mono">
                        ₹{prod.price.toFixed(2)}
                      </span>

                      {isOutOfStock ? (
                        <span className="text-[10px] font-bold text-red-600 uppercase">Out of stock</span>
                      ) : isLowStock ? (
                        <span className="text-[10px] font-bold text-amber-600">Stock: {prod.stock}</span>
                      ) : (
                        <span className="text-[10px] font-medium text-neutral-400">Stock: {prod.stock}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* CART & CHECKOUT AREA (Col 5) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden flex flex-col">
          {/* Cart Header */}
          <div className="px-5 py-3.5 border-b border-neutral-100 bg-neutral-50/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4 text-neutral-700" />
              <h3 className="font-bold text-neutral-900 text-xs uppercase tracking-wide">
                Current Order ({totalCartQty} items)
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              {cart.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowHoldPrompt(true)}
                    className="flex items-center space-x-1 px-2.5 py-1 text-amber-800 bg-amber-100/70 hover:bg-amber-100 rounded-lg text-[11px] font-bold transition cursor-pointer"
                  >
                    <PauseCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Hold</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-[11px] text-neutral-400 hover:text-red-600 transition font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Cart Items List */}
          <div className="p-4 overflow-y-auto max-h-72 min-h-[170px] divide-y divide-neutral-100 text-xs">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-neutral-400">
                <ShoppingCart className="w-9 h-9 mx-auto mb-2 text-neutral-300" />
                <p className="font-bold text-xs text-neutral-600">Cart is empty</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Scan a barcode or tap products from the catalog to add
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex-1 pr-1">
                    <span className="font-semibold text-neutral-900 block leading-tight">{item.product.name}</span>
                    <div className="flex items-center space-x-2 text-[10px] text-neutral-400 font-mono mt-0.5">
                      <span>₹{item.product.price.toFixed(2)} ea</span>
                      <span>•</span>
                      <span>GST {item.product.tax_rate}%</span>
                      {item.discount > 0 && (
                        <span className="text-red-600 font-bold">Disc: -₹{item.discount.toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 cursor-pointer text-xs font-bold"
                    >
                      <Minus className="w-3 h-3 text-neutral-600" />
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-neutral-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-6 h-6 rounded border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 cursor-pointer text-xs font-bold"
                    >
                      <Plus className="w-3 h-3 text-neutral-600" />
                    </button>

                    <span className="w-16 text-right font-mono font-bold text-neutral-900 text-xs ml-1">
                      ₹{((item.product.price * item.quantity) - (item.discount * item.quantity)).toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-neutral-300 hover:text-red-600 ml-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Totals & Authorization Controls */}
          <div className="p-4 bg-neutral-50/70 border-t border-neutral-200 space-y-2 text-xs">
            {/* Discount Control with RBAC */}
            <div className="pb-2 border-b border-neutral-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-700 flex items-center space-x-1">
                  <Percent className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Order Discount (₹):</span>
                </span>
                {isShiftLead ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={orderDiscount}
                    onChange={(e) => setOrderDiscount(e.target.value)}
                    placeholder="0.00"
                    className="w-24 px-2 py-1 border border-neutral-300 rounded-lg text-right font-mono text-xs bg-white focus:ring-1 focus:ring-neutral-900"
                  />
                ) : (
                  <div className="flex items-center space-x-1 text-neutral-400">
                    <Lock className="w-3 h-3" />
                    <span className="text-[10px] italic">Shift Lead Required</span>
                  </div>
                )}
              </div>
            </div>

            {/* Authoritative GST Calculations Breakdown */}
            <div className="space-y-1.5 text-neutral-600 text-[11px]">
              <div className="flex justify-between">
                <span>Gross Subtotal:</span>
                <span className="font-mono">₹{previewCalc ? previewCalc.subtotal.toFixed(2) : '0.00'}</span>
              </div>

              {parseFloat(orderDiscount) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Authorized Discount:</span>
                  <span className="font-mono">-₹{previewCalc ? previewCalc.discount.toFixed(2) : '0.00'}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <span className="font-mono">₹{previewCalc ? previewCalc.taxableAmount.toFixed(2) : '0.00'}</span>
              </div>

              {previewCalc?.igstAmount > 0 ? (
                <div className="flex justify-between text-purple-800">
                  <span>Integrated GST (IGST):</span>
                  <span className="font-mono">₹{previewCalc.igstAmount.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Central GST (CGST 50%):</span>
                    <span className="font-mono">₹{previewCalc ? previewCalc.cgstAmount.toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>State GST (SGST 50%):</span>
                    <span className="font-mono">₹{previewCalc ? previewCalc.sgstAmount.toFixed(2) : '0.00'}</span>
                  </div>
                </>
              )}
            </div>

            {/* Grand Total */}
            <div className="pt-2 border-t border-neutral-300 flex justify-between items-baseline text-neutral-900">
              <span className="font-black text-sm uppercase tracking-wide">Grand Total:</span>
              <span className="font-black text-xl font-mono text-neutral-950">
                ₹{previewCalc ? previewCalc.totalAmount.toFixed(2) : '0.00'}
              </span>
            </div>

            {checkoutError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                {checkoutError}
              </div>
            )}

            {/* Payment Trigger Button */}
            <button
              id="btn-complete-sale"
              disabled={cart.length === 0 || isCheckingOut}
              onClick={handleOpenPayment}
              className="w-full mt-2 py-3 bg-[#68151F] text-white hover:bg-[#521017] rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md disabled:opacity-40 cursor-pointer flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Pay & Checkout • ₹{previewCalc ? previewCalc.totalAmount.toFixed(2) : '0.00'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* PAYMENT MODAL (Tenders: Cash, Card, UPI, Split) */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        totalAmount={previewCalc ? previewCalc.totalAmount : 0}
        isProcessing={isCheckingOut}
        onConfirmPayment={handleExecutePayment}
      />

      {/* HOLD BILL PROMPT DIALOG */}
      {showHoldPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center space-x-2">
                <PauseCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-sm text-neutral-900">Park / Hold Active Order</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHoldPrompt(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHoldBill} className="mt-4 space-y-3 text-xs">
              <p className="text-neutral-600">
                This will save the current cart ({totalCartQty} items) so you can attend to other customers.
              </p>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Reference Label (Optional)</label>
                <input
                  type="text"
                  value={holdRefLabel}
                  onChange={(e) => setHoldRefLabel(e.target.value)}
                  placeholder="e.g. Table 4 / Blue Shirt Customer"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Customer Name / Phone (Optional)</label>
                <input
                  type="text"
                  value={holdCustomerName}
                  onChange={(e) => setHoldCustomerName(e.target.value)}
                  placeholder="e.g. Rahul S. / 9876543210"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowHoldPrompt(false)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-xl text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isHolding}
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  {isHolding ? 'Holding...' : 'Confirm Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HELD BILLS DRAWER / MODAL */}
      <HeldBillsModal
        isOpen={showHeldBillsModal}
        onClose={() => setShowHeldBillsModal(false)}
        heldBills={heldBills}
        onResume={handleResumeHeldBill}
        onCancel={handleCancelHeldBill}
      />

      {/* TILL SUMMARY RECONCILIATION MODAL */}
      <TillSummaryModal
        isOpen={showTillSummary}
        onClose={() => setShowTillSummary(false)}
        shop={shop || {}}
        employee={employee || undefined}
      />

      {/* GST RECEIPT MODAL (Supports reprint & tender breakdown) */}
      {completedSaleData && (
        <GSTReceiptModal
          isOpen={Boolean(completedSaleData)}
          onClose={() => setCompletedSaleData(null)}
          sale={completedSaleData.sale}
          items={completedSaleData.items}
          payments={completedSaleData.payments}
          refunds={completedSaleData.refunds}
          shop={completedSaleData.shop}
          employee={completedSaleData.employee}
          isReprint={completedSaleData.isReprint}
        />
      )}

      {/* RECENT SALES & RETURNS DRAWER */}
      {showRecentSales && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-neutral-200">
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <div>
                <h3 className="font-extrabold text-neutral-900 text-sm">Sales & Transaction History</h3>
                <p className="text-[11px] text-neutral-500">Reprint tax invoices, process returns, or void sales</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentSales(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter inputs */}
            <div className="p-3 border-b border-neutral-200 bg-white grid grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRecentSales()}
                placeholder="Search invoice #"
                className="px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs"
              />
              <select
                value={salesStatusFilter}
                onChange={(e) => {
                  setSalesStatusFilter(e.target.value);
                  fetchRecentSales();
                }}
                className="px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white"
              >
                <option value="">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="VOIDED">Voided</option>
              </select>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3 text-xs">
              {recentSales.length === 0 ? (
                <div className="py-12 text-center text-neutral-400">No matching sales recorded.</div>
              ) : (
                recentSales.map((sale: any) => (
                  <div key={sale.id} className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-neutral-900 text-xs">{sale.invoice_number}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          sale.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-600 text-[11px]">
                      <span>Operator: {sale.employee_name} ({sale.employee_tier})</span>
                      <span className="font-mono font-bold text-neutral-900 text-sm">
                        ₹{sale.total_amount.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-[10px] text-neutral-400 font-mono">
                      {new Date(sale.created_at).toLocaleString()}
                    </div>

                    {sale.status === 'COMPLETED' && (
                      <div className="pt-2 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(sale.id)}
                          className="flex items-center space-x-1 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Reprint Bill</span>
                        </button>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setRefundModalSale(sale)}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                            <span>Return Item</span>
                          </button>

                          {isShiftLead && (
                            <button
                              type="button"
                              onClick={() => {
                                setVoidModalSale(sale);
                                setVoidReason('');
                              }}
                              className="flex items-center space-x-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-semibold text-[11px] transition cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Void</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VOID SALE MODAL */}
      {voidModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-900 text-sm">Authorize Void: {voidModalSale.invoice_number}</h3>
              <button
                type="button"
                onClick={() => setVoidModalSale(null)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVoidSale} className="mt-4 space-y-3 text-xs">
              <p className="text-neutral-600">
                Voiding this sale will return all items to inventory, mark the invoice as VOIDED, and record an audit log with your credentials.
              </p>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">Reason for Void *</label>
                <textarea
                  required
                  rows={2}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Scanned wrong customer cart, duplicate charge"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setVoidModalSale(null)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-xl text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={voidSubmitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  {voidSubmitting ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REFUND / ITEM RETURN MODAL */}
      {refundModalSale && (
        <RefundModal
          isOpen={Boolean(refundModalSale)}
          onClose={() => setRefundModalSale(null)}
          sale={refundModalSale}
          onSuccess={() => {
            fetchRecentSales();
            fetchProducts();
          }}
        />
      )}
    </div>
  );
};
