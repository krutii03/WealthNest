import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MarketBuzzItem } from '../utils/api';
import { getMarketBuzz } from '../utils/api';

const fallbackNews: MarketBuzzItem[] = [
  {
    title: 'Tech leads rebound as softer data lifts rate-cut hopes',
    source: 'WealthNest Desk',
    sentiment: 'Positive',
    time: new Date().toISOString(),
  },
  {
    title: 'Crude eases on inventory build; EM risk assets firm',
    source: 'WealthNest Desk',
    sentiment: 'Neutral',
    time: new Date().toISOString(),
  },
];

export default function MarketNewsPage() {
  const [news, setNews] = useState<MarketBuzzItem[]>(fallbackNews);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const fetchNews = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getMarketBuzz();
        if (active) {
          setNews(data.items && data.items.length > 0 ? data.items : fallbackNews);
        }
      } catch (err: any) {
        console.error('Error fetching market news:', err);
        if (active) {
          setError(err.message || 'Failed to load market news');
          setNews(fallbackNews); // Fallback to static data on error
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchNews();

    // Refresh every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-sky-600 hover:text-sky-700 mb-4"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Market News Digest</h1>
          <p className="mt-2 text-slate-600">
            Stay updated with the latest market news and financial insights
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="space-y-4">
              <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* News List */}
        {!loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            {news.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No news available at the moment.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {news.map((item, idx) => (
                  <li key={`${item.title}-${idx}`} className="p-6 hover:bg-slate-50 transition">
                    <a
                      href={item.url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 hover:text-sky-600 mb-2">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span className="font-medium">{item.source}</span>
                            {item.sentiment && (
                              <>
                                <span>·</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  item.sentiment.toLowerCase() === 'positive'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : item.sentiment.toLowerCase() === 'negative'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {item.sentiment}
                                </span>
                              </>
                            )}
                            <span>·</span>
                            <span>
                              {new Date(item.time).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <svg
                          className="w-5 h-5 text-slate-400 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Refresh Info */}
        {!loading && news.length > 0 && (
          <div className="mt-4 text-center text-xs text-slate-500">
            News refreshes every 5 minutes • Last updated: {new Date().toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

