import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import { PosSessionSummary, Shop, Employee } from '../../types';
import { X, Printer, RefreshCw, Calculator, DollarSign, CreditCard, QrCode, RotateCcw, Ban } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shop?: Partial<Shop>;
  employee?: Partial<Employee>;
}

export const TillSummaryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  shop,
  employee,
}) => {
  if (!isOpen) return null;

  const [summary, setSummary] = useState<PosSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.pos.getSessionSummary();
      setSummary(res.summary);
    } catch (err: any) {
      alert('Failed to fetch session summary: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const fmt = (val: any) => (Number(val) || 0).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-neutral-200 max-h-[95vh] flex flex-col print:border-none print:shadow-none print:max-w-full">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between print:bg-white print:text-neutral-900 print:border-b print:border-neutral-300">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-emerald-400 print:text-neutral-900" />
            <div>
              <h3 className="font-extrabold text-sm">POS Till Session Summary</h3>
              <p className="text-[11px] text-neutral-400 print:text-neutral-600">
                End-of-day register & tender audit
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 print:hidden">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer"
              title="Print Till Report"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs font-sans text-neutral-800">
          {loading ? (
            <div className="py-12 text-center text-neutral-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Calculating till reconciliation...
            </div>
          ) : !summary ? (
            <div className="py-12 text-center text-neutral-400">Failed to load till summary.</div>
          ) : (
            <>
              {/* Shop & Operator Info */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-neutral-500 block">Store:</span>
                  <span className="font-bold text-neutral-900">{shop?.name || 'Retail Store'}</span>
                </div>
                <div className="text-right">
                  <span className="text-neutral-500 block">GSTIN:</span>
                  <span className="font-mono text-neutral-800">{shop?.gst_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Cashier / Staff:</span>
                  <span className="font-semibold text-neutral-900">{employee?.name} ({employee?.employee_id})</span>
                </div>
                <div className="text-right">
                  <span className="text-neutral-500 block">Session Time:</span>
                  <span className="font-mono text-neutral-700">{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Net Sales Hero */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Gross Completed Sales
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {summary.totalSalesCount} completed transaction(s) • Shift: {summary.durationFormatted}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-emerald-900">
                    ₹{fmt(summary.grossSalesAmount)}
                  </span>
                </div>
              </div>

              {/* Tender Breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                  Payment Method Breakdown
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Cash */}
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                    <div className="flex items-center space-x-1 text-emerald-700 font-bold">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Cash In Till</span>
                    </div>
                    <div className="font-mono font-black text-sm text-neutral-900">
                      ₹{fmt(summary.netTillBalance)}
                    </div>
                    <div className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-200/60 font-mono">
                      <span>Gross Cash: ₹{fmt(summary.paymentsBreakdown?.cashTotal || 0)}</span>
                    </div>
                  </div>

                  {/* Card */}
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                    <div className="flex items-center space-x-1 text-blue-700 font-bold">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Card / POS</span>
                    </div>
                    <div className="font-mono font-black text-sm text-neutral-900">
                      ₹{fmt(summary.paymentsBreakdown?.cardTotal || 0)}
                    </div>
                    <div className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-200/60 font-mono">
                      <span>Electronic card transactions</span>
                    </div>
                  </div>

                  {/* UPI */}
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                    <div className="flex items-center space-x-1 text-purple-700 font-bold">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>UPI / QR</span>
                    </div>
                    <div className="font-mono font-black text-sm text-neutral-900">
                      ₹{fmt(summary.paymentsBreakdown?.upiTotal || 0)}
                    </div>
                    <div className="text-[10px] text-neutral-500 pt-1 border-t border-neutral-200/60 font-mono">
                      <span>Direct instant UPI settlement</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax Collection */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                  Authoritative GST Breakdown
                </span>
                <div className="flex justify-between text-[11px] text-neutral-600 font-mono">
                  <span>Central GST (CGST):</span>
                  <span>₹{fmt(summary.totalCgst)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-600 font-mono">
                  <span>State GST (SGST):</span>
                  <span>₹{fmt(summary.totalSgst)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-600 font-mono">
                  <span>Integrated GST (IGST):</span>
                  <span>₹{fmt(summary.totalIgst)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-neutral-900 pt-1 border-t border-neutral-200 font-mono">
                  <span>Total Tax Collected:</span>
                  <span>₹{fmt(summary.totalCgst + summary.totalSgst + summary.totalIgst)}</span>
                </div>
              </div>

              {/* Returns & Voids Audit */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-neutral-100 rounded-lg border border-neutral-200 space-y-0.5">
                  <div className="flex items-center space-x-1 text-neutral-700 font-bold">
                    <Ban className="w-3 h-3 text-red-500" />
                    <span>Voided Sales</span>
                  </div>
                  <div className="text-neutral-900 font-mono font-bold">
                    {summary.voids?.count || 0} voided (₹{fmt(summary.voids?.totalAmount || 0)})
                  </div>
                </div>

                <div className="p-2.5 bg-neutral-100 rounded-lg border border-neutral-200 space-y-0.5">
                  <div className="flex items-center space-x-1 text-neutral-700 font-bold">
                    <RotateCcw className="w-3 h-3 text-amber-500" />
                    <span>Refunds & Returns</span>
                  </div>
                  <div className="text-neutral-900 font-mono font-bold">
                    {summary.refunds?.count || 0} return(s) (₹{fmt(summary.refunds?.totalAmount || 0)})
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between print:hidden">
          <button
            type="button"
            onClick={fetchSummary}
            className="flex items-center space-x-1 text-xs text-neutral-600 hover:text-neutral-900 font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Report</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 text-white rounded-lg font-bold text-xs hover:bg-neutral-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
