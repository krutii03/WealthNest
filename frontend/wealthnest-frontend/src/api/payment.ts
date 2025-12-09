const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001');

import { supabase } from '../lib/supabaseClient';

export interface CreateOrderResponse {
  id: string;
  amount: number;
  currency: string;
  key: string;
}

export interface VerifyPaymentPayload {
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

export interface WithdrawResponse {
  success: boolean;
  wallet: {
    wallet_id: string;
    user_id: string;
    balance: number;
    currency: string;
    updated_at: string;
  };
  transactionId: string;
  message: string;
}

/**
 * Create a Razorpay order
 */
export async function createOrder(amount: number): Promise<CreateOrderResponse> {
  const response = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create order');
  }

  return response.json();
}

export async function verifyPayment(payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/payment/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Payment verification failed');
  }

  return response.json();
}

export async function withdraw(amount: number, userId: string): Promise<WithdrawResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/wallet/withdraw`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ amount, userId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Withdrawal failed' }));
    throw new Error(error.error || 'Withdrawal failed');
  }

  return response.json();
}

export async function getWallet(userId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/wallet/${userId}`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get wallet' }));
    throw new Error(error.error || 'Failed to get wallet');
  }

  return response.json();
}

