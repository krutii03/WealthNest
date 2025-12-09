import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import type { LeaderboardEntry } from '../types';

type FAQItem = { id: string; q: string; a: string };
type MarketBuzzItem = {
  title: string;
  source: string;
  sentiment: string;
  time: string;
  url?: string;
};
type WordOfTheDay = {
  term?: string;
  word?: string;
  definition: string;
  description?: string;
  example?: string;
  category?: string;
};

// --- Static Data ---
const marketBuzz: MarketBuzzItem[] = [
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

// Home leaderboard (live from DB)
const initialLeaders: LeaderboardEntry[] = [];

const faqs: FAQItem[] = [
  { id: 'f1', q: 'What is a SIP?', a: 'A Systematic Investment Plan lets you invest a fixed amount at regular intervals to average costs and build wealth over time.' },
  { id: 'f2', q: 'What is a Lumpsum investment?', a: 'A single one-time investment, which may suit investors with larger deployable capital and higher risk appetite.' },
  { id: 'f3', q: 'What is ASM?', a: 'Additional Surveillance Measure helps reduce volatility and protect investors by imposing trading curbs on certain securities.' },
  { id: 'f4', q: 'How can I simulate trades?', a: 'Use WealthNest’s simulated trading to practice entries and exits without risking capital. Leaderboards make it fun!' },
];

const fallbackWotd: WordOfTheDay = {
  term: 'Bull Market',
  word: 'Bull Market',
  definition: 'A market condition where prices are rising or are expected to rise.',
  example: 'The S&P 500 has been in a bull market for the past decade.',
  category: 'Trading'
};

// --- Simple calculators (client-side only) ---
function futureValueLumpsum(principal: number, years: number, annualRatePct: number) {
  const r = annualRatePct / 100;
  const fv = principal * Math.pow(1 + r, years);
  return Math.max(0, Number.isFinite(fv) ? fv : 0);
}

function futureValueSIP(monthly: number, years: number, annualRatePct: number) {
  const n = years * 12;
  const i = annualRatePct / 100 / 12;
  if (i === 0) return monthly * n;
  const fv = monthly * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  return Math.max(0, Number.isFinite(fv) ? fv : 0);
}

export default function Home() {
  // Check if user is authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch market buzz from API
  const [buzz, setBuzz] = useState<MarketBuzzItem[]>(marketBuzz);
  const [buzzLoading, setBuzzLoading] = useState(true);
  const [buzzError, setBuzzError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    
    const fetchBuzz = async () => {
      try {
        setBuzzLoading(true);
        setBuzzError(null);
        
        const response = await fetch('/api/market/buzz');
        if (!response.ok) {
          throw new Error('Failed to fetch market buzz');
        }
        
        const data = await response.json();
        if (active) {
          setBuzz(data.items || marketBuzz); // Fallback to static data if empty
        }
      } catch (err: any) {
        console.error('Error fetching market buzz:', err);
        if (active) {
          setBuzzError(err.message || 'Failed to load market buzz');
          setBuzz(marketBuzz); // Fallback to static data on error
        }
      } finally {
        if (active) {
          setBuzzLoading(false);
        }
      }
    };

    fetchBuzz();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchBuzz, 5 * 60 * 1000);
    
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch Word of the Day from API
  const [wotd, setWotd] = useState<WordOfTheDay>(fallbackWotd);
  const [wotdLoading, setWotdLoading] = useState(true);
  const [wotdError, setWotdError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    
    const fetchWotd = async () => {
      try {
        setWotdLoading(true);
        setWotdError(null);
        
        const response = await fetch('/api/market/word-of-the-day');
        if (!response.ok) {
          // Even if response is not ok, try to parse the JSON as backend returns fallback data
          const errorData = await response.json().catch(() => null);
          if (errorData && errorData.term) {
            // Backend returned fallback data, use it
            if (active) {
              const normalized = {
                ...errorData,
                word: errorData.term || errorData.word || 'Financial Term',
                term: errorData.term || errorData.word || 'Financial Term'
              };
              setWotd(normalized);
            }
            return;
          }
          throw new Error('Failed to fetch word of the day');
        }
        
        const data = await response.json();
        if (active) {
          // Normalize the data: use 'term' if available, fallback to 'word'
          const normalized = {
            ...data,
            word: data.term || data.word || 'Financial Term',
            term: data.term || data.word || 'Financial Term'
          };
          setWotd(normalized);
        }
      } catch (err: any) {
        console.error('Error fetching word of the day:', err);
        if (active) {
          setWotdError(err.message || 'Failed to load word of the day');
          setWotd(fallbackWotd); // Fallback to static data on error
        }
      } finally {
        if (active) {
          setWotdLoading(false);
        }
      }
    };

    fetchWotd();
    
    // Refresh once per day (every 24 hours) - but for now, we'll use day-of-year selection on backend
    // So we can refresh less frequently, like every 6 hours
    const interval = setInterval(fetchWotd, 6 * 60 * 60 * 1000);
    
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Calculator local state
  const [sipAmount, setSipAmount] = useState(5000);
  const [sipYears, setSipYears] = useState(5);
  const [sipRate, setSipRate] = useState(12);

  const [lsAmount, setLsAmount] = useState(25000);
  const [lsYears, setLsYears] = useState(5);
  const [lsRate, setLsRate] = useState(12);

  const sipFV = useMemo(() => futureValueSIP(sipAmount, sipYears, sipRate), [sipAmount, sipYears, sipRate]);
  const lsFV = useMemo(() => futureValueLumpsum(lsAmount, lsYears, lsRate), [lsAmount, lsYears, lsRate]);

  // Live Leaderboard
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>(initialLeaders);
  const [leadersLoading, setLeadersLoading] = useState(false);
  const [leadersError, setLeadersError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLeadersLoading(true);
        const { data, error } = await supabase
          .from('leaderboard')
          .select('leaderboard_id, user_id, points_total, rank, user:users(name, email)')
          .order('rank', { ascending: true })
          .limit(20);
        if (error) throw error;
        if (mounted) {
          setLeaders((data as any) || []);
          setLeadersError(null);
        }
      } catch (e: any) {
        if (mounted) setLeadersError(e?.message || 'Failed to load leaderboard');
      } finally {
        if (mounted) setLeadersLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left copy */}
          <div className="relative z-10">
            <p className="inline-flex items-center gap-2 rounded-full bg-sky-100 text-sky-700 px-4 py-1.5 text-xs font-semibold mb-6 shadow-sm">
              <span>✨</span>
              <span>WealthNest</span>
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-4">
              Grow smarter.<br />
              <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Invest better.</span>
            </h1>
            <p className="mt-4 text-slate-600 text-lg leading-relaxed">
              WealthNest — Where your investments take flight. 📈
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {!isAuthenticated ? (
                <>
                  <Link to="/signup" className="group inline-flex items-center justify-center rounded-lg border border-transparent bg-emerald-600 text-white px-6 py-3 font-medium hover:bg-emerald-700 hover:shadow-lg hover:scale-105 transition-all duration-200">
                    Get Started
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                  <Link to="/about" className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 px-6 py-3 font-medium transition-all duration-200">
                    Learn More
                  </Link>
                </>
              ) : (
                <Link to="/dashboard" className="group inline-flex items-center justify-center rounded-lg border border-transparent bg-emerald-600 text-white px-6 py-3 font-medium hover:bg-emerald-700 hover:shadow-lg hover:scale-105 transition-all duration-200">
                  Go to Dashboard
                  <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              )}
            </div>
            {/* Quick stats or features */}
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md hover:border-sky-300 transition-all">
                <div className="text-2xl font-bold text-sky-600 mb-1">100+</div>
                <div className="text-xs text-slate-600 font-medium">Assets</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md hover:border-emerald-300 transition-all">
                <div className="text-2xl font-bold text-emerald-600 mb-1">24/7</div>
                <div className="text-xs text-slate-600 font-medium">Trading</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md hover:border-amber-300 transition-all">
                <div className="text-2xl font-bold text-amber-600 mb-1">₹0</div>
                <div className="text-xs text-slate-600 font-medium">Fees</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all">
                <div className="text-2xl font-bold text-indigo-600 mb-1">🔒</div>
                <div className="text-xs text-slate-600 font-medium">Secure</div>
              </div>
            </div>
          </div>

          {/* Right illustration */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-sky-200/30 to-blue-200/30 rounded-3xl blur-3xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-200">
              <svg className="w-full h-auto" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Finance illustration">
                <g transform="translate(60,60)">
                  <rect x="0" y="0" width="220" height="140" rx="12" fill="#ffffff" stroke="#c8d7ff" strokeWidth="2" />
                  <polyline points="10,120 60,80 100,95 140,60 200,70" fill="none" stroke="#2563eb" strokeWidth="4" />
                  <circle cx="60" cy="80" r="5" fill="#2563eb" />
                  <circle cx="140" cy="60" r="5" fill="#2563eb" />
                  <circle cx="200" cy="70" r="5" fill="#2563eb" />
                </g>
                <g transform="translate(320,120)">
                  <rect x="0" y="0" width="200" height="200" rx="12" fill="#ffffff" stroke="#c8d7ff" strokeWidth="2" />
                  <circle cx="100" cy="100" r="70" fill="#e0f2fe" />
                  <path d="M100 30 A 70 70 0 0 1 165 85 L100 100 Z" fill="#60a5fa" />
                  <path d="M165 85 A 70 70 0 1 1 100 30 L100 100 Z" fill="#2563eb" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Everything You Need to Invest</h2>
          <p className="text-slate-600">Tools and features to help you make smarter investment decisions</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <HighlightCard title="Simulated Trading" desc="Practice without risk in a live-like market sandbox." cta="Try Now" to="/dashboard" iconBg="bg-emerald-100" icon="📊" />
          <HighlightCard title="Real-time Prices" desc="Track assets with lightning-fast updates." cta="View Assets" to="/assets" iconBg="bg-sky-100" icon="⚡" />
          <HighlightCard title="Smart Calculators" desc="Plan SIPs and lumpsums with clarity." cta="Open Calculators" to="/calculators" iconBg="bg-indigo-100" icon="🧮" />
          <HighlightCard title="Leaderboard" desc="Earn badges and climb the leaderboard." cta="Earn Badges" to="/leaderboard" iconBg="bg-amber-100" icon="🏆" />
        </div>
      </section>

      {/* Market Buzz */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📰</span>
              <h2 className="text-xl font-semibold text-slate-900">Market Buzz</h2>
            </div>
            <Link to="/market-news" className="text-sky-600 hover:text-sky-700 text-sm font-medium hover:underline">View Digest →</Link>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            {buzzLoading && (
              <div className="p-6 text-sm text-slate-500">Loading latest market buzz…</div>
            )}
            {buzzError && !buzzLoading && (
              <div className="p-6 text-sm text-red-600">{buzzError}</div>
            )}
            {!buzzLoading && !buzzError && (
              <>
                  <ul className="divide-y divide-slate-200">
                    {buzz.slice(0, 2).map((n, idx) => (
                      <li key={`${n.title}-${idx}`} className="p-4 hover:bg-sky-50 transition-colors group">
                        <a 
                          href={n.url || '#'} 
                          target="_blank" 
                          rel="noreferrer"
                          className="block"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-slate-800 font-medium group-hover:text-sky-600 transition-colors leading-snug">{n.title}</p>
                              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-2">
                                <span>{n.source}</span>
                                {n.sentiment && (
                                  <>
                                    <span>·</span>
                                    <span className={`px-2 py-0.5 rounded-full ${
                                      n.sentiment.toLowerCase().includes('positive') || n.sentiment.toLowerCase() === 'top news'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {n.sentiment}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                            <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(n.time).toLocaleTimeString()}</span>
                          </div>
                        </a>
                      </li>
                    ))}
                  {buzz.length === 0 && (
                    <li className="p-4 text-sm text-slate-500">No buzz items available.</li>
                  )}
                </ul>
                {buzz.length > 2 && (
                  <div className="p-4 text-center border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">
                      Showing 2 of {buzz.length} news items
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Word of the Day */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <h2 className="text-xl font-semibold text-slate-900">Word of the Day</h2>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
            {wotdLoading && (
              <div className="p-6 text-sm text-slate-500">Loading…</div>
            )}
            {wotdError && !wotdLoading && (
              <div className="p-6 text-sm text-red-600">{wotdError}</div>
            )}
            {!wotdLoading && !wotdError && wotd && (
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xl font-bold text-sky-700">{(wotd.term || wotd.word)}</p>
                  {wotd.category && (
                    <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-medium">
                      {wotd.category}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 font-medium mb-2">{wotd.definition}</p>
                {(wotd.description || wotd.example) && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {wotd.description || wotd.example}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Calculator Preview */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧮</span>
              <h2 className="text-xl font-semibold text-slate-900">Calculator Preview</h2>
            </div>
            <Link to="/calculators" className="text-sky-600 hover:text-sky-700 text-sm font-medium hover:underline">Explore All Calculators →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SIP */}
            <div className="rounded-lg border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">💰</span>
                <h3 className="font-semibold text-slate-900 text-lg">SIP Calculator</h3>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <LabeledInput label="Amount (₹)" value={sipAmount} onChange={v => setSipAmount(v)} />
                <LabeledInput label="Years" value={sipYears} onChange={v => setSipYears(v)} />
                <LabeledInput label="Rate (% p.a.)" value={sipRate} onChange={v => setSipRate(v)} />
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg border border-emerald-100">
                <p className="text-xs text-slate-500 mb-1">Future Value</p>
                <p className="text-2xl font-bold text-emerald-600">₹ {sipFV.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
            {/* Lumpsum */}
            <div className="rounded-lg border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">💎</span>
                <h3 className="font-semibold text-slate-900 text-lg">Lumpsum Calculator</h3>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <LabeledInput label="Amount (₹)" value={lsAmount} onChange={v => setLsAmount(v)} />
                <LabeledInput label="Years" value={lsYears} onChange={v => setLsYears(v)} />
                <LabeledInput label="Rate (% p.a.)" value={lsRate} onChange={v => setLsRate(v)} />
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg border border-indigo-100">
                <p className="text-xs text-slate-500 mb-1">Future Value</p>
                <p className="text-2xl font-bold text-indigo-600">₹ {lsFV.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard (Full-width) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <h3 className="text-lg font-semibold text-slate-900">Top Performers</h3>
            </div>
            <Link to="/leaderboard" className="text-sky-600 hover:text-sky-700 text-sm font-medium hover:underline">Open Full Board →</Link>
          </div>
          {leadersLoading && (
            <p className="text-sm text-slate-500">Loading leaderboard…</p>
          )}
          {leadersError && !leadersLoading && (
            <p className="text-sm text-red-600">{leadersError}</p>
          )}
          {!leadersLoading && !leadersError && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500 bg-slate-50">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Rank</th>
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {leaders.map((r, idx) => (
                    <tr key={r.leaderboard_id} className={`hover:bg-sky-50 transition-colors ${idx < 3 ? 'bg-amber-50/50' : ''}`}>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '#'}
                        {r.rank ?? idx + 1}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{r.user?.name ?? r.user_id}</td>
                      <td className="py-3 px-4 text-slate-700 font-semibold">{(r.points_total ?? 0).toLocaleString()} pts</td>
                    </tr>
                  ))}
                  {leaders.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-3 text-slate-500">No entries found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Chatbot/FAQ Preview */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❓</span>
              <h2 className="text-xl font-semibold text-slate-900">Frequently Asked Questions</h2>
            </div>
            <Link to="/faq" className="text-sky-600 hover:text-sky-700 text-sm font-medium hover:underline">Ask More →</Link>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {faqs.map(item => (
              <FAQ key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Feedback Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">💬</span>
            <h2 className="text-xl font-semibold text-slate-900">Share Your Feedback</h2>
          </div>
          <FeedbackForm />
        </div>
      </section>

      {/* Footer Teaser (page-level) */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-center">
          <p className="text-slate-800 font-semibold">WealthNest</p>
          <p className="text-slate-600">Where your investments take flight.</p>
          <p className="mt-2 text-xs text-slate-400">© 2025 WealthNest</p>
        </div>
      </section>
    </main>
  );
}

// --- Small Components ---
function HighlightCard({ title, desc, cta, to, iconBg, icon = "📈" }: { title: string; desc: string; cta: string; to: string; iconBg: string; icon?: string }) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:border-sky-300 hover:-translate-y-1 transition-all duration-200">
      <div className={`w-12 h-12 rounded-xl ${iconBg} mb-4 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-200`}>
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
      <Link to={to} className="inline-flex mt-5 items-center text-sky-600 hover:text-sky-700 text-sm font-medium group/link">
        {cta}
        <span className="ml-1 group-hover/link:translate-x-1 transition-transform">→</span>
      </Link>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="text-sm">
      <span className="text-slate-600">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
        type="number"
        value={value}
        min={0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function FAQ({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-lg bg-sky-600 text-white overflow-hidden transition-all duration-200 ${open ? 'shadow-lg' : 'shadow-sm'}`}>
      <button
        className="w-full text-left flex items-start justify-between gap-4 px-4 py-3 hover:bg-sky-700 transition-colors focus:outline-none"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <span className="font-medium text-white flex-1">{item.q}</span>
        <span className="text-white/80 text-lg font-bold min-w-[20px] text-center transition-transform duration-200">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-sm text-white/90 leading-relaxed animate-fade-in">
          {item.a}
        </div>
      )}
    </div>
  );
}

function FeedbackForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Please enter your feedback message');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send feedback');
      }

      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      
      // Reset success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to send feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="feedback-name" className="block text-sm font-medium text-slate-700 mb-1">
            Name (Optional)
          </label>
          <input
            id="feedback-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="feedback-email" className="block text-sm font-medium text-slate-700 mb-1">
            Email (Optional)
          </label>
          <input
            id="feedback-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="your.email@example.com"
          />
        </div>
      </div>
      <div>
        <label htmlFor="feedback-message" className="block text-sm font-medium text-slate-700 mb-1">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="feedback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
          placeholder="Share your thoughts, suggestions, or report any issues..."
        />
      </div>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
          <p className="text-sm text-emerald-700">Thank you for your feedback! We'll get back to you soon.</p>
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="px-6 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition"
        >
          {submitting ? 'Sending...' : 'Send Feedback'}
        </button>
      </div>
    </form>
  );
}
 
