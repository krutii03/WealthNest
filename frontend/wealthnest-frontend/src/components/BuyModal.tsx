import { useState } from 'react';
import type { Asset, Wallet } from '../types';
import { formatCurrency } from '../utils/currency';

export default function BuyModal({ 
  asset, 
  wallet, 
  onClose, 
  onConfirm,
  isSellMode = false,
  availableQuantity = 0
}: {
  asset: Asset | null;
  wallet: Wallet | null;
  onClose: () => void;
  onConfirm: (qty: number) => void;
  isSellMode?: boolean;
  availableQuantity?: number;
}) {
  const [qty, setQty] = useState(0);
  if (!asset) return null;
  
  const cost = qty * asset.current_price;
  const affordable = wallet ? wallet.balance >= cost : false;
  const canSell = isSellMode && qty > 0 && qty <= availableQuantity;
  const isValid = isSellMode ? canSell : (affordable && qty > 0);
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      role="dialog" 
      aria-modal="true" 
      aria-label={`${isSellMode ? 'Sell' : 'Buy'} ${asset.symbol}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200">
          <h3 className="text-xl font-semibold text-slate-900">
            {isSellMode ? 'Sell' : 'Buy'} {asset.symbol}
          </h3>
          <p className="text-sm text-slate-600 mt-1">{asset.name || asset.symbol}</p>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Price Info */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600">Current Price</span>
              <span className="text-lg font-semibold text-slate-900">
                {formatCurrency(asset.current_price, wallet?.currency || 'INR')}
              </span>
            </div>
            {isSellMode && (
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm text-slate-600">Available Shares</span>
                <span className="text-base font-medium text-slate-900">
                  {availableQuantity.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Quantity
            </label>
            <input 
              type="number" 
              min={0} 
              max={isSellMode ? availableQuantity : undefined}
              step={0.0001}
              value={qty || ''} 
              onChange={(e) => setQty(Number(e.target.value) || 0)} 
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-900"
              placeholder="0.0000"
            />
          </div>

          {/* Total Cost */}
          <div className="flex justify-between items-center p-4 bg-teal-50 rounded-lg border border-teal-200">
            <span className="text-base font-medium text-slate-700">Total Amount</span>
            <span className="text-xl font-bold text-teal-600">
              {formatCurrency(cost, wallet?.currency || 'INR')}
            </span>
          </div>

          {/* Error Messages */}
          {!isSellMode && !affordable && qty > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm text-rose-700">
                Insufficient wallet balance. Available: {wallet ? formatCurrency(wallet.balance, wallet.currency || 'INR') : formatCurrency(0, 'INR')}
              </p>
            </div>
          )}
          {isSellMode && qty > availableQuantity && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm text-rose-700">
                You don't have enough shares to sell. Available: {availableQuantity.toFixed(4)} shares
              </p>
            </div>
          )}
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
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
              isValid 
                ? isSellMode 
                  ? 'bg-slate-600 text-white hover:bg-slate-700' 
                  : 'bg-teal-500 text-white hover:bg-teal-600'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
            disabled={!isValid} 
            onClick={() => onConfirm(qty)}
          >
            Confirm {isSellMode ? 'Sell' : 'Buy'}
          </button>
        </div>
      </div>
    </div>
  );
}
