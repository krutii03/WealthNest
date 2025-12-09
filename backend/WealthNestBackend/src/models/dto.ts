export interface CreateOrderRequest {
  amount: number;
}

export interface CreateOrderResponse {
  id: string;
  amount: number;
  currency: string;
  key: string;
}

export interface VerifyPaymentDto {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  amount: number;
  userId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  transactionId?: string;
}

export interface WithdrawRequest {
  amount: number;
  userId: string;
}

export interface WalletResponse {
  wallet_id: string;
  user_id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

export interface LedgerEntryDto {
  userId: string;
  transactionId: string;
  walletId: string;
  entryType: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  fundAccountBalance: number;
}

