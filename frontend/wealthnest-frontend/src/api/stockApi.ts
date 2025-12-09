import { buildApiUrl } from './config';

// Helper function to get the auth token
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
}


// Centralized API request handler with auth and debug logging
async function handleApiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  console.log('[API] Making request to:', url);
  console.log('[API] Using token:', token ? 'Token exists' : 'No token found');
  if (token) {
    console.log('[API] Token starts with:', token.substring(0, 10) + '...');
  }

  // Log environment variables
  console.log('[API] Environment:', {
    NODE_ENV: import.meta.env.MODE,
    VITE_API_URL: import.meta.env.VITE_API_URL,
  });

  // Create headers with proper typing
  const headers = new Headers();
  headers.append('Accept', 'application/json');
  headers.append('Cache-Control', 'no-cache');
  
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  // Log the full request details
  console.log('[API] Full request URL:', url);
  console.log('[API] Request method:', options.method || 'GET');
  console.log('[API] Request headers (redacted):', {
    ...Object.fromEntries(headers.entries()),
    ...(token ? { 'Authorization': 'Bearer [REDACTED]' } : {})
  });

  // Merge any additional headers from options
  if (options.headers) {
    const incomingHeaders = new Headers(options.headers);
    incomingHeaders.forEach((value, key) => {
      if (value) headers.set(key, value);
    });
  }
  
  // Add a timestamp to track request timing
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' as const, // Ensure credentials are included for CORS
    });

    const endTime = Date.now();
    console.log(`[API] Request took ${endTime - startTime}ms`);

    console.log(`[API] Response status: ${response.status} ${response.statusText}`);
    console.log('[API] Response headers:', Object.fromEntries([...response.headers.entries()]));
    
    // Handle non-OK responses with detailed error information
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.clone().text();
        console.error('[API] Error response body:', errorData);
        console.error('[API] Response type:', response.type);
        console.error('[API] Response URL:', response.url);
        console.error('[API] Response redirected:', response.redirected);
        errorMessage += `: ${errorData}`;
      } catch (e) {
        console.error('[API] Could not parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    // For successful responses, try to parse as JSON
    try {
      const data = await response.json();
      console.log('[API] Response data:', data);
      return data as T;
    } catch (e) {
      const textResponse = await response.text();
      console.error('[API] Failed to parse response as JSON. Response:', textResponse);
      throw new Error(`Invalid JSON response from server: ${textResponse}`);
    }
  } catch (error) {
    console.error('[API] Request failed:', error);
    if (error instanceof Error) {
      console.error('[API] Error stack:', error.stack);
    }
    throw error; // Re-throw to be handled by the caller
  }
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  open: number;
  close: number;
  lastUpdated?: string;
}

interface StockHistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}


// Enhanced test function to diagnose 403 Forbidden errors
export async function testAuth() {
  const testUrls = [
    buildApiUrl('Stocks/test-auth'),
    buildApiUrl('auth/check'),
    buildApiUrl('Stocks/prices?symbols=AAPL')
  ];

  console.log('[AUTH_DEBUG] Starting authentication tests...');
  
  for (const url of testUrls) {
    console.log(`\n[AUTH_DEBUG] Testing URL: ${url}`);
    
    // Test 1: No auth headers
    try {
      console.log('[AUTH_DEBUG] Test 1: No auth headers');
      const response1 = await fetch(url, {
        credentials: 'include'
      });
      console.log(`[AUTH_DEBUG] Status: ${response1.status} ${response1.statusText}`);
      console.log('[AUTH_DEBUG] Headers:', Object.fromEntries([...response1.headers.entries()]));
      try {
        console.log('[AUTH_DEBUG] Response:', await response1.text());
      } catch {}
    } catch (error) {
      console.error('[AUTH_DEBUG] Test 1 failed:', error);
    }

    // Test 2: With auth token if available
    const token = getAuthToken();
    if (token) {
      try {
        console.log('\n[AUTH_DEBUG] Test 2: With auth token');
        const response2 = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          credentials: 'include'
        });
        console.log(`[AUTH_DEBUG] Status: ${response2.status} ${response2.statusText}`);
        console.log('[AUTH_DEBUG] Headers:', Object.fromEntries([...response2.headers.entries()]));
        try {
          console.log('[AUTH_DEBUG] Response:', await response2.text());
        } catch {}
      } catch (error) {
        console.error('[AUTH_DEBUG] Test 2 failed:', error);
      }
    }
  }
}

export const stockApi = {
  /**
   * Fetches a single stock quote by symbol
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    if (!symbol) throw new Error('Symbol is required');
    const url = buildApiUrl(`Stocks/quote?symbol=${encodeURIComponent(symbol)}`);
    return handleApiRequest<StockQuote>(url, { method: 'GET' });
  },

  /**
   * Fetches multiple stock quotes in a single request
   */
  async getStockQuotes(symbols: string[]): Promise<StockQuote[]> {
    if (!Array.isArray(symbols) || symbols.length === 0) return [];
    const url = buildApiUrl(`Stocks/prices?symbols=${encodeURIComponent(symbols.join(','))}`);
    return handleApiRequest<StockQuote[]>(url, { method: 'GET' });
  },

  /**
   * Fetches historical stock data
   */
  async getStockHistory(
    symbol: string,
    interval: string = '1d',
    outputSize: number = 30
  ): Promise<StockHistoryPoint[]> {
    if (!symbol) throw new Error('Symbol is required');
    const url = buildApiUrl(
      `Stocks/history?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&outputSize=${outputSize}`
    );
    return handleApiRequest<StockHistoryPoint[]>(url, { method: 'GET' });
  },

  /**
   * Searches for stocks by symbol or name
   */
  async searchStocks(query: string): Promise<Array<{ symbol: string; name: string }>> {
    if (!query || query.trim().length < 2) return [];
    const url = buildApiUrl(`Stocks/search?query=${encodeURIComponent(query)}`);
    return handleApiRequest<Array<{ symbol: string; name: string }>>(url, { method: 'GET' });
  }
};

export default stockApi;