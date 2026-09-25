import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { Sale, Shop } from '../../types';
import { RefreshCw, Search, ChevronLeft, ChevronRight, Ban, CheckCircle2, Receipt } from 'lucide-react';

export const AllTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Sale[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [shopFilter, setShopFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected receipt modal
  const [selectedReceipt, setSelectedReceipt] = useState<{ sale: Sale; items: any[]; shop: any; employee: any } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transRes, shopsRes] = await Promise.all([
        api.superAdmin.getTransactions({
          page,
          limit: 20,
          shopId: shopFilter || undefined,
          status: statusFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        api.superAdmin.getShops(),
      ]);

      setTransactions(transRes.transactions);
      setTotalPages(transRes.pagination.totalPages);
      setTotalCount(transRes.pagination.totalCount);
      setShops(shopsRes.shops);
    } catch (err: any) {
      alert('Failed to load transactions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, shopFilter, statusFilter, startDate, endDate]);

  const viewReceipt = async (saleId: string) => {
    try {
      const data = await api.pos.getReceipt(saleId);
      setSelectedReceipt(data);
    } catch (err: any) {
      alert('Failed to load receipt: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">All Platform Transactions</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Audit-grade record of all completed and voided retail sales across registered shops ({totalCount} total)
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-2xs flex flex-wrap items-center gap-3 text-xs">
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

        <div className="flex items-center space-x-2">
          <label className="font-semibold text-neutral-600">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white text-neutral-700"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="VOIDED">Voided</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="font-semibold text-neutral-600">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white text-neutral-700"
          />
        </div>

        <div className="flex items-center space-x-2">
          <label className="font-semibold text-neutral-600">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white text-neutral-700"
          />
        </div>

        {(shopFilter || statusFilter || startDate || endDate) && (
          <button
            onClick={() => {
              setShopFilter('');
              setStatusFilter('');
              setStartDate('');
              setEndDate('');
              setPage(1);
            }}
            className="ml-auto text-xs text-neutral-500 hover:text-neutral-900 underline font-medium cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 text-xs text-left">
            <thead className="bg-neutral-50/80 text-neutral-600 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Shop</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Taxable</th>
                <th className="py-3 px-4">Tax (GST)</th>
                <th className="py-3 px-4">Grand Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-neutral-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-neutral-400">
                    No transactions found for the selected criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-neutral-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">{tx.invoice_number}</td>
                    <td className="py-3 px-4 font-semibold text-neutral-800">{tx.shop_name}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-neutral-900 block">{tx.employee_name}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {tx.employee_tier} • {tx.employee_identifier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      <div>{new Date(tx.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] text-neutral-400">{new Date(tx.created_at).toLocaleTimeString()}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">₹{tx.taxable_amount.toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono text-neutral-600">
                      ₹{tx.tax_amount.toFixed(2)}
                      {tx.igst_amount > 0 ? (
                        <span className="text-[10px] block text-purple-700 font-medium">IGST</span>
                      ) : (
                        <span className="text-[10px] block text-neutral-400">CGST+SGST</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-neutral-900 text-sm">
                      ₹{tx.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      {tx.status === 'COMPLETED' ? (
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 w-max">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <div>
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-200 w-max">
                            <Ban className="w-3 h-3 text-red-600" />
                            <span>Voided</span>
                          </span>
                          {tx.void_reason && (
                            <span className="text-[10px] text-neutral-500 block mt-0.5 italic">
                              "{tx.void_reason}"
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => viewReceipt(tx.id)}
                        className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition cursor-pointer"
                        title="View GST Receipt"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs">
            <span className="text-neutral-500">
              Page {page} of {totalPages} ({totalCount} transactions)
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

      {/* Selected Receipt Inspection Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-neutral-200 max-h-[90vh] overflow-y-auto">
            <div className="text-center border-b pb-4 border-dashed border-neutral-300">
              <h3 className="font-extrabold text-base text-neutral-900 uppercase tracking-tight">{selectedReceipt.shop.name}</h3>
              <p className="text-xs text-neutral-500 mt-0.5">{selectedReceipt.shop.address}</p>
              <p className="text-xs font-mono text-neutral-600 mt-1">GSTIN: {selectedReceipt.shop.gst_number || 'N/A'}</p>
              <div className="mt-2 text-xs font-bold text-neutral-900">
                TAX INVOICE: {selectedReceipt.sale.invoice_number}
              </div>
              <div className="text-[11px] text-neutral-500">
                {new Date(selectedReceipt.sale.created_at).toLocaleString()} • Till Session: {selectedReceipt.sale.session_id}
              </div>
            </div>

            <div className="py-4 space-y-2 border-b border-dashed border-neutral-300 text-xs">
              {selectedReceipt.items.map((it: any) => (
                <div key={it.id} className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-neutral-900">{it.product_name}</div>
                    <div className="text-[10px] text-neutral-500 font-mono">
                      {it.quantity} × ₹{it.unit_price.toFixed(2)}
                    </div>
                  </div>
                  <span className="font-mono font-bold">₹{it.line_total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="py-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal:</span>
                <span className="font-mono">₹{selectedReceipt.sale.subtotal.toFixed(2)}</span>
              </div>
              {selectedReceipt.sale.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{selectedReceipt.sale.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Taxable Value:</span>
                <span className="font-mono">₹{selectedReceipt.sale.taxable_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>GST Tax:</span>
                <span className="font-mono">₹{selectedReceipt.sale.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm text-neutral-900 pt-2 border-t border-neutral-200">
                <span>GRAND TOTAL:</span>
                <span className="font-mono">₹{selectedReceipt.sale.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="mt-4 w-full py-2 bg-neutral-950 text-white rounded-lg text-xs font-bold transition"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
