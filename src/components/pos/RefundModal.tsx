import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Sale } from '../../types';
import { X, RotateCcw, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  onSuccess: () => void;
}

export const RefundModal: React.FC<Props> = ({
  isOpen,
  onClose,
  sale,
  onSuccess,
}) => {
  if (!isOpen || !sale) return null;

  const [loadingItems, setLoadingItems] = useState(true);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const res = await api.pos.getReceipt(sale.id);
        setSaleItems(res.items || []);
        // default all return quantities to 0
        const initial: Record<string, number> = {};
        (res.items || []).forEach((it: any) => {
          initial[it.id] = 0;
        });
        setReturnQtys(initial);
      } catch (err: any) {
        setError('Failed to fetch invoice items: ' + err.message);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, [sale.id]);

  const calculateRefundTotal = () => {
    let sum = 0;
    saleItems.forEach((it) => {
      const q = returnQtys[it.id] || 0;
      if (q > 0) {
        // Line total proportional refund
        const unitLineTotal = Number(it.line_total) / Number(it.quantity || 1);
        sum += unitLineTotal * q;
      }
    });
    return sum;
  };

  const refundTotal = calculateRefundTotal();
  const hasItemsToRefund = Object.values(returnQtys).some((q) => q > 0);

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasItemsToRefund) {
      alert('Please select at least 1 item quantity to return.');
      return;
    }
    if (!reason.trim()) {
      alert('Please provide a reason for the return/refund.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const itemsPayload = Object.entries(returnQtys)
        .filter(([_, qty]) => qty > 0)
        .map(([saleItemId, quantity]) => ({
          saleItemId,
          quantity,
        }));

      await api.pos.refundSale(sale.id, {
        items: itemsPayload,
        reason,
        refundMethod,
      });

      alert(`Successfully refunded ₹${refundTotal.toFixed(2)}. Inventory has been restocked.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Refund failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-neutral-200 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RotateCcw className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-extrabold text-sm">Process Item Return & Refund</h3>
              <p className="text-[11px] text-neutral-400 font-mono">Invoice: {sale.invoice_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitRefund} className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {loadingItems ? (
            <div className="py-12 text-center text-neutral-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading items from invoice...
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Items selection */}
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block mb-2">
                  Select Quantities to Return
                </span>
                <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 overflow-hidden">
                  {saleItems.map((it) => {
                    const currentQty = returnQtys[it.id] || 0;
                    const maxQty = it.quantity;
                    const unitRate = Number(it.line_total) / maxQty;

                    return (
                      <div key={it.id} className="p-3 bg-neutral-50/50 flex items-center justify-between">
                        <div className="flex-1 pr-2">
                          <span className="font-bold text-neutral-900 block">{it.product_name}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            Purchased: {maxQty} units @ ₹{unitRate.toFixed(2)} ea
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReturnQtys((prev) => ({
                                ...prev,
                                [it.id]: Math.max(0, currentQty - 1),
                              }));
                            }}
                            className="w-6 h-6 rounded border border-neutral-300 flex items-center justify-center hover:bg-neutral-200 cursor-pointer text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono font-bold text-neutral-900">
                            {currentQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setReturnQtys((prev) => ({
                                ...prev,
                                [it.id]: Math.min(maxQty, currentQty + 1),
                              }));
                            }}
                            className="w-6 h-6 rounded border border-neutral-300 flex items-center justify-center hover:bg-neutral-200 cursor-pointer text-xs font-bold"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setReturnQtys((prev) => ({
                                ...prev,
                                [it.id]: maxQty,
                              }));
                            }}
                            className="text-[10px] text-blue-600 hover:underline font-semibold ml-1 cursor-pointer"
                          >
                            All
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Refund Method */}
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block mb-1">
                  Refund Payout Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'CARD', 'UPI'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRefundMethod(m)}
                      className={`py-2 text-center rounded-xl font-bold transition cursor-pointer border ${
                        refundMethod === m
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block mb-1">
                  Return / Refund Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Defective packaging, customer requested exchange, wrong item"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
              </div>

              {/* Summary refund amount */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-900 block">Total Refund Due</span>
                  <span className="text-[11px] text-amber-700">Inventory will be automatically restocked</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-mono font-black text-amber-950">
                    ₹{refundTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-xl text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!hasItemsToRefund || submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Processing Refund...' : `Refund ₹${refundTotal.toFixed(2)}`}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
