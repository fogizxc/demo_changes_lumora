import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../api';
import { Shop } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getShopArchitecture, ARCHITECTURES, BusinessArchitecture } from '../../utils/architecture';
import { DETAILED_BUSINESS_CATALOG, DetailedBusinessModel } from '../../utils/businessCatalog';
import {
  Plus,
  Store,
  Eye,
  Ban,
  CheckCircle2,
  RefreshCw,
  X,
  ShieldCheck,
  Copy,
  KeyRound,
  ExternalLink,
  Sparkles,
  Info,
  Search,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Building2,
} from 'lucide-react';

interface ShopRow extends Shop {
  thisMonthSales: number;
  commissionOwed: number;
  admin_email: string;
}

interface CreatedCredentialModalData {
  shopName: string;
  adminEmail: string;
  adminPassword: string;
  shopType: string;
  architecture: BusinessArchitecture;
  shopId: string;
}

export const ShopDirectory: React.FC = () => {
  const { startImpersonation, isLoading: authLoading } = useAuth();
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentialModalData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    gstNumber: '',
    vatNumber: '',
    phone: '',
    address: '',
    shortNote: '',
    shopType: 'healthcare', // default to hospital for quick creation
    taxState: 'INTRA_STATE',
    adminEmail: '',
    adminPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deep Business Catalog Selection States
  const [selectedModelId, setSelectedModelId] = useState<string>('healthcare_multispeciality');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogIndustryFilter, setCatalogIndustryFilter] = useState<string>('ALL');
  const [isDeepListOpen, setIsDeepListOpen] = useState<boolean>(true);
  const [catalogTab, setCatalogTab] = useState<'CATALOG' | 'EXISTING'>('CATALOG');

  const businessTypes: {
    id: string;
    label: string;
    emoji: string;
    arch: BusinessArchitecture;
    desc: string;
    sample: { name: string; email: string; address: string; gst: string };
  }[] = [
    {
      id: 'healthcare',
      label: 'Hospital & Healthcare Clinic',
      emoji: '🏥',
      arch: 'HEALTHCARE',
      desc: 'Patients EHR, Doctors, Consultations, Medical Queue & Prescriptions',
      sample: {
        name: 'Apollo Care Super Speciality Clinic',
        email: 'hospital.admin@apollocare.org',
        address: 'Plot 42, Health Enclave, New Delhi',
        gst: '07AAACH1234Q1Z2',
      },
    },
    {
      id: 'gym',
      label: 'Gym & Fitness Athletic Club',
      emoji: '🏋️',
      arch: 'GYM',
      desc: 'Member Rosters, Turnstile Attendance, Tiered Plans & Freeze Requests',
      sample: {
        name: 'IronPulse High Performance Gym',
        email: 'gym.admin@ironpulse.fit',
        address: 'Floor 3, Central Sports Plaza, Bangalore',
        gst: '29AABCI5678R1Z5',
      },
    },
    {
      id: 'restaurant',
      label: 'Restaurant, Cafe & Dining',
      emoji: '🍽️',
      arch: 'RESTAURANT',
      desc: 'Visual Floor Plan, Live Kitchen Tickets (KOT), Food & Bar Menu POS',
      sample: {
        name: 'The Golden Truffle Bistro & Lounge',
        email: 'dining.admin@goldentruffle.com',
        address: 'Shop 12, Heritage Courtyard, Mumbai',
        gst: '27AABCR9012S1Z8',
      },
    },
    {
      id: 'rental',
      label: 'Equipment Rental & Fleet Hire',
      emoji: '🚗',
      arch: 'RENTAL',
      desc: 'Fleet Roster, Date-Guarded Reservations, Security Deposits & Returns',
      sample: {
        name: 'SwiftDrive Fleet & Gear Rentals',
        email: 'rental.admin@swiftdrive.rent',
        address: 'Sector 18, Commercial Hub, Gurgaon',
        gst: '06AABCS3456T1Z1',
      },
    },
    {
      id: 'repair',
      label: 'Electronics Repair & Service Lab',
      emoji: '🔧',
      arch: 'REPAIR',
      desc: 'Intake Job Cards, Hardware Diagnostics, Spare Parts & Warranty',
      sample: {
        name: 'TechFix Micro-Soldering & Device Lab',
        email: 'repair.admin@techfixlab.io',
        address: 'B-Block, Electronic City, Hyderabad',
        gst: '36AABCT7890U1Z4',
      },
    },
    {
      id: 'retail',
      label: 'Grocery Store & Supermarket',
      emoji: '🛒',
      arch: 'RETAIL',
      desc: 'High-Speed Barcode POS, Supermarket Inventory, Suppliers & Till',
      sample: {
        name: 'DailyFresh HyperMart',
        email: 'grocery.admin@dailyfresh.in',
        address: 'Ring Road 5, North Extension, Pune',
        gst: '27AABCD2345V1Z9',
      },
    },
  ];

  const fetchShops = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.superAdmin.getShops();
      setShops(data.shops);
    } catch (err: any) {
      setError(err.message || 'Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleApplySample = (typeId: string) => {
    const item = businessTypes.find((b) => b.id === typeId);
    if (!item) return;
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const emailPrefix = item.sample.email.split('@')[0];
    const emailDomain = item.sample.email.split('@')[1];

    setCreateForm((prev) => ({
      ...prev,
      shopType: typeId,
      name: item.sample.name,
      address: item.sample.address,
      gstNumber: item.sample.gst,
      phone: '+91 98' + Math.floor(10000000 + Math.random() * 90000000),
      adminEmail: `${emailPrefix}${randomSuffix}@${emailDomain}`,
      adminPassword: 'Pass' + randomSuffix + '!@#',
    }));
  };

  const handleSelectBusinessModel = (model: DetailedBusinessModel) => {
    setSelectedModelId(model.id);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setCreateForm({
      name: model.name,
      shopType: model.shopType,
      taxState: model.taxState,
      address: model.sampleAddress,
      gstNumber: model.sampleGst,
      vatNumber: '',
      phone: model.samplePhone,
      shortNote: `${model.badge} — ${model.tagline}`,
      adminEmail: `${model.sampleEmailPrefix}${randomSuffix}@${model.sampleEmailDomain}`,
      adminPassword: `Pass${randomSuffix}!@#`,
    });
    // Keep deep list open or minimize based on preference
  };

  const handleSelectExistingShop = (shop: ShopRow) => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const emailPrefix = shop.admin_email ? shop.admin_email.split('@')[0] : 'admin';
    const emailDomain = shop.admin_email ? shop.admin_email.split('@')[1] : 'business.org';
    setCreateForm({
      name: shop.name,
      shopType: shop.shop_type,
      taxState: 'INTRA_STATE',
      address: shop.address,
      gstNumber: shop.gst_number || '27AABCA1234B1Z5',
      vatNumber: shop.vat_number || '',
      phone: shop.phone,
      shortNote: `Provisioning credentials for existing registered tenant ${shop.id}`,
      adminEmail: `${emailPrefix}.staff${randomSuffix}@${emailDomain}`,
      adminPassword: `Pass${randomSuffix}!@#`,
    });
  };

  const filteredCatalog = useMemo(() => {
    return DETAILED_BUSINESS_CATALOG.filter((item) => {
      const matchesIndustry =
        catalogIndustryFilter === 'ALL' || item.industry === catalogIndustryFilter;
      const q = catalogSearch.toLowerCase().trim();
      if (!q) return matchesIndustry;
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q) ||
        item.tagline.toLowerCase().includes(q) ||
        item.keyFeatures.some((f) => f.toLowerCase().includes(q));
      return matchesIndustry && matchesSearch;
    });
  }, [catalogSearch, catalogIndustryFilter]);

  const currentSelectedModel = useMemo(() => {
    return (
      DETAILED_BUSINESS_CATALOG.find((m) => m.id === selectedModelId) ||
      DETAILED_BUSINESS_CATALOG[0]
    );
  }, [selectedModelId]);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateForm((prev) => ({ ...prev, adminPassword: res }));
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const resp = await api.superAdmin.createShop(createForm);
      const createdArch = getShopArchitecture(createForm.shopType);

      // Save credentials for the confirmation modal
      setCreatedCredentials({
        shopName: createForm.name,
        adminEmail: createForm.adminEmail,
        adminPassword: createForm.adminPassword,
        shopType: createForm.shopType,
        architecture: createdArch,
        shopId: resp?.shop?.id || 'new-shop',
      });

      setShowCreateModal(false);
      setCreateForm({
        name: '',
        gstNumber: '',
        vatNumber: '',
        phone: '',
        address: '',
        shortNote: '',
        shopType: 'healthcare',
        taxState: 'INTRA_STATE',
        adminEmail: '',
        adminPassword: '',
      });
      fetchShops();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create shop');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (shop: ShopRow) => {
    const targetStatus = shop.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const confirmMsg =
      targetStatus === 'SUSPENDED'
        ? `Are you sure you want to suspend "${shop.name}"? This will immediately lock POS access and checkout for this shop.`
        : `Reactivate POS access for "${shop.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.superAdmin.updateShopStatus(shop.id, targetStatus);
      fetchShops();
    } catch (err: any) {
      alert('Action failed: ' + err.message);
    }
  };

  const handleViewAs = async (shopId: string) => {
    try {
      await startImpersonation(shopId);
    } catch (err: any) {
      alert('Failed to enter Support Mode: ' + err.message);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
            Active
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
            Overdue Grace
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-200">
            Suspended
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-neutral-100 text-neutral-800">
            {status}
          </span>
        );
    }
  };

  const selectedTypeItem = businessTypes.find((b) => b.id === createForm.shopType) || businessTypes[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight flex items-center space-x-2">
            <span>Shop Directory & Business Provisioning</span>
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold uppercase">
              Isolated Architecture
            </span>
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Create industry-isolated shop credentials. When an admin logs in, they access strictly their business portal.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchShops}
            className="p-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setIsDeepListOpen(true);
              setCatalogTab('CATALOG');
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[#6A101C]" />
            <span>Browse 36+ Business Types</span>
          </button>
          <button
            id="btn-add-shop"
            onClick={() => {
              setIsDeepListOpen(true);
              setCatalogTab('CATALOG');
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-[#6A101C] hover:bg-[#520B15] text-white rounded-xl text-xs font-bold shadow-md shadow-[#6A101C]/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Business Credentials</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Shops Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-xs text-left">
            <thead className="bg-neutral-50/80 text-neutral-600 uppercase font-bold tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Business Details</th>
                <th className="py-3.5 px-4">Architecture Portal</th>
                <th className="py-3.5 px-4">Tax & GSTIN</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Shop Admin ID</th>
                <th className="py-3.5 px-4 text-right">Portal Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6A101C]" />
                    Loading verified business registry...
                  </td>
                </tr>
              ) : shops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-400">
                    No shops registered yet. Click &quot;Create Business Credentials&quot; above to provision one.
                  </td>
                </tr>
              ) : (
                shops.map((shop) => {
                  const arch = getShopArchitecture(shop.shop_type);
                  const meta = ARCHITECTURES[arch];

                  return (
                    <tr key={shop.id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900 text-sm flex items-center space-x-1.5">
                          <span>{meta.iconEmoji}</span>
                          <span>{shop.name}</span>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">{shop.address}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">Tenant ID: {shop.id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-neutral-100 border border-neutral-200 text-neutral-800">
                          <span>{meta.iconEmoji}</span>
                          <span>{meta.badgeLabel} Portal</span>
                        </span>
                        <div className="text-[10px] text-neutral-400 mt-1">{meta.summary}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium">
                        {shop.gst_number ? (
                          <span className="font-semibold text-neutral-900">{shop.gst_number}</span>
                        ) : (
                          <span className="text-neutral-400 italic">None</span>
                        )}
                        {shop.vat_number && (
                          <div className="text-[10px] text-neutral-400">VAT: {shop.vat_number}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(shop.status)}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-neutral-900 block font-mono text-[11px]">
                          {shop.admin_email}
                        </span>
                        <span className="text-[11px] text-neutral-500">{shop.phone}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* View As (Impersonation) - Directly opens the isolated portal */}
                          <button
                            id={`btn-view-as-${shop.id}`}
                            onClick={() => handleViewAs(shop.id)}
                            disabled={authLoading}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-bold text-xs shadow-2xs transition cursor-pointer"
                            title={`Open ${meta.label} portal as Admin`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Open {meta.badgeLabel}</span>
                          </button>

                          {/* Suspend / Reactivate */}
                          <button
                            onClick={() => handleToggleStatus(shop)}
                            className={`p-1.5 border rounded-lg transition cursor-pointer ${
                              shop.status === 'SUSPENDED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-red-50 hover:text-red-700'
                            }`}
                            title={shop.status === 'SUSPENDED' ? 'Reactivate POS' : 'Suspend POS Access'}
                          >
                            {shop.status === 'SUSPENDED' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Ban className="w-4 h-4" />
                            )}
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

      {/* ========================================================================= */}
      {/* SUCCESS CONFIRMATION MODAL (CREDENTIALS SAVED IN DATABASE)                */}
      {/* ========================================================================= */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-neutral-200 animate-fade-in">
            <div className="p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-black">Credentials Saved to Database!</h3>
              <p className="text-xs text-emerald-100 mt-1">
                Your new business account is live. When logging in with this ID & Password, the user will access strictly the{' '}
                <span className="font-bold underline text-white">
                  {ARCHITECTURES[createdCredentials.architecture].label}
                </span>{' '}
                portal.
              </p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Business Name</span>
                  <span className="font-bold text-neutral-900">{createdCredentials.shopName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Industry Portal</span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold">
                    {ARCHITECTURES[createdCredentials.architecture].iconEmoji}{' '}
                    {ARCHITECTURES[createdCredentials.architecture].badgeLabel} Portal Only
                  </span>
                </div>
                <div className="border-t border-neutral-200 my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Login ID (Email)</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-neutral-900 select-all">
                      {createdCredentials.adminEmail}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdCredentials.adminEmail, 'email')}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition"
                      title="Copy Email"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 font-medium">Login Password</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-neutral-900 select-all">
                      {createdCredentials.adminPassword}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdCredentials.adminPassword, 'password')}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition"
                      title="Copy Password"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {copiedField && (
                <div className="text-center text-[11px] font-bold text-emerald-600">
                  Copied {copiedField} to clipboard!
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreatedCredentials(null)}
                  className="flex-1 px-4 py-2.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-xl text-xs font-bold transition"
                >
                  Close & Done
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const shopId = createdCredentials.shopId;
                    setCreatedCredentials(null);
                    await startImpersonation(shopId);
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Launch Portal Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE BUSINESS CREDENTIALS MODAL                                         */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-neutral-200 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/90">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-[#6A101C] text-white shadow-sm">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-extrabold text-neutral-900 tracking-tight">
                      Provision Business Credentials
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-[#6A101C]/10 text-[#6A101C] text-[10px] font-bold uppercase">
                      36 Detailed Business Models
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Select from a deep catalog of businesses or choose an existing tenant to provision isolated portal credentials.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShop} className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl font-semibold flex items-center space-x-2">
                  <Ban className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* ========================================================================= */}
              {/* STEP 1: DEEP LIST OF ALL BUSINESSES TO SELECT FROM                        */}
              {/* ========================================================================= */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-extrabold text-neutral-900 text-sm block">
                      1. Select Business Model (Deep Directory) *
                    </label>
                    <p className="text-[11px] text-neutral-500">
                      Click any business from the deep list below. Credentials and profile fields will automatically auto-populate.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDeepListOpen(!isDeepListOpen)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-bold text-xs shadow-2xs transition cursor-pointer self-start sm:self-auto"
                  >
                    <span>{isDeepListOpen ? 'Minimize Business List' : 'Browse All 36+ Businesses'}</span>
                    {isDeepListOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* CURRENTLY SELECTED BUSINESS HIGHLIGHT CARD */}
                <div className="p-4 rounded-2xl border-2 border-[#6A101C] bg-[#6A101C]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <span className="text-3xl p-2 bg-white rounded-2xl border border-[#6A101C]/20 shadow-2xs shrink-0">
                      {currentSelectedModel.emoji}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-extrabold text-sm text-neutral-900">
                          {createForm.name || currentSelectedModel.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#6A101C] text-white">
                          {currentSelectedModel.badge}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-neutral-200 text-neutral-800">
                          {currentSelectedModel.arch} PORTAL
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 mt-1 font-medium">
                        {currentSelectedModel.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {currentSelectedModel.keyFeatures.map((feat) => (
                          <span
                            key={feat}
                            className="px-2 py-0.5 rounded-md bg-white text-neutral-700 border border-neutral-200 text-[10px] font-semibold"
                          >
                            ✓ {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l sm:pl-4 border-[#6A101C]/20 pt-2 sm:pt-0">
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">
                      Selected Architecture
                    </span>
                    <span className="font-mono font-bold text-xs text-[#6A101C] block mt-0.5">
                      {createForm.shopType.toUpperCase()} ISOLATED
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDeepListOpen(true)}
                      className="mt-2 text-[11px] font-bold text-[#6A101C] hover:underline cursor-pointer"
                    >
                      Change Business Model ▾
                    </button>
                  </div>
                </div>

                {/* THE DEEP BUSINESS LIST PANEL */}
                {isDeepListOpen && (
                  <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/70 space-y-3.5 animate-fade-in">
                    {/* Tab Navigation: All 36 Models vs Existing Registered Tenants */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-3">
                      <div className="inline-flex p-1 bg-white rounded-xl border border-neutral-200 text-xs font-semibold shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setCatalogTab('CATALOG')}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                            catalogTab === 'CATALOG'
                              ? 'bg-[#6A101C] text-white shadow-2xs font-bold'
                              : 'text-neutral-600 hover:text-neutral-900'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>All 36 Specialized Business Models</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCatalogTab('EXISTING')}
                          className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                            catalogTab === 'EXISTING'
                              ? 'bg-[#6A101C] text-white shadow-2xs font-bold'
                              : 'text-neutral-600 hover:text-neutral-900'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Existing Active Tenants ({shops.length})</span>
                        </button>
                      </div>

                      <span className="text-[11px] text-neutral-500 font-medium">
                        {catalogTab === 'CATALOG'
                          ? `Showing ${filteredCatalog.length} of ${DETAILED_BUSINESS_CATALOG.length} businesses`
                          : `${shops.length} existing shops in database`}
                      </span>
                    </div>

                    {catalogTab === 'CATALOG' ? (
                      <div className="space-y-3">
                        {/* Search & Category Filter Pills */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={catalogSearch}
                              onChange={(e) => setCatalogSearch(e.target.value)}
                              placeholder="Search 36+ businesses by name, specialty, or keywords (e.g. Dental, CrossFit, Pizzeria, Camera, MacBook, Pharmacy)..."
                              className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-[#6A101C] focus:outline-hidden"
                            />
                            {catalogSearch && (
                              <button
                                type="button"
                                onClick={() => setCatalogSearch('')}
                                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 text-xs font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Industry Chips */}
                        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                          {[
                            { id: 'ALL', label: 'All Businesses (36)' },
                            { id: 'HEALTHCARE', label: '🏥 Healthcare (6)' },
                            { id: 'GYM', label: '🏋️ Gym & Fitness (6)' },
                            { id: 'RESTAURANT', label: '🍽️ Restaurant (6)' },
                            { id: 'RENTAL', label: '🚗 Rental (6)' },
                            { id: 'REPAIR', label: '🔧 Repair Lab (6)' },
                            { id: 'RETAIL', label: '🛒 Retail (6)' },
                          ].map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setCatalogIndustryFilter(cat.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition cursor-pointer ${
                                catalogIndustryFilter === cat.id
                                  ? 'bg-neutral-900 text-white shadow-2xs'
                                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>

                        {/* Comprehensive Deep Business List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                          {filteredCatalog.length === 0 ? (
                            <div className="col-span-2 py-8 text-center text-neutral-400">
                              <Search className="w-6 h-6 mx-auto mb-1 opacity-40" />
                              <p className="font-semibold text-neutral-600">No businesses match "{catalogSearch}"</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setCatalogSearch('');
                                  setCatalogIndustryFilter('ALL');
                                }}
                                className="mt-2 text-xs font-bold text-[#6A101C] hover:underline cursor-pointer"
                              >
                                Clear search & view all 36 businesses
                              </button>
                            </div>
                          ) : (
                            filteredCatalog.map((model) => {
                              const isSelected = selectedModelId === model.id;
                              return (
                                <div
                                  key={model.id}
                                  onClick={() => handleSelectBusinessModel(model)}
                                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                                    isSelected
                                      ? 'border-[#6A101C] bg-white ring-2 ring-[#6A101C]/20 shadow-md'
                                      : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-2xs'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-xl p-1 bg-neutral-100 rounded-lg shrink-0">
                                          {model.emoji}
                                        </span>
                                        <div>
                                          <div className="font-bold text-neutral-900 text-xs leading-tight">
                                            {model.name}
                                          </div>
                                          <div className="text-[10px] text-neutral-500 mt-0.5">
                                            {model.model}
                                          </div>
                                        </div>
                                      </div>

                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase shrink-0 ${
                                          isSelected
                                            ? 'bg-[#6A101C] text-white'
                                            : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                                        }`}
                                      >
                                        {model.arch}
                                      </span>
                                    </div>

                                    <p className="text-[11px] text-neutral-600 mt-2 line-clamp-2">
                                      {model.description}
                                    </p>

                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {model.keyFeatures.slice(0, 3).map((f) => (
                                        <span
                                          key={f}
                                          className="text-[9px] bg-neutral-50 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-100"
                                        >
                                          {f}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-100">
                                    <span className="text-[10px] font-mono text-neutral-400 truncate max-w-[140px]">
                                      GST: {model.sampleGst}
                                    </span>
                                    <button
                                      type="button"
                                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                                        isSelected
                                          ? 'bg-[#6A101C] text-white'
                                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                                      }`}
                                    >
                                      {isSelected ? '✓ Selected' : 'Select Business'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : (
                      /* EXISTING TENANTS IN DATABASE */
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {shops.length === 0 ? (
                          <div className="py-8 text-center text-neutral-400">
                            No shops currently registered in database.
                          </div>
                        ) : (
                          shops.map((s) => (
                            <div
                              key={s.id}
                              onClick={() => handleSelectExistingShop(s)}
                              className="p-3 bg-white border border-neutral-200 hover:border-[#6A101C] rounded-2xl flex items-center justify-between transition cursor-pointer shadow-2xs"
                            >
                              <div className="flex items-center space-x-3">
                                <span className="p-2 bg-neutral-100 rounded-xl text-base">
                                  {ARCHITECTURES[getShopArchitecture(s.shop_type)]?.iconEmoji || '🏪'}
                                </span>
                                <div>
                                  <div className="font-bold text-neutral-900 text-xs">{s.name}</div>
                                  <div className="text-[10px] text-neutral-500">
                                    {s.address} • Tenant ID: <span className="font-mono font-bold">{s.id}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700">
                                  {s.shop_type}
                                </span>
                                <button
                                  type="button"
                                  className="px-3 py-1 bg-neutral-900 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                >
                                  Select Tenant
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ARCHITECTURE ISOLATION CONFIRMATION CALLOUT */}
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 flex items-start space-x-2.5 text-purple-900">
                <Info className="w-4 h-4 shrink-0 text-purple-600 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold">Strict Architecture Isolation Guarantee: </span>
                  When credentials for <span className="font-bold underline">{createForm.name || currentSelectedModel.name}</span> are used to log in, the user is locked strictly inside the{' '}
                  <span className="font-bold underline">{currentSelectedModel.arch} Portal</span>. They will have ZERO access to other industry engines (Gyms, Hospitals, or Restaurants are entirely hidden).
                </div>
              </div>

              {/* STEP 2: BUSINESS PROFILE DETAILS */}
              <div className="pt-3 border-t border-neutral-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-extrabold text-neutral-900 text-sm block">
                    2. Business Profile Details
                  </label>
                  <span className="text-[10px] text-neutral-400">Pre-filled from selected business</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Business Name *</label>
                    <input
                      type="text"
                      required
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="e.g. Apollo Care Multi-Speciality Hospital"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-[#6A101C] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">GST Number (GSTIN) *</label>
                    <input
                      type="text"
                      required
                      value={createForm.gstNumber}
                      onChange={(e) => setCreateForm({ ...createForm, gstNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g. 07AAACH1234Q1Z2"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#6A101C] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-[#6A101C] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Tax Scenario</label>
                    <select
                      value={createForm.taxState}
                      onChange={(e) => setCreateForm({ ...createForm, taxState: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#6A101C] focus:outline-hidden font-medium"
                    >
                      <option value="INTRA_STATE">Intra-State (CGST + SGST)</option>
                      <option value="INTER_STATE">Inter-State (IGST)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="font-semibold text-neutral-700 block mb-1">Physical Address *</label>
                  <textarea
                    required
                    rows={2}
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    placeholder="Full street address for official invoices"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-[#6A101C] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* STEP 3: DEDICATED ADMIN CREDENTIALS */}
              <div className="pt-3 border-t border-neutral-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-extrabold text-neutral-900 text-sm block">
                      3. Dedicated Admin Credentials
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      These credentials will be granted Shop Admin access for this tenant.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] font-bold text-[#6A101C] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate New Password</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Admin Email (Login ID) *</label>
                    <input
                      type="email"
                      required
                      value={createForm.adminEmail}
                      onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                      placeholder="admin@business.org"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-[#6A101C] focus:outline-hidden font-mono font-bold"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-neutral-700 block">Admin Password *</label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] text-neutral-500 hover:text-neutral-800 cursor-pointer font-semibold"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={createForm.adminPassword}
                      onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-[#6A101C] focus:outline-hidden font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 flex items-center justify-end space-x-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#6A101C] text-white hover:bg-[#520B15] rounded-xl text-xs font-bold shadow-md shadow-[#6A101C]/20 transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{submitting ? 'Saving to Database...' : 'Save & Provision Credentials'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
