import { useEffect, useState } from 'react';
import { getMarketBuzzCached } from '../utils/api';

export default function MarketBuzzPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freshness, setFreshness] = useState<number | null>(null);
  const [items, setItems] = useState<Array<{ title: string; source: string; url: string; time: string }>>([]);
  const [word, setWord] = useState<{ term: string; definition: string } | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getMarketBuzzCached();
        if (!active) return;
        setItems(data.headlines || []);
        setWord(data.word || null);
        setFreshness(data.freshness_sec ?? null);
        setError(null);
      } catch (e: any) {
        setError(e.message || 'Failed to load market buzz');
      } finally {
        setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 120000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6" role="region" aria-live="polite" aria-busy={loading}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-slate-900">Market Buzz</h3>
        <span className="text-xs text-slate-500">{freshness != null ? `Updated ${Math.round(freshness)}s ago` : ''}</span>
      </div>
      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-2 mb-2" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
          <div className="h-4 w-4/5 bg-slate-100 rounded animate-pulse" />
        </div>
      ) : (
        <ul className="divide-y divide-slate-200">
          {items.slice(0, 5).map((n, i) => (
            <li key={i} className="py-2">
              <a href={n.url} className="text-sm text-slate-800 hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded" target="_blank" rel="noreferrer">
                {n.title}
              </a>
              <div className="text-xs text-slate-500">{n.source} • {n.time}</div>
            </li>
          ))}
          {word && (
            <li className="pt-3">
              <div className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 text-xs px-2 py-1 mb-1">Word of the Day</div>
              <div className="text-sm text-slate-900 font-medium">{word.term}</div>
              <div className="text-sm text-slate-600">{word.definition}</div>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
