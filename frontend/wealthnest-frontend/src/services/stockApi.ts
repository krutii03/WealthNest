import axios from 'axios';
// In development, use relative path (handled by Vite proxy)
// In production, use VITE_API_URL or fallback to relative path
const API_BASE_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || '') 
  : '';
interface StockQuote {
  price: number;
  change: number;
  change_percent: number;
  history?: Array<{
    date: string;
    price: number;
  }>;
}

export interface StockSymbol {
  symbol: string;
  displaySymbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface PaginatedResponse<T> {
  page: number;
  pageSize: number;
  total: number;
  data: T[];
}

const api = axios.create({
  baseURL: API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(errorMessage));
  }
);

export const stockApi = {
  // Get stock prices for multiple symbols
  async getStockPrices(symbols: string[]): Promise<{ [key: string]: StockQuote }> {
    if (symbols.length === 0) return {};
    
    const response = await api.get('/td/quote', {
      params: { symbol: symbols.join(',') },
    });
    
    return response.data.data || {};
  },

  // Get paginated list of stocks
  async getStocks(
    page: number = 1,
    pageSize: number = 20,
    search: string = '',
    exchange: string = '',
    sort: string = ''
  ): Promise<PaginatedResponse<StockSymbol>> {
    const params: Record<string, any> = { page, pageSize };
    
    if (search) params.search = search;
    if (exchange) params.exchange = exchange;
    if (sort) params.sort = sort;
    
    const response = await api.get('/stocks', { params });
    return response.data;
  },

  // Get details for a single stock
  async getStockDetails(symbol: string): Promise<StockQuote> {
    const response = await api.get(`/stocks/${symbol}/details`);
    return response.data;
  },

  // Get available exchanges
  async getExchanges(): Promise<string[]> {
    // This is a placeholder - you might want to implement this on the backend
    // or fetch from a static list
    return ['NYSE', 'NASDAQ', 'XNSE', 'BSE', 'NSE'];
  }
};

export default stockApi;
