import React, { useState } from 'react';
import { HeldBill } from '../../types';
import { X, Play, Trash2, Clock, PauseCircle, ShoppingBag, User } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  heldBills: HeldBill[];
  onResume: (billId: string) => Promise<void>;
  onCancel: (billId: string) => Promise<void>;
}

export const HeldBillsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  heldBills,
  onResume,
  onCancel,
}) => {
  if (!isOpen) return null;

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleResume = async (id: string) => {
    setProcessingId(id);
    try {
      await onResume(id);
      onClose();
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to discard this held bill?')) return;
    setProcessingId(id);
    try {
      await onCancel(id);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-neutral-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PauseCircle className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-extrabold text-sm">Parked / Held Bills</h3>
              <p className="text-[11px] text-neutral-400">
                {heldBills.length} order{heldBills.length === 1 ? '' : 's'} on hold in current store
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3 text-xs">
          {heldBills.length === 0 ? (
            <div className="py-12 text-center text-neutral-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
              <p className="font-bold text-neutral-700">No held bills at this time</p>
              <p className="text-[11px] text-neutral-400 mt-1">
                You can park an order at any time using the "Hold Bill" button in the cart.
              </p>
            </div>
          ) : (
            heldBills.map((b) => {
              let parsedItems: any[] = [];
              try {
                const data = JSON.parse(b.cart_data);
                parsedItems = data.items || [];
              } catch {
                // ignore
              }

              return (
                <div
                  key={b.id}
                  className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 hover:border-neutral-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-neutral-900 text-sm">
                          {b.reference_label || 'Held Order'}
                        </span>
                        {b.customer_name && (
                          <span className="flex items-center text-neutral-600 bg-neutral-200 px-2 py-0.5 rounded text-[10px] font-medium">
                            <User className="w-3 h-3 mr-1" />
                            {b.customer_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-neutral-400 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>Held by: <strong>{b.employee_name || 'Staff'}</strong></span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-black text-neutral-900 text-sm block">
                        ₹{Number(b.subtotal || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-neutral-500">{parsedItems.length} item line(s)</span>
                    </div>
                  </div>

                  {/* Preview items */}
                  {parsedItems.length > 0 && (
                    <div className="pt-2 border-t border-neutral-200/60 text-[11px] text-neutral-600 space-y-0.5">
                      {parsedItems.slice(0, 3).map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate max-w-xs">{it.quantity}x {it.name || it.product_name || `Product #${it.productId}`}</span>
                          <span className="font-mono text-neutral-500">₹{(Number(it.price || it.unitPrice || 0) * it.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      {parsedItems.length > 3 && (
                        <div className="text-[10px] text-neutral-400 italic">
                          +{parsedItems.length - 3} more item(s)...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={processingId === b.id}
                      onClick={() => handleCancel(b.id)}
                      className="flex items-center space-x-1 px-2.5 py-1 text-red-600 hover:bg-red-50 rounded font-semibold text-[11px] transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Discard</span>
                    </button>

                    <button
                      type="button"
                      disabled={processingId === b.id}
                      onClick={() => handleResume(b.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{processingId === b.id ? 'Loading...' : 'Resume Bill'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-100 border-t border-neutral-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-700 font-semibold text-xs hover:bg-neutral-50 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
