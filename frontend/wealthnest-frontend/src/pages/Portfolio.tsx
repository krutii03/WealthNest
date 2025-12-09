import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Holding } from '../types';
import { formatCurrency } from '../utils/currency';
import CsvExport from '../components/CsvExport';
import Sparkline from '../components/Sparkline';

type SortKey = 'name' | 'symbol' | 'value' | 'pl' | 'qty';

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user?.id;
        if (!uid) return;
        const portfolios = (await supabase.from('portfolios').select('portfolio_id').eq('user_id', uid)).data || [];
        const ids = portfolios.map((p) => p.portfolio_id);
        
        if (ids.length === 0) {
          setHoldings([]);
          setLoading(false);
          return;
        }
        
        // Fetch holdings with fresh asset prices
        const { data, error } = await supabase
          .from('portfolio_holdings')
          .select('*, asset:assets(*)')
          .in('portfolio_id', ids);
        
        if (error) throw error;
        setHoldings((data as any) || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load holdings');
      } finally {
        setLoading(false);
      }
    };
    
    // Initial load
    load();
    
    // Refresh every 2 minutes to get updated prices (same as stocks page)
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  const rows = useMemo(() => {
    const base = holdings.map((h) => {
      const value = (h.asset?.current_price ?? 0) * h.quantity;
      const pl = h.average_price > 0 ? ((h.asset?.current_price ?? 0) - h.average_price) / h.average_price : 0;
      const costBasis = h.average_price * h.quantity;
      
      // Generate sparkline based on actual P/L
      // If profit: upward trend, if loss: downward trend, if neutral: flat
      const spark = Array.from({ length: 12 }).map((_, i) => {
        if (pl > 0) {
          // Positive trend for profitable holdings
          return costBasis * (1 + (pl * i / 11));
        } else if (pl < 0) {
          // Negative trend for losing holdings
          return costBasis * (1 + (pl * i / 11));
        } else {
          // Flat line for neutral
          return costBasis;
        }
      });
      
      return {
        symbol: h.asset?.symbol ?? '-',
        name: h.asset?.name ?? '-',
        qty: h.quantity,
        avg_price: h.average_price,
        current_price: h.asset?.current_price ?? 0,
        value,
        pl,
        spark,
      };
    });
    const filtered = base.filter((r) =>
      [r.symbol, r.name].some((t) => t?.toLowerCase().includes(filter.toLowerCase()))
    );
    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'symbol':
          return a.symbol.localeCompare(b.symbol) * dir;
        case 'qty':
          return (a.qty - b.qty) * dir;
        case 'pl':
          return (a.pl - b.pl) * dir;
        case 'value':
        default:
          return (a.value - b.value) * dir;
      }
    });
    return sorted;
  }, [holdings, filter, sortKey, sortDir]);

  const total = rows.reduce((s, r) => s + r.value, 0);

  const changeSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Portfolio</h2>
            <div className="text-sm text-slate-600">Total Value: <strong className="text-slate-900">{formatCurrency(total, 'INR')}</strong></div>
          </div>
          <CsvExport filename="portfolio.csv" rows={rows} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between mb-3">
          <input
            type="search"
            placeholder="Filter by name or symbol"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-80 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Filter holdings"
          />
          <div className="text-xs text-slate-500">Sort: {sortKey} ({sortDir})</div>
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-slate-100 rounded animate-pulse" />
          </div>
        ) : error ? (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-2" role="alert">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 mb-3" />
            <div className="text-slate-700 font-medium mb-1">No holdings yet</div>
            <div className="text-slate-600 text-sm mb-3">Start investing to build your portfolio.</div>
            <button className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium border border-slate-200 hover:shadow focus:ring-2 focus:ring-teal-500">Start Investing</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-slate-500">
                <tr className="border-b">
                  <th className="text-left py-2 cursor-pointer" onClick={() => changeSort('symbol')}>Symbol</th>
                  <th className="text-left py-2 cursor-pointer" onClick={() => changeSort('name')}>Name</th>
                  <th className="text-right py-2 cursor-pointer" onClick={() => changeSort('qty')}>Quantity</th>
                  <th className="text-right py-2">Avg Price</th>
                  <th className="text-right py-2">Current Price</th>
                  <th className="text-right py-2 cursor-pointer" onClick={() => changeSort('value')}>Total Value</th>
                  <th className="text-right py-2 cursor-pointer" onClick={() => changeSort('pl')}>P/L (%)</th>
                  <th className="text-right py-2">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 focus-within:bg-slate-50">
                    <td className="py-2 text-slate-900 font-medium">{r.symbol}</td>
                    <td className="py-2 text-slate-700">{r.name}</td>
                    <td className="py-2 text-right">{r.qty}</td>
                    <td className="py-2 text-right">{formatCurrency(r.avg_price, 'INR')}</td>
                    <td className="py-2 text-right">{formatCurrency(r.current_price, 'INR')}</td>
                    <td className="py-2 text-right">{formatCurrency(r.value, 'INR')}</td>
                    <td className={`py-2 text-right ${r.pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{(r.pl * 100).toFixed(2)}%</td>
                    <td className="py-2 text-right">
                      <Sparkline 
                        values={r.spark} 
                        width={80} 
                        height={24} 
                        stroke={r.pl >= 0 ? '#10b981' : r.pl < 0 ? '#ef4444' : '#6b7280'} 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
