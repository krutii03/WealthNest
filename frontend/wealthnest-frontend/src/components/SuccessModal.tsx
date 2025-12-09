import { formatCurrency } from '../utils/currency';
import { useEffect } from 'react';

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: {
    assetName?: string;
    assetSymbol?: string;
    quantity?: number;
    amount?: number;
    units?: number;
    nav?: number;
    proceeds?: number;
    newBalance?: number;
  };
  currency?: string;
  transactionType?: 'buy' | 'sell' | 'invest' | 'redeem';
  autoCloseDelay?: number; // Auto-close after this many milliseconds (0 = no auto-close)
}

export default function SuccessModal({
  open,
  onClose,
  title,
  message,
  details,
  currency = 'INR',
  transactionType,
  autoCloseDelay = 3000
}: SuccessModalProps) {
  useEffect(() => {
    if (open && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [open, autoCloseDelay, onClose]);

  if (!open) return null;

  const isBuy = transactionType === 'buy' || transactionType === 'invest';
  const isSell = transactionType === 'sell' || transactionType === 'redeem';

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog" 
      aria-modal="true" 
      aria-label="Transaction Success"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg 
                className="w-6 h-6 text-emerald-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-900">
                {title}
              </h3>
              <p className="text-sm text-slate-600 mt-0.5">{message}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Asset Info */}
          {(details?.assetName || details?.assetSymbol) && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">
                  {transactionType === 'invest' ? 'Fund' : transactionType === 'redeem' ? 'Fund' : 'Stock'}
                </span>
                <span className="text-base font-semibold text-slate-900">
                  {details.assetName || details.assetSymbol}
                  {details.assetSymbol && details.assetName && (
                    <span className="text-slate-500 ml-1">({details.assetSymbol})</span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Transaction Details */}
          <div className="space-y-2">
            {details?.quantity !== undefined && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">
                  {transactionType === 'invest' || transactionType === 'redeem' ? 'Units' : 'Quantity'}
                </span>
                <span className="font-semibold text-slate-900">
                  {details.quantity.toFixed(4)} {transactionType === 'invest' || transactionType === 'redeem' ? 'units' : 'shares'}
                </span>
              </div>
            )}

            {details?.nav !== undefined && (transactionType === 'invest' || transactionType === 'redeem') && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">NAV</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(details.nav, currency)}
                </span>
              </div>
            )}

            {details?.amount !== undefined && (
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-medium">
                  {isBuy ? 'Investment Amount' : isSell ? 'Proceeds' : 'Amount'}
                </span>
                <span className="text-base font-bold text-teal-600">
                  {formatCurrency(details.amount, currency)}
                </span>
              </div>
            )}

            {details?.proceeds !== undefined && (
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-medium">Proceeds</span>
                <span className="text-base font-bold text-teal-600">
                  {formatCurrency(details.proceeds, currency)}
                </span>
              </div>
            )}
          </div>

          {/* Updated Balance */}
          {details?.newBalance !== undefined && (
            <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Updated Wallet Balance</span>
                <span className="text-xl font-bold text-teal-600">
                  {formatCurrency(details.newBalance, currency)}
                </span>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-blue-800">
              ✓ Transaction completed successfully. Your portfolio has been updated.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200">
          <button 
            className="w-full px-4 py-2.5 rounded-lg bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors flex items-center justify-center gap-2"
            onClick={onClose}
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

