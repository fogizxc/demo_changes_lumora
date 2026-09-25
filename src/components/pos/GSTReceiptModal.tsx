import React from 'react';
import { Sale, Shop, Employee } from '../../types';
import { Printer, CheckCircle2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  items: any[];
  payments?: any[];
  refunds?: any[];
  shop: Partial<Shop>;
  employee?: Partial<Employee>;
  isReprint?: boolean;
}

export const GSTReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  sale,
  items = [],
  payments = [],
  refunds = [],
  shop = {},
  employee,
  isReprint = false,
}) => {
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const fmt = (val: any) => (Number(val) || 0).toFixed(2);

  // Convert number to words helper for invoice
  const formatWords = (amount: number): string => {
    return `Indian Rupees ${fmt(amount)} Only`;
  };

  const activePayments = payments && payments.length > 0 ? payments : (sale.payments || []);
  const activeRefunds = refunds && refunds.length > 0 ? refunds : (sale.refunds || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:p-0 print:bg-white">
      <div id="printable-tax-invoice" className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-neutral-200 max-h-[95vh] overflow-y-auto print:border-none print:shadow-none print:max-w-full print:p-2">
        {/* Actions bar (hidden in print) */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-100 print:hidden">
          <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Sale Completed Successfully</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-xs font-semibold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Tax Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* GST TAX INVOICE CONTENT */}
        <div className="text-xs space-y-4 text-neutral-900 font-sans">
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-neutral-300">
            {isReprint && (
              <div className="mb-1 inline-block px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 rounded font-mono font-bold text-[10px] uppercase">
                Duplicate / Reprint Tax Invoice
              </div>
            )}
            <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 block">TAX INVOICE</span>
            <h2 className="text-lg font-black text-neutral-950 uppercase tracking-tight mt-0.5">
              {shop?.name || 'Retail Store'}
            </h2>
            <p className="text-[11px] text-neutral-600 max-w-xs mx-auto mt-0.5">{shop?.address || 'Store Location'}</p>
            <p className="text-[11px] text-neutral-600">Phone: {shop?.phone || 'N/A'}</p>
            <div className="mt-1.5 flex items-center justify-center space-x-3 text-[11px] font-mono">
              <span className="font-bold text-neutral-900">GSTIN: {shop?.gst_number || 'UNREGISTERED'}</span>
              {shop?.vat_number && <span>VAT: {shop.vat_number}</span>}
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-neutral-200">
            <div>
              <span className="text-neutral-500 block">Invoice Number:</span>
              <span className="font-mono font-bold text-neutral-900">{sale.invoice_number || 'INV-DRAFT'}</span>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 block">Date & Time:</span>
              <span className="font-mono text-neutral-800">{sale.created_at ? new Date(sale.created_at).toLocaleString() : new Date().toLocaleString()}</span>
            </div>
            <div>
              <span className="text-neutral-500 block">Cashier / Operator:</span>
              <span className="font-semibold text-neutral-900">
                {employee?.name || 'Store Lead'} ({employee?.employee_id || 'OP-01'})
              </span>
            </div>
            <div className="text-right">
              <span className="text-neutral-500 block">POS Till Session:</span>
              <span className="font-mono text-neutral-600">{sale.session_id || 'ACTIVE'}</span>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <table className="min-w-full text-[11px] text-left">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 uppercase font-bold text-[9px]">
                  <th className="py-1.5">Item</th>
                  <th className="py-1.5 text-center">Qty</th>
                  <th className="py-1.5 text-right">Rate</th>
                  <th className="py-1.5 text-right">Tax</th>
                  <th className="py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {(items || []).map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td className="py-2">
                      <span className="font-semibold text-neutral-900 block">{it.product_name}</span>
                      {Number(it.discount) > 0 && (
                        <span className="text-[10px] text-red-600 font-mono">Disc: -₹{fmt(it.discount)}</span>
                      )}
                    </td>
                    <td className="py-2 text-center font-mono">{it.quantity}</td>
                    <td className="py-2 text-right font-mono">₹{fmt(it.unit_price)}</td>
                    <td className="py-2 text-right font-mono text-neutral-500">₹{fmt(it.tax)}</td>
                    <td className="py-2 text-right font-mono font-bold text-neutral-900">₹{fmt(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculation Summary */}
          <div className="pt-2 border-t border-dashed border-neutral-300 space-y-1 text-[11px]">
            <div className="flex justify-between text-neutral-600">
              <span>Gross Subtotal:</span>
              <span className="font-mono font-medium">₹{fmt(sale.subtotal)}</span>
            </div>

            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Authorized Discount:</span>
                <span className="font-mono font-semibold">-₹{fmt(sale.discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-neutral-600">
              <span>Taxable Value:</span>
              <span className="font-mono font-medium">₹{fmt(sale.taxable_amount)}</span>
            </div>

            {/* GST Split */}
            {Number(sale.igst_amount) > 0 ? (
              <div className="flex justify-between text-purple-900 font-medium">
                <span>Integrated GST (IGST 100%):</span>
                <span className="font-mono">₹{fmt(sale.igst_amount)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-neutral-600">
                  <span>Central GST (CGST 50%):</span>
                  <span className="font-mono">₹{fmt(sale.cgst_amount)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>State GST (SGST 50%):</span>
                  <span className="font-mono">₹{fmt(sale.sgst_amount)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between text-neutral-700 font-semibold pt-1 border-t border-neutral-200">
              <span>Total Tax (GST):</span>
              <span className="font-mono">₹{fmt(sale.tax_amount)}</span>
            </div>

            <div className="flex justify-between items-baseline text-sm font-black text-neutral-950 pt-2 border-t-2 border-neutral-900">
              <span>TOTAL AMOUNT:</span>
              <span className="font-mono text-base">₹{fmt(sale.total_amount)}</span>
            </div>

            <div className="text-[10px] text-neutral-500 italic mt-1">
              Amount in words: {formatWords(Number(sale.total_amount) || 0)}
            </div>
          </div>

          {/* Payment Method Breakdown */}
          {activePayments && activePayments.length > 0 && (
            <div className="pt-2 border-t border-neutral-200 text-[11px] space-y-1">
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider block">
                Payment Tendered
              </span>
              {activePayments.map((p, idx) => (
                <div key={idx} className="bg-neutral-50 p-2 rounded border border-neutral-200 space-y-0.5">
                  <div className="flex justify-between font-semibold text-neutral-900">
                    <span className="flex items-center space-x-1">
                      <span className="px-1.5 py-0.2 bg-neutral-200 text-neutral-800 rounded font-mono text-[9px] font-bold">
                        {p.payment_method || p.method}
                      </span>
                      {p.reference_note && (
                        <span className="text-neutral-500 text-[10px] font-normal truncate max-w-[140px]">
                          Ref: {p.reference_note}
                        </span>
                      )}
                    </span>
                    <span className="font-mono">₹{fmt(p.amount)}</span>
                  </div>
                  {(p.payment_method === 'CASH' || p.method === 'CASH') && Number(p.amount_received) > 0 && (
                    <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                      <span>Tendered: ₹{fmt(p.amount_received)}</span>
                      <span className="text-emerald-700 font-semibold">Change: ₹{fmt(p.change_due)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Refunds / Returns Warning if any */}
          {activeRefunds && activeRefunds.length > 0 && (
            <div className="pt-2 border-t border-dashed border-red-200 text-[11px] bg-red-50/60 p-2 rounded">
              <span className="text-[10px] uppercase font-bold text-red-700 tracking-wider block">
                Return / Refund History ({activeRefunds.length})
              </span>
              {activeRefunds.map((ref, idx) => (
                <div key={idx} className="flex justify-between text-red-900 font-mono text-[10px] mt-1">
                  <span>
                    Refund #{ref.id?.slice(0, 8)} ({ref.refund_method || 'CASH'}) - {ref.reason}
                  </span>
                  <span className="font-bold">-₹{fmt(ref.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-3 border-t border-dashed border-neutral-300 text-center text-[10px] text-neutral-500">
            {shop?.short_note ? (
              <p className="font-medium text-neutral-700">{shop.short_note}</p>
            ) : (
              <p>Thank you for shopping with us! Please retain this receipt for warranty and returns.</p>
            )}
            <p className="mt-1 font-mono text-[9px] text-neutral-400">
              Generated by NexPOS ERP • Authoritative GST Compliant
            </p>
          </div>
        </div>

        {/* Dismiss Button (hidden in print) */}
        <div className="mt-5 pt-3 border-t border-neutral-100 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="w-full py-2 bg-neutral-950 text-white hover:bg-neutral-800 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            Start New Sale
          </button>
        </div>
      </div>
    </div>
  );
};
