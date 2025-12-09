// /Users/xyz/Desktop/WealthNest/frontend/wealthnest-frontend/src/services/portfolioService.ts
import { supabase } from '../lib/supabaseClient';

// Base API URL - in development, use relative path (handled by Vite proxy)
// In production, use VITE_API_URL or fallback to relative path
const API_BASE_URL = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || '') 
  : '';

// Types
type Holding = {
  id: string;
  assetId: string;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  value: number;
  change: number;
  changePercent: number;
};

type TradeData = {
  userId: string;
  assetId: string;
  symbol: string;
  quantity: number;
  price: number;
  type: 'buy' | 'sell';
};

export type { Holding, TradeData };


// /frontend/wealthnest-frontend/src/services/portfolioService.ts

export const fetchUserHoldings = async (): Promise<Holding[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the user's portfolio - use maybeSingle to handle no portfolio gracefully
    const { data: portfolioData, error: portfolioError } = await supabase
      .from('portfolios')
      .select('portfolio_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (portfolioError) {
      console.error('Error fetching portfolio:', portfolioError);
      return [];
    }
    
    if (!portfolioData) {
      // No portfolio exists - return empty array
      return [];
    }

    // Get the holdings for that portfolio
    const { data: holdingsData, error: holdingsError } = await supabase
      .from('portfolio_holdings')
      .select(`
        holding_id,
        portfolio_id,
        asset_id,
        quantity,
        average_price,
        asset:assets (
          asset_id,
          symbol,
          name,
          current_price
        )
      `)
      .eq('portfolio_id', portfolioData.portfolio_id);

    if (holdingsError) {
      console.error('Error fetching holdings:', holdingsError);
      throw holdingsError;
    }

    return (holdingsData || []).map((holding: any) => ({
      id: holding.holding_id,
      assetId: holding.asset_id,
      symbol: holding.asset?.symbol || '',
      name: holding.asset?.name || 'Unknown Asset',
      quantity: parseFloat(holding.quantity), // Convert from numeric to number
      averagePrice: parseFloat(holding.average_price), // Convert from numeric to number
      currentPrice: parseFloat(holding.asset?.current_price || '0'), // Convert from numeric to number
      value: parseFloat(holding.quantity) * parseFloat(holding.asset?.current_price || '0'),
      change: 0,
      changePercent: 0
    }));
  } catch (error) {
    console.error('Error fetching user holdings:', error);
    throw error;
  }
};

export const executeTrade = async (tradeData: TradeData) => {
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('No active session. Please log in again.');
    }

    // Get the access token
    const token = session.access_token;
    if (!token) {
      throw new Error('No access token found');
    }

    // Call the correct API endpoint based on trade type
    // In development, use relative path which will be proxied by Vite to http://localhost:3001
    // In production, use full URL
    const tradeType = tradeData.type === 'buy' ? 'buy' : 'sell';
    
    // Construct endpoint - if API_BASE_URL is set, use it, otherwise use relative path
    let endpoint: string;
    if (API_BASE_URL) {
      // Production mode - use full URL
      endpoint = `${API_BASE_URL.replace(/\/$/, '')}/api/portfolio/stocktrading/${tradeType}`;
    } else {
      // Development mode - use relative path (proxied by Vite)
      endpoint = `/api/portfolio/stocktrading/${tradeType}`;
    }
    
    console.log('[Trade] API_BASE_URL:', API_BASE_URL);
    console.log('[Trade] Final endpoint:', endpoint);
    console.log('[Trade] Request payload:', {
      symbol: tradeData.symbol,
      quantity: tradeData.quantity,
      type: tradeData.type
    });

    // Make the request with proper headers
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        symbol: tradeData.symbol,
        quantity: tradeData.quantity
      })
    });

    const responseData = await response.text();
    console.log('[Trade] Response status:', response.status);
    console.log('[Trade] Response URL:', response.url);
    console.log('[Trade] Response data:', responseData);
    
    if (!response.ok) {
      let errorMessage = `Trade execution failed with status ${response.status}`;
      
      // More detailed error for 404
      if (response.status === 404) {
        errorMessage = `Endpoint not found. Please check:\n- Backend server is running on port 3001\n- Endpoint: ${endpoint}\n- Route: /api/portfolio/stocktrading/${tradeType}`;
      }
      
      try {
        const errorData = JSON.parse(responseData);
        errorMessage = errorData.error || errorData.message || errorData.title || errorMessage;
      } catch (e) {
        if (responseData) {
          errorMessage += `: ${responseData}`;
        }
      }
      throw new Error(errorMessage);
    }

    return responseData ? JSON.parse(responseData) : {};
  } catch (error) {
    console.error('Trade execution failed:', error);
    throw error;
  }
};

export const getAssetPrice = async (symbol: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('current_price')
      .eq('symbol', symbol)
      .single();

    if (error) throw error;
    return data?.current_price || 0;
  } catch (error) {
    console.error('Error fetching asset price:', error);
    throw error;
  }
};