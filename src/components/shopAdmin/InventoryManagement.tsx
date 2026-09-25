import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../api';
import { Product } from '../../types';
import {
  Plus,
  Package,
  AlertTriangle,
  Search,
  Filter,
  Trash2,
  Edit,
  RefreshCw,
  X,
  ArrowUpDown,
  Download,
  TrendingUp,
  CheckCircle2,
  Boxes,
  DollarSign,
  AlertCircle,
  BarChart3,
  Layers,
  Sparkles,
} from 'lucide-react';

type SortField = 'name' | 'sku' | 'stock' | 'cost_price' | 'price';
type SortOrder = 'asc' | 'desc';

export const InventoryManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    sku: '',
    name: '',
    category: '',
    costPrice: '',
    price: '', // Selling Price
    stock: '',
    lowStockThreshold: '5',
    taxRate: '18',
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Product Modal
  const [editModalProduct, setEditModalProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    costPrice: '',
    price: '', // Selling Price
    stock: '',
    lowStockThreshold: '',
    taxRate: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Quick Stock Adjustment Modal
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState<number>(10);
  const [stockAdjustSubmitting, setStockAdjustSubmitting] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await api.shopAdmin.getInventory({
        category: selectedCategory || undefined,
        lowStockOnly,
      });
      setProducts(data.products || []);
      setCategories(data.categories || []);
    } catch (err: any) {
      alert('Failed to load inventory: ' + (err.message || 'Network error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedCategory, lowStockOnly]);

  // Client-side instant filtering & sorting
  const filteredProducts = useMemo(() => {
    return products
      .filter((prod) => {
        const query = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !query ||
          prod.name.toLowerCase().includes(query) ||
          prod.sku.toLowerCase().includes(query) ||
          prod.category.toLowerCase().includes(query) ||
          (prod.barcode && prod.barcode.toLowerCase().includes(query));

        const matchesCategory = !selectedCategory || prod.category === selectedCategory;
        const matchesLowStock = !lowStockOnly || prod.stock <= prod.low_stock_threshold;

        return matchesSearch && matchesCategory && matchesLowStock;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        // Handle cost price fallback for sorting
        if (sortField === 'cost_price') {
          valA = a.cost_price ?? (a.costPrice ?? Math.round(a.price * 0.72));
          valB = b.cost_price ?? (b.costPrice ?? Math.round(b.price * 0.72));
        }

        if (typeof valA === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      });
  }, [products, searchTerm, selectedCategory, lowStockOnly, sortField, sortOrder]);

  // Inventory KPI calculations
  const stats = useMemo(() => {
    const totalSkus = products.length;
    const totalUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
    const totalCostValuation = products.reduce((acc, p) => {
      const cost = p.cost_price ?? (p.costPrice ?? Math.round(p.price * 0.72));
      return acc + (p.stock || 0) * cost;
    }, 0);
    const totalRetailValuation = products.reduce((acc, p) => acc + (p.stock || 0) * (p.price || 0), 0);
    const lowStockCount = products.filter((p) => p.stock <= p.low_stock_threshold).length;

    return {
      totalSkus,
      totalUnits,
      totalCostValuation,
      totalRetailValuation,
      lowStockCount,
      estimatedGrossMargin:
        totalRetailValuation > 0
          ? Math.round(((totalRetailValuation - totalCostValuation) / totalRetailValuation) * 100)
          : 0,
    };
  }, [products]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError(null);
    try {
      const numSellingPrice = parseFloat(addForm.price);
      const numCostPrice = addForm.costPrice
        ? parseFloat(addForm.costPrice)
        : Math.round(numSellingPrice * 0.72 * 100) / 100;

      await api.shopAdmin.createProduct({
        sku: addForm.sku.trim().toUpperCase(),
        name: addForm.name.trim(),
        category: addForm.category.trim(),
        costPrice: numCostPrice,
        price: numSellingPrice,
        stock: parseInt(addForm.stock) || 0,
        lowStockThreshold: parseInt(addForm.lowStockThreshold) || 5,
        taxRate: parseFloat(addForm.taxRate) || 18,
      });

      setShowAddModal(false);
      setAddForm({
        sku: '',
        name: '',
        category: '',
        costPrice: '',
        price: '',
        stock: '',
        lowStockThreshold: '5',
        taxRate: '18',
      });
      fetchInventory();
    } catch (err: any) {
      setAddError(err.message || 'Failed to add product');
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalProduct) return;
    setEditSubmitting(true);
    try {
      const numSellingPrice = parseFloat(editForm.price);
      const numCostPrice = editForm.costPrice ? parseFloat(editForm.costPrice) : undefined;

      await api.shopAdmin.updateProduct(editModalProduct.id, {
        name: editForm.name.trim(),
        category: editForm.category.trim(),
        costPrice: numCostPrice,
        price: numSellingPrice,
        stock: parseInt(editForm.stock) || 0,
        lowStockThreshold: parseInt(editForm.lowStockThreshold) || 5,
        taxRate: parseFloat(editForm.taxRate) || 18,
      });
      setEditModalProduct(null);
      fetchInventory();
    } catch (err: any) {
      alert('Failed to update product: ' + err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleStockAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustProduct) return;
    setStockAdjustSubmitting(true);
    try {
      const newStock = Math.max(0, stockAdjustProduct.stock + stockDelta);
      await api.shopAdmin.updateProduct(stockAdjustProduct.id, {
        stock: newStock,
      });
      setStockAdjustProduct(null);
      fetchInventory();
    } catch (err: any) {
      alert('Failed to adjust stock: ' + err.message);
    } finally {
      setStockAdjustSubmitting(false);
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (
      !window.confirm(
        `Delete product "${prod.name}" (${prod.sku})? Note: Products with previous transaction records cannot be deleted to protect accounting audit trails.`
      )
    ) {
      return;
    }

    try {
      await api.shopAdmin.deleteProduct(prod.id);
      fetchInventory();
    } catch (err: any) {
      alert('Delete blocked: ' + err.message);
    }
  };

  const exportCSV = () => {
    const headers = ['Product Name', 'SKU', 'Stock Level', 'Cost Price (INR)', 'Selling Price (INR)', 'Category', 'Tax Rate'];
    const rows = filteredProducts.map((p) => {
      const cost = p.cost_price ?? (p.costPrice ?? Math.round(p.price * 0.72));
      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.sku}"`,
        p.stock,
        cost.toFixed(2),
        p.price.toFixed(2),
        `"${p.category}"`,
        `${p.tax_rate}%`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight font-serif">
              Inventory Management
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
              {products.length} Products
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Monitor real-time inventory levels, track procurement cost prices, manage selling prices, and restock items
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={fetchInventory}
            className="p-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#6A101C]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Export</span>
          </button>

          <button
            id="btn-add-product"
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-[#6A101C] hover:bg-[#7D1422] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total Catalog</span>
            <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-neutral-900 mt-2">{stats.totalSkus} SKUs</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">{stats.totalUnits.toLocaleString()} units in stock</div>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Cost Valuation</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-neutral-900 mt-2">
            ₹{Math.round(stats.totalCostValuation).toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Asset purchase cost</div>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Retail Valuation</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-800 mt-2">
            ₹{Math.round(stats.totalRetailValuation).toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">~{stats.estimatedGrossMargin}% avg profit margin</div>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Stock Alerts</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                stats.lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-xl font-bold mt-2 ${
              stats.lowStockCount > 0 ? 'text-red-700' : 'text-neutral-900'
            }`}
          >
            {stats.lowStockCount} Items
          </div>
          <div className="text-[11px] text-neutral-500 mt-0.5">
            {stats.lowStockCount > 0 ? 'Need immediate restocking' : 'All stocks optimal'}
          </div>
        </div>
      </div>

      {/* SEARCH BAR & FILTER CONTROLS */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Main Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="inventory-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Product Name, SKU, Barcode, or Category..."
              className="w-full bg-neutral-50 border border-neutral-200 text-xs pl-10 pr-9 py-2.5 rounded-xl focus:bg-white focus:outline-none focus:border-[#6A101C] transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer p-0.5"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Category Selector & Low Stock Toggle */}
          <div className="flex items-center space-x-2.5 self-end md:self-auto w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-neutral-700 focus:outline-none focus:border-[#6A101C] cursor-pointer flex-1 md:flex-none"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`flex items-center space-x-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                lowStockOnly
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${lowStockOnly ? 'text-amber-700' : 'text-neutral-400'}`} />
              <span>Low Stock</span>
              {stats.lowStockCount > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    lowStockOnly ? 'bg-amber-200 text-amber-900' : 'bg-neutral-200 text-neutral-700'
                  }`}
                >
                  {stats.lowStockCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search Results Summary & Active Filter Indicator */}
        <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-100">
          <div className="flex items-center space-x-2">
            <span>
              Showing <strong className="text-neutral-900 font-semibold">{filteredProducts.length}</strong> of{' '}
              <strong className="text-neutral-900 font-semibold">{products.length}</strong> products
            </span>
            {searchTerm && (
              <span className="text-[#6A101C] bg-[#6A101C]/5 px-2 py-0.5 rounded-md font-medium">
                Matching: "{searchTerm}"
              </span>
            )}
            {selectedCategory && (
              <span className="text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md font-medium">
                Category: {selectedCategory}
              </span>
            )}
          </div>

          {(searchTerm || selectedCategory || lowStockOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
                setLowStockOnly(false);
              }}
              className="text-[#6A101C] hover:underline font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* INVENTORY MANAGEMENT TABLE */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50/90 border-b border-neutral-200 text-neutral-600 uppercase font-bold tracking-wider text-[10px]">
                {/* 1. Product Name */}
                <th
                  onClick={() => handleSort('name')}
                  className="py-3.5 px-4 cursor-pointer hover:text-neutral-900 select-none group"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Product Name</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 group-hover:text-neutral-700 transition" />
                  </div>
                </th>

                {/* 2. SKU */}
                <th
                  onClick={() => handleSort('sku')}
                  className="py-3.5 px-4 cursor-pointer hover:text-neutral-900 select-none group"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>SKU</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 group-hover:text-neutral-700 transition" />
                  </div>
                </th>

                {/* 3. Stock Level */}
                <th
                  onClick={() => handleSort('stock')}
                  className="py-3.5 px-4 cursor-pointer hover:text-neutral-900 select-none group"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Stock Level</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 group-hover:text-neutral-700 transition" />
                  </div>
                </th>

                {/* 4. Cost Price */}
                <th
                  onClick={() => handleSort('cost_price')}
                  className="py-3.5 px-4 cursor-pointer hover:text-neutral-900 select-none group text-right"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Cost Price</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 group-hover:text-neutral-700 transition" />
                  </div>
                </th>

                {/* 5. Selling Price */}
                <th
                  onClick={() => handleSort('price')}
                  className="py-3.5 px-4 cursor-pointer hover:text-neutral-900 select-none group text-right"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Selling Price</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400 group-hover:text-neutral-700 transition" />
                  </div>
                </th>

                {/* Profit Margin Spread */}
                <th className="py-3.5 px-4 text-right hidden md:table-cell">Margin</th>

                {/* Actions */}
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6A101C]" />
                    <span className="text-xs">Loading inventory products...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Package className="w-8 h-8 text-neutral-300 mx-auto" />
                      <p className="text-xs font-semibold text-neutral-700">No matching products found</p>
                      <p className="text-[11px] text-neutral-400">
                        Try changing your search query or clear active filters.
                      </p>
                      {(searchTerm || selectedCategory || lowStockOnly) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedCategory('');
                            setLowStockOnly(false);
                          }}
                          className="mt-2 text-xs font-bold text-[#6A101C] hover:underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isLow = prod.stock <= prod.low_stock_threshold;
                  const isOut = prod.stock === 0;
                  const costPrice =
                    prod.cost_price ?? (prod.costPrice ?? Math.round(prod.price * 0.72 * 100) / 100);
                  const sellingPrice = prod.price;
                  const profitUnit = sellingPrice - costPrice;
                  const marginPct =
                    sellingPrice > 0 ? Math.round((profitUnit / sellingPrice) * 100) : 0;

                  return (
                    <tr key={prod.id} className="hover:bg-neutral-50/70 transition">
                      {/* 1. Product Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900 text-xs sm:text-[13px]">{prod.name}</div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 text-[10px] font-medium">
                            {prod.category}
                          </span>
                          {prod.barcode && (
                            <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline">
                              Bar: {prod.barcode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. SKU */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-neutral-100 font-mono font-bold text-neutral-800 text-[11px] border border-neutral-200">
                          {prod.sku}
                        </span>
                      </td>

                      {/* 3. Stock Level */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-extrabold text-xs sm:text-sm text-neutral-900">
                            {prod.stock}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-medium">units</span>
                        </div>
                        <div className="mt-1">
                          {isOut ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              <span>Low (≤{prod.low_stock_threshold})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              In Stock
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Cost Price */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-semibold text-neutral-600 text-xs sm:text-sm">
                          ₹{costPrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-neutral-400">Procurement</div>
                      </td>

                      {/* 5. Selling Price */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-bold text-neutral-900 text-xs sm:text-sm">
                          ₹{sellingPrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-medium">
                          GST: {prod.tax_rate}%
                        </div>
                      </td>

                      {/* Margin / Profit */}
                      <td className="py-3.5 px-4 text-right hidden md:table-cell">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            marginPct >= 20
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : marginPct > 0
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          +{marginPct}% (₹{profitUnit.toFixed(0)})
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Quick Restock Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setStockAdjustProduct(prod);
                              setStockDelta(10);
                            }}
                            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
                            title="Quick Stock Adjustment"
                          >
                            <Boxes className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Product */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditModalProduct(prod);
                              setEditForm({
                                name: prod.name,
                                category: prod.category,
                                costPrice: String(costPrice),
                                price: String(prod.price),
                                stock: String(prod.stock),
                                lowStockThreshold: String(prod.low_stock_threshold),
                                taxRate: String(prod.tax_rate),
                              });
                            }}
                            className="p-1.5 text-neutral-600 hover:text-[#6A101C] hover:bg-neutral-100 rounded-lg transition cursor-pointer"
                            title="Edit Product Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Product */}
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod)}
                            className="p-1.5 text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#6A101C] text-white">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Add New Product</h3>
                  <p className="text-[11px] text-neutral-500">
                    Define product name, SKU, stock quantity, cost price, and selling price
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="mt-4 space-y-3.5 text-xs">
              {addError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
                  {addError}
                </div>
              )}

              {/* Product Name */}
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Organic Basmati Rice 5kg"
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#6A101C] focus:outline-none"
                />
              </div>

              {/* SKU & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={addForm.sku}
                    onChange={(e) => setAddForm({ ...addForm, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. GR-003"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-[#6A101C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    placeholder="e.g. Grocery"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#6A101C] focus:outline-none"
                  />
                </div>
              </div>

              {/* Cost Price & Selling Price */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-2xl">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Cost Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={addForm.costPrice}
                    onChange={(e) => setAddForm({ ...addForm, costPrice: e.target.value })}
                    placeholder="e.g. 480.00"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#6A101C] focus:outline-none"
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">Purchase unit cost</span>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={addForm.price}
                    onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                    placeholder="e.g. 650.00"
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl font-mono text-xs font-bold focus:ring-2 focus:ring-[#6A101C] focus:outline-none"
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">Customer retail price</span>
                </div>
              </div>

              {/* Profit Preview */}
              {addForm.costPrice && addForm.price && (
                <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800">
                  <span>Gross Profit per Unit:</span>
                  <span className="font-bold">
                    ₹{(parseFloat(addForm.price) - parseFloat(addForm.costPrice)).toFixed(2)} (
                    {Math.round(
                      ((parseFloat(addForm.price) - parseFloat(addForm.costPrice)) /
                        parseFloat(addForm.price)) *
                        100
                    )}
                    % margin)
                  </span>
                </div>
              )}

              {/* Stock Level, Low Threshold, Tax Rate */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Stock Level *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={addForm.stock}
                    onChange={(e) => setAddForm({ ...addForm, stock: e.target.value })}
                    placeholder="50"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-[#6A101C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Low Alert *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={addForm.lowStockThreshold}
                    onChange={(e) => setAddForm({ ...addForm, lowStockThreshold: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-[#6A101C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">GST Tax Rate</label>
                  <select
                    value={addForm.taxRate}
                    onChange={(e) => setAddForm({ ...addForm, taxRate: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#6A101C] focus:outline-none cursor-pointer"
                  >
                    <option value="0">0% (Nil)</option>
                    <option value="5">5% (Grocery)</option>
                    <option value="12">12%</option>
                    <option value="18">18% (Retail)</option>
                    <option value="28">28% (Luxury)</option>
                  </select>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="px-5 py-2 bg-[#6A101C] hover:bg-[#7D1422] text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {addSubmitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  Edit Product: <span className="font-mono text-[#6A101C]">{editModalProduct.sku}</span>
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Update product name, cost price, selling price, stock level, or category
                </p>
              </div>
              <button
                onClick={() => setEditModalProduct(null)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#6A101C] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Category *</label>
                <input
                  type="text"
                  required
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#6A101C] focus:outline-none"
                />
              </div>

              {/* Cost Price & Selling Price */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-2xl">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Cost Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editForm.costPrice}
                    onChange={(e) => setEditForm({ ...editForm, costPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#6A101C] focus:outline-none"
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">Procurement unit cost</span>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-xl font-mono text-xs font-bold focus:ring-2 focus:ring-[#6A101C] focus:outline-none"
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">Customer retail price</span>
                </div>
              </div>

              {/* Stock, Low Threshold, Tax */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Stock Level *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editForm.stock}
                    onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-[#6A101C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Low Threshold *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editForm.lowStockThreshold}
                    onChange={(e) => setEditForm({ ...editForm, lowStockThreshold: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-[#6A101C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">GST Tax (%)</label>
                  <select
                    value={editForm.taxRate}
                    onChange={(e) => setEditForm({ ...editForm, taxRate: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#6A101C] focus:outline-none cursor-pointer"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setEditModalProduct(null)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 bg-[#6A101C] hover:bg-[#7D1422] text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {editSubmitting ? 'Updating...' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STOCK ADJUSTMENT MODAL */}
      {stockAdjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-neutral-100 text-neutral-800">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Quick Restock</h3>
                  <p className="text-[11px] text-neutral-500 font-mono">{stockAdjustProduct.sku}</p>
                </div>
              </div>
              <button
                onClick={() => setStockAdjustProduct(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-neutral-700 block mb-1">Product:</span>
                <div className="font-bold text-neutral-900">{stockAdjustProduct.name}</div>
                <div className="text-neutral-500 text-[11px] mt-0.5">
                  Current Stock: <strong className="text-neutral-900">{stockAdjustProduct.stock} units</strong>
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1.5">Adjustment Quantity (+ / -):</label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setStockDelta(stockDelta - 5)}
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 font-bold"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockDelta(stockDelta - 1)}
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 font-bold"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    value={stockDelta}
                    onChange={(e) => setStockDelta(parseInt(e.target.value) || 0)}
                    className="w-20 text-center py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg font-mono font-bold text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setStockDelta(stockDelta + 1)}
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 font-bold"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockDelta(stockDelta + 10)}
                    className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 font-bold"
                  >
                    +10
                  </button>
                </div>

                <div className="mt-2 text-[11px] text-neutral-600">
                  New stock will be:{' '}
                  <strong className="text-neutral-900 font-bold">
                    {Math.max(0, stockAdjustProduct.stock + stockDelta)} units
                  </strong>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setStockAdjustProduct(null)}
                  className="px-3.5 py-1.5 border border-neutral-200 text-neutral-700 rounded-xl font-semibold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stockAdjustSubmitting}
                  className="px-4 py-1.5 bg-[#6A101C] hover:bg-[#7D1422] text-white rounded-xl font-bold shadow-xs"
                >
                  {stockAdjustSubmitting ? 'Updating...' : 'Save Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
