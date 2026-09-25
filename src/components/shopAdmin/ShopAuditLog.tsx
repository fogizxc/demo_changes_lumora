import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { AuditLogEntry } from '../../types';
import { RefreshCw, Shield, ChevronLeft, ChevronRight, X } from 'lucide-react';

export const ShopAuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Inspect modal
  const [inspectEntry, setInspectEntry] = useState<AuditLogEntry | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.shopAdmin.getAuditLog(page, 20);
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);
    } catch (err: any) {
      alert('Failed to load shop audit log: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATED')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (action.includes('DELETED') || action.includes('VOID') || action.includes('DEACTIVATED')) return 'bg-red-100 text-red-800 border-red-200';
    if (action.includes('UPDATED') || action.includes('CHANGED') || action.includes('DISCOUNT')) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-neutral-100 text-neutral-800 border-neutral-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">Shop Audit Trail</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Immutable log of all inventory changes, employee tier modifications, discounts, voids, and business profile updates
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-xs text-left">
            <thead className="bg-neutral-50/80 text-neutral-600 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading audit events...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/60 transition">
                    <td className="py-3 px-4 text-neutral-600">
                      <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-900">{log.actor_id}</td>
                    <td className="py-3 px-4 font-medium text-neutral-600">{log.actor_role}</td>
                    <td className="py-3 px-4 font-mono text-neutral-600">
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
              Page {page} of {totalPages} ({totalCount} events)
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

      {/* Inspect Payload Modal */}
      {inspectEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-neutral-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">Audit Payload Details</h3>
                <span className="text-xs font-mono text-neutral-400">Event ID: {inspectEntry.id}</span>
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
                  <span className="text-neutral-400 block text-[10px]">Target Entity</span>
                  <span className="font-mono text-neutral-900">{inspectEntry.target_type}: {inspectEntry.target_id}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[10px]">Timestamp</span>
                  <span className="font-mono text-neutral-900">{new Date(inspectEntry.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {inspectEntry.before && (
                <div>
                  <span className="font-bold text-neutral-700 block mb-1 text-[11px] uppercase tracking-wide">Previous State:</span>
                  <pre className="p-3 bg-neutral-900 text-neutral-100 rounded-lg font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(JSON.parse(inspectEntry.before), null, 2)}
                  </pre>
                </div>
              )}

              {inspectEntry.after && (
                <div>
                  <span className="font-bold text-neutral-700 block mb-1 text-[11px] uppercase tracking-wide">Updated State:</span>
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
