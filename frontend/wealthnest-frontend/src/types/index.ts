// Global domain types for WealthNest
export interface UserProfile {
  user_id: string; // maps to auth.user.id
  name?: string | null;
  email: string;
  phone?: string | null;
  birthdate?: string | null; // ISO date
  address?: string | null;
  photo_url?: string | null;
  created_at?: string;
  status?: 'active' | 'banned';
}

export interface Wallet {
  wallet_id: number;
  user_id: string;
  balance: number;
  currency: string; // e.g., INR, USD
  updated_at?: string;
}

export type AssetType = 'stock' | 'mutual_fund' | 'bond' | 'crypto';
export interface Asset {
  asset_id: number;
  asset_type: AssetType;
  symbol: string;
  name: string;
  current_price: number;
  updated_at?: string;
}

export interface Portfolio {
  portfolio_id: number;
  user_id: string;
  created_at?: string;
  last_updated?: string;
}

export interface Holding {
  holding_id: number;
  portfolio_id: number;
  asset_id: number;
  quantity: number;
  average_price: number;
  created_at?: string;
  asset?: Asset; // joined asset (optional)
}

export type TransactionType = 'buy' | 'sell' | 'deposit' | 'withdraw';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export interface Transaction {
  transaction_id: number;
  user_id: string;
  wallet_id: number;
  asset_id?: number | null;
  transaction_type: TransactionType;
  amount: number;
  quantity?: number | null;
  status: TransactionStatus;
  created_at?: string;
}

export interface PaymentMethod {
  method_id: number;
  user_id: string;
  type: 'card' | 'UPI' | 'bank';
  masked_details: string;
  created_at?: string;
}

export interface Achievement {
  achievement_id: number;
  title: string;
  description: string;
  points: number;
}

export interface UserAchievement {
  user_achievement_id: number;
  user_id: string;
  achievement_id: number;
  earned_at?: string;
  achievement?: Achievement; // joined
}

export interface LeaderboardEntry {
  leaderboard_id: number;
  user_id: string;
  points_total: number;
  rank: number;
  badge?: string | null;
  user?: UserProfile; // joined
}
