import { useMemo } from 'react';
import { formatCurrency } from '../utils/currency';

type KPIProps = {
  portfolioTotal?: number | null;
  walletBalance?: number | null;
  pctChange24h?: number | null;
  currency?: string;
  pnlValue?: number | null;
  pnlPct?: number | null;
  loading?: boolean;
};

export default function HeroKPI({
  portfolioTotal,
  walletBalance,
  pctChange24h,
  currency = 'INR',
  pnlValue,
  pnlPct,
  loading,
}: KPIProps) {
  const pctColor = useMemo(() => {
    if (pctChange24h == null) return 'text-slate-500';
    if (pctChange24h >= 0) return 'text-emerald-600';
    return 'text-rose-600';
  }, [pctChange24h]);

  const pnlColor = useMemo(() => {
    if (pnlValue == null) return 'text-slate-500';
    if (pnlValue >= 0) return 'text-emerald-600';
    return 'text-rose-600';
  }, [pnlValue]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Overview</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 hover:shadow transition focus-within:ring-2 focus-within:ring-teal-500">
          <div className="text-slate-600 text-sm">Portfolio Value</div>
          <div className="text-slate-900 text-2xl font-semibold mt-1">
            {loading ? <span className="inline-block h-6 w-32 bg-slate-100 animate-pulse rounded" /> : formatCurrency(portfolioTotal ?? 0, currency)}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 hover:shadow transition focus-within:ring-2 focus-within:ring-teal-500">
          <div className="text-slate-600 text-sm">Wallet Balance</div>
          <div className="text-slate-900 text-2xl font-semibold mt-1">
            {loading ? <span className="inline-block h-6 w-28 bg-slate-100 animate-pulse rounded" /> : formatCurrency(walletBalance ?? 0, currency)}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 hover:shadow transition focus-within:ring-2 focus-within:ring-teal-500">
          <div className="text-slate-600 text-sm">24h Change</div>
          <div className={`text-2xl font-semibold mt-1 ${pctColor}`}>
            {loading ? <span className="inline-block h-6 w-16 bg-slate-100 animate-pulse rounded" /> : `${pctChange24h?.toFixed(2) ?? '0.00'}%`}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 hover:shadow transition focus-within:ring-2 focus-within:ring-teal-500">
          <div className="text-slate-600 text-sm">Unrealized P&L</div>
          <div className={`text-2xl font-semibold mt-1 ${pnlColor}`}>
            {loading ? (
              <span className="inline-block h-6 w-24 bg-slate-100 animate-pulse rounded" />
            ) : (
              `${pnlValue != null ? (pnlValue >= 0 ? '+' : '') + formatCurrency(Math.abs(pnlValue), currency) : formatCurrency(0, currency)}${
                pnlPct != null ? ` (${pnlPct.toFixed(2)}%)` : ''
              }`
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
