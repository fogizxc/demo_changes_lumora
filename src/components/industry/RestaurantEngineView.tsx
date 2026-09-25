import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { RestaurantTable, RestaurantOrder } from '../../types';
import {
  Utensils,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  ChefHat,
  Receipt,
  DollarSign,
  Coffee,
  Flame,
} from 'lucide-react';

interface RestaurantEngineViewProps {
  initialSubTab?: 'floor' | 'kot' | 'menu' | 'billing';
}

export const RestaurantEngineView: React.FC<RestaurantEngineViewProps> = ({ initialSubTab = 'floor' }) => {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'floor' | 'kot'>(initialSubTab === 'kot' ? 'kot' : 'floor');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab === 'kot' ? 'kot' : 'floor');
    }
  }, [initialSubTab]);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Order creator form
  const [newOrder, setNewOrder] = useState({
    tableId: '',
    tableNumber: 'T-01',
    waiterName: 'Karan Joshi',
    orderType: 'DINE_IN',
    items: [
      { name: 'Paneer Butter Masala', qty: 1, price: 340 },
      { name: 'Garlic Butter Naan', qty: 2, price: 65 },
      { name: 'Mango Lassi', qty: 2, price: 90 },
    ],
  });

  const [newTable, setNewTable] = useState({
    tableNumber: 'T-06',
    capacity: 4,
    floorSection: 'Terrace Garden',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [tablesRes, ordersRes] = await Promise.all([
        api.restaurant.getTables(),
        api.restaurant.getOrders(),
      ]);
      setTables(tablesRes.tables);
      setOrders(ordersRes.orders);

      if (tablesRes.tables.length > 0 && !newOrder.tableId) {
        setNewOrder((prev) => ({
          ...prev,
          tableId: tablesRes.tables[0].id,
          tableNumber: tablesRes.tables[0].table_number,
        }));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.restaurant.createTable(newTable);
      setSuccessMessage(`Table ${newTable.tableNumber} added to floor`);
      setShowTableModal(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add table');
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.restaurant.createOrder(newOrder);
      setSuccessMessage(`Kitchen Ticket #${res.order.order_number} sent to Chef!`);
      setShowOrderModal(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create order');
    }
  };

  const handleAdvanceOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      await api.restaurant.updateOrderStatus(orderId, nextStatus);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to advance order status');
    }
  };

  const handleSettleBill = async (orderId: string) => {
    try {
      await api.restaurant.payOrder(orderId, 'CASH');
      setSuccessMessage('Bill settled successfully! Table returned to VACANT.');
      setSelectedTable(null);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to settle bill');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-700">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Restaurant & Dining Engine</h1>
              <p className="text-xs text-neutral-500 font-medium">
                Live floor table status, Kitchen Order Tickets (KOT), and dining bill settlements
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOrderModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#68151F] text-white text-xs font-bold hover:bg-[#521118] transition shadow-xs cursor-pointer"
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Generate KOT Order</span>
          </button>
          <button
            type="button"
            onClick={() => setShowTableModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Dining Table</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 font-bold">✕</button>
        </div>
      )}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">{successMessage}</div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-neutral-200 gap-6">
        {[
          { id: 'floor', label: `Floor Plan (${tables.length} Tables)`, icon: Utensils },
          { id: 'kot', label: `Kitchen KOT Queue (${orders.filter(o => o.status !== 'COMPLETED').length} Active)`, icon: ChefHat },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveSubTab(t.id as any)}
              className={`flex items-center space-x-2 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                isActive ? 'border-[#68151F] text-[#68151F]' : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: LIVE FLOOR PLAN */}
      {activeSubTab === 'floor' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {tables.map((tbl) => {
              const isOccupied = tbl.status === 'OCCUPIED';
              const isBilling = tbl.status === 'BILLING';
              const isVacant = tbl.status === 'VACANT';

              return (
                <div
                  key={tbl.id}
                  onClick={() => setSelectedTable(tbl)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 relative overflow-hidden ${
                    isOccupied
                      ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
                      : isBilling
                      ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
                      : 'bg-white border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-base font-black text-neutral-900">{tbl.table_number}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOccupied
                          ? 'bg-rose-200 text-rose-800'
                          : isBilling
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {tbl.status}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-500 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{tbl.capacity} Seats</span>
                    </span>
                    <span className="text-[11px] text-neutral-400">{tbl.floor_section}</span>
                  </div>

                  {tbl.order_number && (
                    <div className="pt-2 border-t border-neutral-200/60 text-xs">
                      <div className="font-bold text-neutral-800">{tbl.order_number}</div>
                      <div className="font-black text-[#68151F]">₹{tbl.order_total}</div>
                    </div>
                  )}

                  {isVacant && (
                    <div className="pt-2 border-t border-neutral-100 text-[11px] text-emerald-600 font-semibold">
                      ● Ready for guests
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* SELECTED TABLE INSPECTOR */}
          {selectedTable && (
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center font-black">
                    {selectedTable.table_number}
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-sm">
                      Table {selectedTable.table_number} Details
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {selectedTable.floor_section} • Capacity: {selectedTable.capacity} persons
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedTable.current_order_id && (
                    <button
                      type="button"
                      onClick={() => handleSettleBill(selectedTable.current_order_id!)}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Settle Bill & Vacate Table</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedTable(null)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {selectedTable.items && selectedTable.items.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-neutral-700">Active Order Items:</div>
                  <div className="divide-y divide-neutral-100 bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-xs">
                    {selectedTable.items.map((item, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between">
                        <span>{item.qty}x {item.name}</span>
                        <span className="font-bold">₹{item.price * item.qty}</span>
                      </div>
                    ))}
                    <div className="pt-2 flex justify-between font-black text-sm text-neutral-900">
                      <span>Total (incl. 5% GST):</span>
                      <span className="text-[#68151F]">₹{selectedTable.order_total}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-neutral-400 py-4 text-center">
                  Table is currently vacant. Click "Generate KOT Order" to seat guests.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: KITCHEN ORDER TICKETS (KOT) */}
      {activeSubTab === 'kot' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((ord) => (
            <div key={ord.id} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-black text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                    {ord.order_number}
                  </span>
                  <h3 className="text-sm font-bold text-neutral-900 mt-1">Table: {ord.table_number || 'Takeaway'}</h3>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ord.status === 'RECEIVED'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : ord.status === 'KITCHEN'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : ord.status === 'READY'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {ord.status}
                </span>
              </div>

              {/* ITEMS LIST */}
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 space-y-1.5 text-xs text-neutral-700">
                {ord.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="font-medium">{item.qty}x {item.name}</span>
                    <span className="font-bold text-neutral-900">₹{item.price * item.qty}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-neutral-200 flex justify-between font-bold text-xs text-neutral-900">
                  <span>Total Amount:</span>
                  <span className="text-[#68151F]">₹{ord.total}</span>
                </div>
              </div>

              {/* KOT WORKFLOW ACTIONS */}
              <div className="flex items-center gap-2 pt-1">
                {ord.status === 'RECEIVED' && (
                  <button
                    type="button"
                    onClick={() => handleAdvanceOrderStatus(ord.id, 'KITCHEN')}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Send to Cooking (KITCHEN)</span>
                  </button>
                )}
                {ord.status === 'KITCHEN' && (
                  <button
                    type="button"
                    onClick={() => handleAdvanceOrderStatus(ord.id, 'READY')}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Prepared (READY)</span>
                  </button>
                )}
                {ord.status === 'READY' && (
                  <button
                    type="button"
                    onClick={() => handleAdvanceOrderStatus(ord.id, 'SERVED')}
                    className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition"
                  >
                    Mark Plated (SERVED)
                  </button>
                )}
                {ord.status === 'SERVED' && (
                  <button
                    type="button"
                    onClick={() => handleSettleBill(ord.id)}
                    className="w-full py-1.5 bg-[#68151F] hover:bg-[#521118] text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Generate Bill & Vacate</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: GENERATE KOT ORDER */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-neutral-900">New Kitchen Order Ticket (KOT)</h2>
            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Target Table</label>
                  <select
                    value={newOrder.tableId}
                    onChange={(e) => {
                      const t = tables.find((tbl) => tbl.id === e.target.value);
                      setNewOrder({ ...newOrder, tableId: e.target.value, tableNumber: t?.table_number || '' });
                    }}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl font-bold"
                  >
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>{t.table_number} ({t.status})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Waiter Name</label>
                  <input
                    type="text"
                    value={newOrder.waiterName}
                    onChange={(e) => setNewOrder({ ...newOrder, waiterName: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Dishes & Quantities</label>
                <div className="space-y-2 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                  {newOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-neutral-800">{item.name}</span>
                      <span className="font-bold">₹{item.price} (Qty: {item.qty})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#68151F] text-white rounded-xl font-bold hover:bg-[#521118]"
                >
                  Fire Ticket to Kitchen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD TABLE */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-neutral-900">Add Dining Table</h2>
            <form onSubmit={handleCreateTable} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Table Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. T-07"
                  value={newTable.tableNumber}
                  onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Seat Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={newTable.capacity}
                    onChange={(e) => setNewTable({ ...newTable, capacity: Number(e.target.value) })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Floor Section</label>
                  <input
                    type="text"
                    value={newTable.floorSection}
                    onChange={(e) => setNewTable({ ...newTable, floorSection: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800"
                >
                  Save Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
