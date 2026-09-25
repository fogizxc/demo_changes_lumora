import React, { useState } from 'react';
import { X, DollarSign, CreditCard, QrCode, CheckCircle2, Split, ArrowRight } from 'lucide-react';

export interface PaymentEntry {
  method: 'CASH' | 'CARD' | 'UPI';
  amount: number;
  amountReceived?: number;
  changeDue?: number;
  referenceNote?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  isProcessing: boolean;
  onConfirmPayment: (payments: PaymentEntry[]) => Promise<void>;
}

export const PaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  totalAmount,
  isProcessing,
  onConfirmPayment,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'CASH' | 'CARD' | 'UPI' | 'SPLIT'>('CASH');

  // Single payment state
  const [cashTendered, setCashTendered] = useState<string>(totalAmount.toFixed(2));
  const [cardRef, setCardRef] = useState<string>('');
  const [upiRef, setUpiRef] = useState<string>('');
  const [upiApp, setUpiApp] = useState<string>('GPay');

  // Split payment state
  const [splitPayments, setSplitPayments] = useState<{
    id: string;
    method: 'CASH' | 'CARD' | 'UPI';
    amount: string;
    amountReceived: string;
    reference: string;
  }[]>([
    { id: '1', method: 'CASH', amount: (totalAmount / 2).toFixed(2), amountReceived: (totalAmount / 2).toFixed(2), reference: '' },
    { id: '2', method: 'CARD', amount: (totalAmount / 2).toFixed(2), amountReceived: (totalAmount / 2).toFixed(2), reference: '' },
  ]);

  const numTendered = parseFloat(cashTendered) || 0;
  const cashChange = Math.max(0, numTendered - totalAmount);
  const isCashSufficient = numTendered >= totalAmount;

  // Split calculations
  const splitTotal = splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const splitRemaining = Math.max(0, totalAmount - splitTotal);
  const isSplitSufficient = Math.abs(splitTotal - totalAmount) < 0.01;

  // Quick cash buttons
  const setExact = () => setCashTendered(totalAmount.toFixed(2));
  const addCash = (delta: number) => {
    const curr = parseFloat(cashTendered) || 0;
    setCashTendered((curr + delta).toFixed(2));
  };
  const roundUpToNext = (step: number) => {
    const nextVal = Math.ceil(totalAmount / step) * step;
    setCashTendered(nextVal.toFixed(2));
  };

  const handlePaySingleCash = () => {
    if (!isCashSufficient) return;
    onConfirmPayment([
      {
        method: 'CASH',
        amount: totalAmount,
        amountReceived: numTendered,
        changeDue: cashChange,
        referenceNote: 'Cash Tendered',
      },
    ]);
  };

  const handlePaySingleCard = () => {
    onConfirmPayment([
      {
        method: 'CARD',
        amount: totalAmount,
        amountReceived: totalAmount,
        changeDue: 0,
        referenceNote: cardRef ? `Card: ${cardRef}` : 'Card Terminal Payment',
      },
    ]);
  };

  const handlePaySingleUpi = () => {
    onConfirmPayment([
      {
        method: 'UPI',
        amount: totalAmount,
        amountReceived: totalAmount,
        changeDue: 0,
        referenceNote: `UPI (${upiApp}): ${upiRef || 'Direct Scan'}`,
      },
    ]);
  };

  const handlePaySplit = () => {
    if (!isSplitSufficient) return;
    const finalPayments: PaymentEntry[] = splitPayments.map((p) => {
      const amt = parseFloat(p.amount) || 0;
      const rcv = p.method === 'CASH' ? parseFloat(p.amountReceived) || amt : amt;
      const chg = p.method === 'CASH' ? Math.max(0, rcv - amt) : 0;
      return {
        method: p.method,
        amount: amt,
        amountReceived: rcv,
        changeDue: chg,
        referenceNote: p.reference || `${p.method} Split`,
      };
    });
    onConfirmPayment(finalPayments);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-wider uppercase text-neutral-400">Checkout Terminal</span>
            <h3 className="font-extrabold text-base">Select Payment Method</h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-neutral-400 block uppercase">Total Payable</span>
            <span className="text-xl font-black font-mono text-emerald-400">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('CASH')}
            className={`flex-1 py-3 text-center flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'CASH'
                ? 'bg-white text-neutral-900 border-b-2 border-neutral-900 shadow-2xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Cash</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CARD')}
            className={`flex-1 py-3 text-center flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'CARD'
                ? 'bg-white text-neutral-900 border-b-2 border-neutral-900 shadow-2xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>Card / POS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('UPI')}
            className={`flex-1 py-3 text-center flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'UPI'
                ? 'bg-white text-neutral-900 border-b-2 border-neutral-900 shadow-2xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <QrCode className="w-4 h-4 text-purple-600" />
            <span>UPI / QR</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SPLIT')}
            className={`flex-1 py-3 text-center flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'SPLIT'
                ? 'bg-white text-neutral-900 border-b-2 border-neutral-900 shadow-2xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Split className="w-4 h-4 text-amber-600" />
            <span>Split Pay</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 text-xs">
          {/* 1. CASH TAB */}
          {activeTab === 'CASH' && (
            <div className="space-y-4">
              <div>
                <label className="font-bold text-neutral-700 block mb-1.5">Amount Tendered by Customer (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono text-neutral-400 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 text-lg font-mono font-black text-neutral-900 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Quick Cash Presets */}
              <div>
                <span className="text-[11px] font-bold text-neutral-500 block mb-1.5 uppercase tracking-wide">
                  Quick Cash Tenders
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={setExact}
                    className="py-2 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold rounded-lg border border-neutral-200 text-center transition cursor-pointer"
                  >
                    Exact ₹{totalAmount.toFixed(0)}
                  </button>
                  <button
                    type="button"
                    onClick={() => roundUpToNext(100)}
                    className="py-2 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold rounded-lg border border-neutral-200 text-center transition cursor-pointer"
                  >
                    Next ₹100
                  </button>
                  <button
                    type="button"
                    onClick={() => roundUpToNext(500)}
                    className="py-2 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold rounded-lg border border-neutral-200 text-center transition cursor-pointer"
                  >
                    Next ₹500
                  </button>
                  <button
                    type="button"
                    onClick={() => roundUpToNext(2000)}
                    className="py-2 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold rounded-lg border border-neutral-200 text-center transition cursor-pointer"
                  >
                    Next ₹2000
                  </button>
                </div>
                <div className="flex space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={() => addCash(100)}
                    className="flex-1 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-medium rounded-lg border border-neutral-200 text-center transition cursor-pointer"
                  >
                    + ₹100
                  </button>
                  <button
                    type="button"
                    onClick={() => addCash(500)}
                    className="flex-1 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 font-medium rounded-lg border border-neutral-200 text-center transition cursor-pointer"
                  >
                    + ₹500
                  </button>
                </div>
              </div>

              {/* Change calculation box */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isCashSufficient ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div>
                  <span className="text-[11px] uppercase font-bold tracking-wider block text-neutral-600">
                    {isCashSufficient ? 'Change Due to Customer' : 'Short / Deficit Amount'}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {isCashSufficient
                      ? 'Return this cash to customer'
                      : `Customer still owes ₹${(totalAmount - numTendered).toFixed(2)}`}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-2xl font-mono font-black ${
                      isCashSufficient ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    ₹{isCashSufficient ? cashChange.toFixed(2) : (totalAmount - numTendered).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="button"
                disabled={!isCashSufficient || isProcessing}
                onClick={handlePaySingleCash}
                className="w-full py-3 bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-40 rounded-xl font-bold uppercase tracking-wider text-xs transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isProcessing ? 'Processing...' : 'Confirm Cash Tender & Complete'}</span>
              </button>
            </div>
          )}

          {/* 2. CARD TAB */}
          {activeTab === 'CARD' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-1">
                <span className="font-bold block text-xs">Swipe, Tap, or Insert Card on POS Terminal</span>
                <p className="text-[11px] text-blue-700">
                  Ensure the card payment of <strong>₹{totalAmount.toFixed(2)}</strong> succeeds on your swipe machine
                  before finalizing.
                </p>
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">
                  Card Authorization / Reference Note (Optional)
                </label>
                <input
                  type="text"
                  value={cardRef}
                  onChange={(e) => setCardRef(e.target.value)}
                  placeholder="e.g. Visa ending 4921 / Approval Auth 98213"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handlePaySingleCard}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 rounded-xl font-bold uppercase tracking-wider text-xs transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isProcessing ? 'Recording Card Sale...' : 'Confirm Card Payment Complete'}</span>
              </button>
            </div>
          )}

          {/* 3. UPI TAB */}
          {activeTab === 'UPI' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                {/* Dynamic QR Box simulation */}
                <div className="w-28 h-28 bg-white p-2 rounded-lg border border-purple-200 flex flex-col items-center justify-center text-center shadow-xs">
                  <QrCode className="w-16 h-16 text-neutral-900 mb-1" />
                  <span className="text-[9px] font-mono text-purple-900 font-bold">BHIM / UPI QR</span>
                </div>

                <div className="flex-1 space-y-1 text-purple-950">
                  <span className="font-extrabold text-xs block">Scan to Pay ₹{totalAmount.toFixed(2)}</span>
                  <p className="text-[11px] text-purple-800">
                    Ask customer to scan with Google Pay, PhonePe, Paytm, or any UPI app.
                  </p>
                  <div className="flex space-x-1.5 pt-1">
                    {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => setUpiApp(app)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                          upiApp === app
                            ? 'bg-purple-700 text-white'
                            : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                        }`}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">UPI UTR / Reference ID (Optional)</label>
                <input
                  type="text"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  placeholder="e.g. 423984719283 (12-digit UTR)"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-hidden"
                />
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handlePaySingleUpi}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 rounded-xl font-bold uppercase tracking-wider text-xs transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isProcessing ? 'Verifying...' : 'Confirm UPI Payment Received'}</span>
              </button>
            </div>
          )}

          {/* 4. SPLIT PAYMENT TAB */}
          {activeTab === 'SPLIT' && (
            <div className="space-y-4">
              <p className="text-[11px] text-neutral-500">
                Split the order across multiple tenders (e.g. Part Cash, Part Card/UPI).
              </p>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {splitPayments.map((p, idx) => (
                  <div key={p.id} className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-neutral-700">Tender #{idx + 1}</span>
                      <div className="flex items-center space-x-1">
                        {(['CASH', 'CARD', 'UPI'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setSplitPayments((prev) =>
                                prev.map((item) => (item.id === p.id ? { ...item, method: m } : item))
                              );
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                              p.method === m
                                ? 'bg-neutral-900 text-white'
                                : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                        {splitPayments.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSplitPayments((prev) => prev.filter((item) => item.id !== p.id))}
                            className="p-1 text-red-500 hover:text-red-700 cursor-pointer ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-neutral-500 block">Amount (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={p.amount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSplitPayments((prev) =>
                              prev.map((item) => (item.id === p.id ? { ...item, amount: val, amountReceived: val } : item))
                            );
                          }}
                          className="w-full px-2 py-1.5 font-mono text-xs border border-neutral-300 rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-500 block">
                          {p.method === 'CASH' ? 'Cash Tendered (₹)' : 'Ref Note'}
                        </label>
                        {p.method === 'CASH' ? (
                          <input
                            type="number"
                            step="0.01"
                            value={p.amountReceived}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSplitPayments((prev) =>
                                prev.map((item) => (item.id === p.id ? { ...item, amountReceived: val } : item))
                              );
                            }}
                            className="w-full px-2 py-1.5 font-mono text-xs border border-neutral-300 rounded bg-white"
                          />
                        ) : (
                          <input
                            type="text"
                            value={p.reference}
                            placeholder="Optional note"
                            onChange={(e) => {
                              const val = e.target.value;
                              setSplitPayments((prev) =>
                                prev.map((item) => (item.id === p.id ? { ...item, reference: val } : item))
                              );
                            }}
                            className="w-full px-2 py-1.5 text-xs border border-neutral-300 rounded bg-white"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSplitPayments((prev) => [
                    ...prev,
                    {
                      id: String(Date.now()),
                      method: 'CASH',
                      amount: splitRemaining.toFixed(2),
                      amountReceived: splitRemaining.toFixed(2),
                      reference: '',
                    },
                  ]);
                }}
                className="text-[11px] text-neutral-700 font-bold hover:underline cursor-pointer"
              >
                + Add Another Tender Line
              </button>

              {/* Status summary */}
              <div className="p-3 bg-neutral-100 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">Allocated / Total</span>
                  <span className="font-mono font-bold text-neutral-900">
                    ₹{splitTotal.toFixed(2)} of ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-neutral-500 block text-[10px] uppercase">Remaining Due</span>
                  <span className={`font-mono font-bold ${isSplitSufficient ? 'text-emerald-700' : 'text-red-600'}`}>
                    ₹{splitRemaining.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={!isSplitSufficient || isProcessing}
                onClick={handlePaySplit}
                className="w-full py-3 bg-neutral-950 text-white hover:bg-neutral-800 disabled:opacity-40 rounded-xl font-bold uppercase tracking-wider text-xs transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isProcessing ? 'Processing Split...' : 'Finalize Split Tender'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Close */}
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-neutral-600 hover:text-neutral-900 font-semibold text-xs cursor-pointer"
          >
            Cancel & Return to Cart
          </button>
        </div>
      </div>
    </div>
  );
};
