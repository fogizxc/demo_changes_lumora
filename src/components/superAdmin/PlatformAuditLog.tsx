import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { AuditLogEntry, ImpersonationLogEntry, Shop } from '../../types';
import { RefreshCw, Shield, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';

export const PlatformAuditLog: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'IMPERSONATION'>('AUDIT');
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [impersonationLogs, setImpersonationLogs] = useState<ImpersonationLogEntry[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [shopFilter, setShopFilter] = useState('');

  // JSON payload viewer modal
  const [inspectEntry, setInspectEntry] = useState<AuditLogEntry | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      if (activeTab === 'AUDIT') {
        const [logRes, shopRes] = await Promise.all([
          api.superAdmin.getAuditLog({
            page,
            limit: 25,
            action: actionFilter || undefined,
            shopId: shopFilter || undefined,
          }),
          api.superAdmin.getShops(),
        ]);
        setLogs(logRes.logs);
        setTotalPages(logRes.pagination.totalPages);
        setTotalCount(logRes.pagination.totalCount);
        setShops(shopRes.shops);
      } else {
        const data = await api.superAdmin.getImpersonationLog();
        setImpersonationLogs(data.logs);
      }
    } catch (err: any) {
      alert('Failed to load audit logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeTab, page, actionFilter, shopFilter]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATED')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (action.includes('DELETED') || action.includes('VOID') || action.includes('SUSPENDED')) return 'bg-red-100 text-red-800 border-red-200';
    if (action.includes('UPDATED') || action.includes('CHANGED') || action.includes('DISCOUNT')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (action.includes('IMPERSONAT')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-neutral-100 text-neutral-800 border-neutral-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">Platform Audit & Compliance Logs</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Cryptographically sanitized, immutable trail of all platform-wide administrative and financial actions
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center space-x-1 p-1 bg-neutral-100 rounded-xl border border-neutral-200 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('AUDIT');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'AUDIT' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            System Audit Trail
          </button>
          <button
            onClick={() => {
              setActiveTab('IMPERSONATION');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'IMPERSONATION' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Support Mode (View-As) History
          </button>
        </div>
      </div>

      {activeTab === 'AUDIT' ? (
        <>
          {/* Audit Trail Filters */}
          <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-2xs flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <label className="font-semibold text-neutral-600">Action Type:</label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white text-neutral-700"
              >
                <option value="">All Actions</option>
                <option value="PRODUCT_CREATED">Product Created</option>
                <option value="PRODUCT_UPDATED">Product Updated</option>
                <option value="PRODUCT_DELETED">Product Deleted</option>
                <option value="EMPLOYEE_CREATED">Employee Created</option>
                <option value="EMPLOYEE_TIER_CHANGED">Employee Tier Changed</option>
                <option value="EMPLOYEE_DEACTIVATED">Employee Deactivated</option>
                <option value="GST_UPDATED">GST Updated</option>
                <option value="DISCOUNT_APPLIED">Discount Applied</option>
                <option value="VOID_PERFORMED">Void Performed</option>
                <option value="INVOICE_PAID">Invoice Paid</option>
                <option value="SHOP_SUSPENDED">Shop Suspended</option>
                <option value="SHOP_REACTIVATED">Shop Reactivated</option>
                <option value="IMPERSONATION_STARTED">Support View-As Started</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="font-semibold text-neutral-600">Shop:</label>
              <select
                value={shopFilter}
                onChange={(e) => {
                  setShopFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white text-neutral-700"
              >
                <option value="">All Shops</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {(actionFilter || shopFilter) && (
              <button
                onClick={() => {
                  setActionFilter('');
                  setShopFilter('');
                  setPage(1);
                }}
                className="ml-auto text-xs text-neutral-500 hover:text-neutral-900 underline font-medium cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Audit Log Table */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-xs text-left">
                <thead className="bg-neutral-50/80 text-neutral-600 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor & Role</th>
                    <th className="py-3 px-4">Shop</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading audit logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-400">
                        No audit events recorded for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-neutral-50/60 transition">
                        <td className="py-3 px-4 text-neutral-600">
                          <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${getActionBadgeColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-neutral-900 block">{log.actor_id}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">{log.actor_role}</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-neutral-700">
                          {log.shop_name || log.shop_id || <span className="text-neutral-400 italic">Platform</span>}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-neutral-600">
                          {log.target_type}: {log.target_id || '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setInspectEntry(log)}
                            className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-[11px] font-semibold transition cursor-pointer"
                          >
                            Inspect Payload
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs">
                <span className="text-neutral-500">
                  Page {page} of {totalPages} ({totalCount} entries)
                </span>
                <div className="flex items-center space-x-1.5">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-1.5 rounded border border-neutral-300 bg-white hover:bg-neutral-50 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-1.5 rounded border border-neutral-300 bg-white hover:bg-neutral-50 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Impersonation Log Table */
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-xs text-left">
              <thead className="bg-neutral-50/80 text-neutral-600 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Session Started</th>
                  <th className="py-3 px-4">Super Admin ID</th>
                  <th className="py-3 px-4">Impersonated Shop</th>
                  <th className="py-3 px-4">Session Ended</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-400">
                      Loading impersonation sessions...
                    </td>
                  </tr>
                ) : impersonationLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-400">
                      No Support / View-As sessions on record.
                    </td>
                  </tr>
                ) : (
                  impersonationLogs.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/60 transition">
                      <td className="py-3 px-4 font-mono text-neutral-700">
                        {new Date(item.started_at || item.start_time).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-purple-900">{item.super_admin_id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900">{item.shop_name || item.shop_id}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">ID: {item.shop_id}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {(item.ended_at || item.end_time) ? (
                          new Date((item.ended_at || item.end_time)!).toLocaleString()
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                            Currently Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-500 italic">{item.reason || item.actions || 'Support inspection'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Payload Modal */}
      {inspectEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">Audit Payload Inspection</h3>
                <span className="text-xs font-mono text-neutral-400">ID: {inspectEntry.id}</span>
              </div>
              <button
                onClick={() => setInspectEntry(null)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-neutral-400 block text-[10px]">Action</span>
                  <span className="font-mono font-bold text-neutral-900">{inspectEntry.action}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">Actor Role</span>
                  <span className="font-semibold text-neutral-900">{inspectEntry.actor_role}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">Target</span>
                  <span className="font-mono text-neutral-900">{inspectEntry.target_type}: {inspectEntry.target_id}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">Shop ID</span>
                  <span className="font-mono text-neutral-900">{inspectEntry.shop_id || 'Platform'}</span>
                </div>
              </div>

              {inspectEntry.before && (
                <div>
                  <span className="font-bold text-neutral-700 block mb-1 text-[11px] uppercase tracking-wide">State Before:</span>
                  <pre className="p-3 bg-neutral-900 text-neutral-100 rounded-lg font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(JSON.parse(inspectEntry.before), null, 2)}
                  </pre>
                </div>
              )}

              {inspectEntry.after && (
                <div>
                  <span className="font-bold text-neutral-700 block mb-1 text-[11px] uppercase tracking-wide">State After:</span>
                  <pre className="p-3 bg-neutral-900 text-neutral-100 rounded-lg font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(JSON.parse(inspectEntry.after), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <button
              onClick={() => setInspectEntry(null)}
              className="mt-5 w-full py-2 bg-neutral-950 text-white rounded-lg text-xs font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
