import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { Shop } from '../../types';
import { Store, Building, Save, RefreshCw, CheckCircle2 } from 'lucide-react';

export const BusinessProfile: React.FC = () => {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    gstNumber: '',
    vatNumber: '',
    phone: '',
    shortNote: '',
    address: '',
    shopType: 'retail',
    taxState: 'INTRA_STATE',
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await api.shopAdmin.getProfile();
      setShop(data.shop);
      setForm({
        name: data.shop.name || '',
        gstNumber: data.shop.gst_number || '',
        vatNumber: data.shop.vat_number || '',
        phone: data.shop.phone || '',
        shortNote: data.shop.short_note || '',
        address: data.shop.address || '',
        shopType: data.shop.shop_type || 'retail',
        taxState: data.shop.tax_state || 'INTRA_STATE',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load business profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await api.shopAdmin.updateProfile(form);
      setShop(data.shop);
      setSuccessMsg('Business profile and GST settings updated successfully. Audit event recorded.');
    } catch (err: any) {
      setError(err.message || 'Failed to update business profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin mr-2" />
        <span className="text-sm font-medium text-neutral-500">Loading business profile...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">Business Profile & Tax Configuration</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure legal entity details, registered GSTIN, receipt footers, and tax breakdown rules
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs space-y-5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-bold text-neutral-700 block mb-1.5">Registered Shop / Trade Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
            />
            <span className="text-[10px] text-neutral-400 mt-0.5 block">Appears prominently on POS tax invoices</span>
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-1.5">GST Number (GSTIN) *</label>
            <input
              type="text"
              required
              value={form.gstNumber}
              onChange={(e) => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })}
              placeholder="e.g. 27AABCT3518Q1ZP"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
            />
            <span className="text-[10px] text-amber-700 mt-0.5 block font-medium">
              Note: Modifications to GSTIN are recorded in the audit trail as GST_UPDATED.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-bold text-neutral-700 block mb-1.5">Official Contact Phone *</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-1.5">VAT Registration Number (Optional)</label>
            <input
              type="text"
              value={form.vatNumber}
              onChange={(e) => setForm({ ...form, vatNumber: e.target.value })}
              placeholder="For liquor, fuel, or applicable non-GST goods"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-neutral-700 block mb-1.5">Physical Store Address *</label>
          <textarea
            required
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-bold text-neutral-700 block mb-1.5">Shop Classification</label>
            <select
              value={form.shopType}
              onChange={(e) => setForm({ ...form, shopType: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
            >
              <option value="retail">General Retail</option>
              <option value="grocery">Grocery / Supermarket</option>
              <option value="apparel">Apparel & Footwear</option>
              <option value="electronics">Consumer Electronics</option>
              <option value="pharmacy">Pharmacy & Medical Store</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-1.5">GST Tax Jurisdiction Scenario</label>
            <select
              value={form.taxState}
              onChange={(e) => setForm({ ...form, taxState: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
            >
              <option value="INTRA_STATE">Intra-State: Split into CGST (50%) + SGST (50%)</option>
              <option value="INTER_STATE">Inter-State: Apply Integrated Tax (IGST 100%)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-bold text-neutral-700 block mb-1.5">Custom Receipt Footer Note</label>
          <input
            type="text"
            value={form.shortNote}
            onChange={(e) => setForm({ ...form, shortNote: e.target.value })}
            placeholder="e.g. Thank you for shopping with us! No return without receipt."
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
          />
        </div>

        <div className="pt-3 border-t border-neutral-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-5 py-2.5 bg-neutral-950 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Profile...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
