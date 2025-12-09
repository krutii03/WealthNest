import { supabase } from '../lib/supabaseClient';

// In development, use relative path (handled by Vite proxy)
// In production, use VITE_API_URL or fallback to relative path
const API_BASE = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || '') 
  : '';

async function withAuthHeaders(init?: RequestInit): Promise<RequestInit> {
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token;
  const headers = new Headers(init?.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  
  // Merge cache headers if provided (don't override)
  if (init?.headers) {
    const existingHeaders = new Headers(init.headers);
    existingHeaders.forEach((value, key) => {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    });
  }
  
  return { ...init, headers, credentials: 'include' as RequestCredentials };
}

export async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  // Ensure path starts with /api if using relative paths (unless it already starts with /api)
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const apiPath = cleanPath.startsWith('/api') ? cleanPath : `/api${cleanPath}`;
  const url = API_BASE ? `${API_BASE}${apiPath}` : apiPath;
  
  const req = await withAuthHeaders({
    ...init,
    // Add cache-busting for GET requests to ensure fresh data
    cache: init?.method === 'GET' ? 'no-cache' : init?.cache,
    headers: {
      ...init?.headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  
  const res = await fetch(url, req);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  // Try JSON parse, fallback to text
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export async function getMe() {
  return apiFetch<{ claims: Record<string, string[]> }>('/auth/me');
}

export async function getPortfolio() {
  return apiFetch('/portfolio');
}

export type MarketBuzzItem = {
  title: string;
  source: string;
  sentiment?: string;
  time: string;
  url?: string;
};

export async function getMarketBuzz() {
  try {
    const response = await fetch('/api/market/buzz');
    if (!response.ok) {
      throw new Error('Failed to fetch market buzz');
    }
    const data = await response.json();
    return { items: data.items || [] };
  } catch (error: any) {
    console.error('Error fetching market buzz:', error);
    throw error;
  }
}

export type WordOfTheDay = {
  term: string;
  definition: string;
  example?: string;
  category?: string;
};

export async function getWordOfTheDay() {
  try {
    const response = await fetch('/api/market/word-of-the-day');
    if (!response.ok) {
      throw new Error('Failed to fetch word of the day');
    }
    const data = await response.json();
    // Normalize the response: use 'term' if available, fallback to 'word'
    return {
      term: data.term || data.word || 'Financial Term',
      definition: data.definition || '',
      example: data.example,
      category: data.category
    };
  } catch (error: any) {
    console.error('Error fetching word of the day:', error);
    throw error;
  }
}

// Get portfolio summary
export async function getPortfolioSummary() {
  return apiFetch<Array<{
    id: string;
    quantity: number;
    average_price: number;
    asset: {
      symbol: string;
      name: string;
      current_price: number;
      change_percent: number;
    };
  }>>('/api/portfolio');
}
// Get wallet details
export async function getWallet() {
  return apiFetch<{
    balance: number;
    currency: string;
  }>('/api/wallet/balance');
}

// Since there's no transactions endpoint, we'll use the portfolio data
export async function getRecentTransactions(limit = 10) {
  return apiFetch<Array<{
    id: string;
    symbol: string;
    quantity: number;
    price: number;
    type: 'buy' | 'sell';
    created_at: string;
  }>>('/api/portfolio/stocktrading/history'); // This endpoint needs to be created
}

// Get dashboard data by combining multiple API calls
export async function getDashboardAggregate() {
  try {
    const [holdings, wallet, transactions] = await Promise.all([
      getPortfolioSummary().catch(e => {
        console.error('Error fetching portfolio summary:', e);
        return [];
      }),
      getWallet().catch(e => {
        console.error('Error fetching wallet:', e);
        return { balance: 0, currency: 'INR' };
      }),
      getRecentTransactions(5).catch(e => {
        console.error('Error fetching transactions:', e);
        return [];
      })
    ]);

    // Calculate portfolio metrics
    const portfolioValue = holdings.reduce((sum, holding) => {
      return sum + (holding.asset.current_price * holding.quantity);
    }, 0);

    const portfolioChange = holdings.length > 0 
      ? holdings.reduce((sum, holding) => sum + (holding.asset.change_percent || 0), 0) / holdings.length
      : 0;

    return {
      portfolio_total: portfolioValue,
      wallet_balance: wallet?.balance || 0,
      portfolio_change_24h_pct: portfolioChange,
      top_holdings: holdings.slice(0, 5).map(holding => ({
        symbol: holding.asset.symbol,
        name: holding.asset.name,
        qty: holding.quantity,
        market_value: holding.asset.current_price * holding.quantity,
        pl_pct: holding.asset.change_percent || 0
      })),
      recent_transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        symbol: t.symbol,
        amount: t.quantity * t.price,
        price: t.price,
        created_at: t.created_at
      }))
    };
  } catch (error) {
    console.error('Error in getDashboardAggregate:', error);
    throw error;
  }
}

// Get market buzz (if available)
export async function getMarketBuzzCached() {
  try {
    // Fallback to static data if the endpoint doesn't exist
    return {
      freshness_sec: 3600,
      headlines: [],
      word: { term: 'Bull Market', definition: 'A market condition where prices are rising or expected to rise.' }
    };
  } catch (error) {
    console.warn('Market buzz endpoint not available, using fallback data');
    return {
      freshness_sec: 3600,
      headlines: [],
      word: { term: 'Bull Market', definition: 'A market condition where prices are rising or expected to rise.' }
    };
  }
}
