import { formatCurrency } from '../utils/currency';
import { useNavigate } from 'react-router-dom';

interface InsufficientBalanceModalProps {
  open: boolean;
  onClose: () => void;
  requiredAmount: number;
  availableBalance: number;
  currency?: string;
  assetName?: string;
  onGoToWallet?: () => void;
}

export default function InsufficientBalanceModal({
  open,
  onClose,
  requiredAmount,
  availableBalance,
  currency = 'INR',
  assetName,
  onGoToWallet
}: InsufficientBalanceModalProps) {
  const navigate = useNavigate();
  const shortfall = requiredAmount - availableBalance;

  if (!open) return null;

  const handleGoToWallet = () => {
    onClose();
    if (onGoToWallet) {
      onGoToWallet();
    } else {
      navigate('/wallet');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog" 
      aria-modal="true" 
      aria-label="Insufficient Balance"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
              <svg 
                className="w-6 h-6 text-rose-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                Insufficient Balance
              </h3>
              {assetName && (
                <p className="text-sm text-slate-600 mt-0.5">{assetName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-base text-slate-700">
            You don't have enough funds to complete this transaction.
          </p>

          {/* Balance Details */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Required Amount</span>
              <span className="text-lg font-semibold text-slate-900">
                {formatCurrency(requiredAmount, currency)}
              </span>
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-sm font-medium text-slate-600">Available Balance</span>
              <span className="text-lg font-semibold text-teal-600">
                {formatCurrency(availableBalance, currency)}
              </span>
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t-2 border-rose-200">
              <span className="text-sm font-bold text-rose-700">Shortfall</span>
              <span className="text-lg font-bold text-rose-600">
                {formatCurrency(shortfall, currency)}
              </span>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-sm text-blue-800">
              💡 Deposit more funds to your wallet to complete this transaction.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button 
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="flex-1 px-4 py-2.5 rounded-lg bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors flex items-center justify-center gap-2"
            onClick={handleGoToWallet}
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
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" 
              />
            </svg>
            Go to Wallet
          </button>
        </div>
      </div>
    </div>
  );
}

