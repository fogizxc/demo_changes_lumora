import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { RentalAsset, RentalBooking } from '../../types';
import {
  Car,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface RentalEngineViewProps {
  initialSubTab?: 'assets' | 'bookings' | 'returns';
}

export const RentalEngineView: React.FC<RentalEngineViewProps> = ({ initialSubTab = 'assets' }) => {
  const [assets, setAssets] = useState<RentalAsset[]>([]);
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'assets' | 'bookings'>(initialSubTab === 'bookings' ? 'bookings' : 'assets');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab === 'bookings' ? 'bookings' : 'assets');
    }
  }, [initialSubTab]);

  // Modals
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<RentalBooking | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'Camera Gear',
    dailyRate: 1500,
    depositAmount: 5000,
    serialNumber: '',
    conditionNotes: 'Mint condition in hardcase',
  });

  const [newBooking, setNewBooking] = useState({
    assetId: '',
    customerName: '',
    customerPhone: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    notes: 'Commercial shoot rental',
  });

  const [returnData, setReturnData] = useState({
    returnedDate: new Date().toISOString().split('T')[0],
    lateFee: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsRes, bookingsRes] = await Promise.all([
        api.rental.getAssets(),
        api.rental.getBookings(),
      ]);
      setAssets(assetsRes.assets);
      setBookings(bookingsRes.bookings);

      if (assetsRes.assets.length > 0 && !newBooking.assetId) {
        setNewBooking((prev) => ({ ...prev, assetId: assetsRes.assets[0].id }));
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

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.rental.createAsset(newAsset);
      setSuccessMessage(`Asset "${newAsset.name}" added to rental fleet`);
      setShowAssetModal(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add asset');
    }
  };

  const handleBookAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const res = await api.rental.bookAsset(newBooking);
      setSuccessMessage(`Asset booked for ${res.booking.customer_name} from ${res.booking.start_date} to ${res.booking.end_date}!`);
      setShowBookingModal(false);
      loadData();
    } catch (err: any) {
      // Highlights overlapping date conflict guard
      setErrorMessage(err.message || 'Date conflict detected');
    }
  };

  const handleReturnAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    try {
      const res = await api.rental.returnAsset(selectedBooking.id, returnData);
      setSuccessMessage(res.message);
      setShowReturnModal(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process return');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Rental & Fleet Booking Engine</h1>
              <p className="text-xs text-neutral-500 font-medium">
                Equipment & vehicle inventory, overlap-guarded reservations, security deposits & late fees
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBookingModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#68151F] text-white text-xs font-bold hover:bg-[#521118] transition shadow-xs cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Create Rental Booking</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAssetModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rental Asset</span>
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
          { id: 'assets', label: `Rental Fleet (${assets.length})`, icon: Car },
          { id: 'bookings', label: `Active & Past Bookings (${bookings.length})`, icon: Calendar },
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

      {/* SUB-TAB 1: ASSETS FLEET */}
      {activeSubTab === 'assets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((ast) => (
            <div key={ast.id} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{ast.name}</h3>
                  <div className="text-xs text-neutral-400">{ast.category}</div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    ast.status === 'AVAILABLE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {ast.status}
                </span>
              </div>

              <div className="space-y-1 text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Daily Rate:</span>
                  <span className="font-bold text-neutral-900">₹{ast.daily_rate} / day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Security Deposit:</span>
                  <span className="font-semibold text-neutral-700">₹{ast.deposit_amount}</span>
                </div>
                {ast.condition_notes && (
                  <div className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-200/60 mt-1">
                    {ast.condition_notes}
                  </div>
                )}
              </div>

              {ast.status === 'AVAILABLE' ? (
                <button
                  type="button"
                  onClick={() => {
                    setNewBooking((prev) => ({ ...prev, assetId: ast.id }));
                    setShowBookingModal(true);
                  }}
                  className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition"
                >
                  Book This Asset
                </button>
              ) : (
                <div className="text-center py-2 text-xs font-semibold text-amber-800 bg-amber-50 rounded-xl border border-amber-200">
                  Currently on Rental Run
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 2: BOOKINGS LIST */}
      {activeSubTab === 'bookings' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <span className="text-xs font-bold text-neutral-800">Reservation Schedule with Overlap Guard</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Double-Rental Protection Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-50/80 text-neutral-500 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Rental Duration</th>
                  <th className="py-3 px-4">Daily Rate</th>
                  <th className="py-3 px-4">Deposit</th>
                  <th className="py-3 px-4">Total Rent</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {bookings.map((bk) => (
                  <tr key={bk.id} className="hover:bg-neutral-50/60 transition">
                    <td className="py-3 px-4 font-bold text-neutral-900">{bk.asset_name}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-800">{bk.customer_name}</div>
                      <div className="text-[11px] text-neutral-400">{bk.customer_phone}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-700">
                      {bk.start_date} <span className="text-neutral-400">→</span> {bk.end_date}
                    </td>
                    <td className="py-3 px-4">₹{bk.daily_rate}/d</td>
                    <td className="py-3 px-4 font-semibold text-emerald-700">₹{bk.deposit_paid}</td>
                    <td className="py-3 px-4 font-black text-neutral-900">₹{bk.total_rent}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          bk.status === 'ACTIVE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {bk.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {bk.status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBooking(bk);
                            setShowReturnModal(true);
                          }}
                          className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 ml-auto"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Return Asset</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE BOOKING (OVERLAP DETECTION) */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Book Rental Asset</h2>
              <p className="text-xs text-neutral-500">System checks for date conflicts on the selected asset.</p>
            </div>
            <form onSubmit={handleBookAsset} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Select Asset</label>
                <select
                  value={newBooking.assetId}
                  onChange={(e) => setNewBooking({ ...newBooking, assetId: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl font-bold"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (₹{a.daily_rate}/day - Deposit ₹{a.deposit_amount})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Customer Full Name</label>
                  <input
                    type="text"
                    required
                    value={newBooking.customerName}
                    onChange={(e) => setNewBooking({ ...newBooking, customerName: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Customer Phone</label>
                  <input
                    type="text"
                    value={newBooking.customerPhone}
                    onChange={(e) => setNewBooking({ ...newBooking, customerPhone: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newBooking.startDate}
                    onChange={(e) => setNewBooking({ ...newBooking, startDate: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newBooking.endDate}
                    onChange={(e) => setNewBooking({ ...newBooking, endDate: e.target.value })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#68151F] text-white rounded-xl font-bold hover:bg-[#521118]"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ASSET */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-neutral-900">Add Rental Asset / Vehicle</h2>
            <form onSubmit={handleCreateAsset} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony FX3 Cinema Camera"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Daily Rent Rate (₹)</label>
                  <input
                    type="number"
                    required
                    value={newAsset.dailyRate}
                    onChange={(e) => setNewAsset({ ...newAsset, dailyRate: Number(e.target.value) })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-neutral-600 font-semibold mb-1">Security Deposit (₹)</label>
                  <input
                    type="number"
                    required
                    value={newAsset.depositAmount}
                    onChange={(e) => setNewAsset({ ...newAsset, depositAmount: Number(e.target.value) })}
                    className="w-full p-2.5 border border-neutral-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Condition Notes</label>
                <input
                  type="text"
                  value={newAsset.conditionNotes}
                  onChange={(e) => setNewAsset({ ...newAsset, conditionNotes: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RETURN ASSET */}
      {showReturnModal && selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-neutral-900">Return Asset Handover</h2>
            <form onSubmit={handleReturnAsset} className="space-y-3 text-xs">
              <p className="text-neutral-600">
                Returning <strong>{selectedBooking.asset_name}</strong> from <strong>{selectedBooking.customer_name}</strong>.
              </p>
              <div>
                <label className="block text-neutral-600 font-semibold mb-1">Return Handover Date</label>
                <input
                  type="date"
                  value={returnData.returnedDate}
                  onChange={(e) => setReturnData({ ...returnData, returnedDate: e.target.value })}
                  className="w-full p-2.5 border border-neutral-300 rounded-xl"
                />
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Deposit Paid:</span>
                  <span className="font-bold text-emerald-700">₹{selectedBooking.deposit_paid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Agreed Return Date:</span>
                  <span className="font-bold text-neutral-800">{selectedBooking.end_date}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800"
                >
                  Accept Return & Refund Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
