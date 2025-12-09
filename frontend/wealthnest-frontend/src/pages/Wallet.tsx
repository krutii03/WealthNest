import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Wallet, Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import Modal from '../components/Modal';
import { createOrder, verifyPayment, withdraw } from '../api/payment';
import { getWallet as getWalletFromUtils } from '../utils/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Load Razorpay script dynamically
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window.Razorpay !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.head.appendChild(script);
  });
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [tx, setTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState<number>(100);
  const [depositSuccessOpen, setDepositSuccessOpen] = useState(false);
  const [depositSuccessAmount, setDepositSuccessAmount] = useState<number>(0);
  const [depositFailedOpen, setDepositFailedOpen] = useState(false);
  const [depositFailedAmount, setDepositFailedAmount] = useState<number>(0);
  const [paymentAttempted, setPaymentAttempted] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          console.warn('No session found');
          return;
        }

        const userId = sessionData.session.user.id;

        try {
          const walletData = await getWalletFromUtils();
          setWallet({
            wallet_id: 0,
            user_id: userId,
            balance: walletData.balance || 0,
            currency: walletData.currency || 'INR'
          } as Wallet);
        } catch (walletError: any) {
          console.warn('Error fetching wallet from API:', walletError);
          setWallet({ 
            wallet_id: 0, 
            user_id: userId as any,
            balance: 0, 
            currency: 'INR' 
          } as any);
        }

        try {
          const email = sessionData.session.user.email ?? '';
          if (email) {
            const { data: userRow } = await supabase.from('users').select('user_id').eq('email', email).maybeSingle();
            const userIdInt = (userRow as any)?.user_id;
            if (userIdInt !== undefined && userIdInt !== null) {
              try {
                const { data: txData } = await supabase
                  .from('transactions')
                  .select('*')
                  .eq('user_id', userIdInt as any)
                  .order('created_at', { ascending: false })
                  .limit(10);
                setTx((txData as any) || []);
              } catch (txError: any) {
                console.warn('Error loading transactions (non-critical):', txError);
                setTx([]);
              }
            }
          }
        } catch (e: any) {
          console.warn('Error in transaction loading (non-critical):', e);
          setTx([]);
        }
      } catch (e: any) {
        console.error('Failed to load wallet:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const showToast = (msg: string) => {
    if (msg.includes('Card number copied') || msg.includes('Failed to copy')) {
    setToast(msg);
      setTimeout(() => setToast(null), 3000);
    } else {
      console.log('Toast suppressed:', msg);
    }
  };

  const refreshWallet = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.warn('No session found when refreshing wallet');
        return;
      }

      const userId = sessionData.session.user.id;
      console.log('Fetching wallet for user:', userId);
      
      const walletData = await getWalletFromUtils();
      console.log('Wallet data received:', walletData);
      
      setWallet(prevWallet => {
        const newWallet = {
          wallet_id: prevWallet?.wallet_id || 0,
          user_id: userId,
        balance: walletData.balance || 0,
          currency: walletData.currency || 'INR',
          updated_at: prevWallet?.updated_at || new Date()
        } as Wallet;
        console.log('Wallet state updated - New balance:', newWallet.balance);
        return newWallet;
      });
    } catch (error: any) {
      console.error('Error refreshing wallet:', error);
      // Don't throw - just log the error so UI doesn't break
    }
  };

  const confirmDeposit = async () => {
    try {
      console.log('[Deposit] Starting deposit flow...');
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No session');
      }
      
      const amt = Math.max(0, Number(amount) || 0);
      console.log('[Deposit] Amount:', amt);
      if (amt < 100) {
        alert('Minimum deposit amount is ₹100');
        return;
      }
      
      const userId = sessionData.session.user.id;
      console.log('[Deposit] User ID:', userId);

      console.log('[Deposit] Creating order for amount:', amt);
      const order = await createOrder(amt);
      console.log('[Deposit] Order created:', order);

      if (!order.key) {
        throw new Error('Razorpay key ID not returned from server. Please configure RAZORPAY_KEY_ID in backend.');
      }

      setPaymentAttempted(true);
      setDepositFailedAmount(amt);

      console.log('[Deposit] Opening Razorpay modal with options:', {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
      });

      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'WealthNest',
        description: `Deposit ₹${amt.toLocaleString('en-IN')}`,
        order_id: order.id,
        config: {
          display: {
            blocks: {
              banks: {
                name: 'All payment methods',
                instruments: [
                  {
                    method: 'card'
                  },
                  {
                    method: 'netbanking'
                  },
                  {
                    method: 'upi'
                  }
                ]
              }
            },
            sequence: ['block.banks'],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        handler: async function (response: any) {
          console.log('🎉 [Handler] Payment handler called!');
          console.log('[Handler] Response:', response);
          try {
            console.log('[Handler] Verifying payment with backend...');
            const verifyResult = await verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              amount: amt,
              userId: userId,
            });
            console.log('[Handler] Verification result:', verifyResult);

            if (verifyResult.success) {
              console.log('✅ [Handler] Payment verified successfully, amount:', amt);
              setDepositOpen(false);
              setDepositSuccessAmount(amt);
              setAmount(100);
              
              console.log('🔄 Refreshing wallet...');
              try {
                await refreshWallet();
                console.log('✅ Wallet refreshed');
              } catch (refreshError) {
                console.error('❌ Error refreshing wallet:', refreshError);
              }
              
              console.log('🎉 Showing success modal');
              setDepositSuccessOpen(true);
              
              setTimeout(async () => {
                console.log('🔄 Refreshing wallet again...');
                try {
                  await refreshWallet();
                  console.log('✅ Wallet refreshed again');
                } catch (refreshError) {
                  console.error('❌ Error refreshing wallet again:', refreshError);
                }
              }, 1500);
            } else {
              throw new Error(verifyResult.message || 'Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            setPaymentAttempted(false);
            if (paymentAttempted) {
              setDepositFailedOpen(true);
            }
          }
        },
        prefill: {
          name: sessionData.session.user.user_metadata?.full_name || sessionData.session.user.email || '',
          email: sessionData.session.user.email || '',
          contact: '+919512463334'
        },
        callback_url: 'http://localhost:3000/wallet',
        redirect: false,
        theme: {
          color: '#14b8a6',
        },
        notes: {
          test_mode: 'true',
          note: 'Use test card: 4111 1111 1111 1111 for successful payment'
        },
        modal: {
          ondismiss: async function () {
            console.log('[Modal] Payment modal dismissed');
            console.log('[Modal] Payment attempted?', paymentAttempted);
            
            // Check if there's a successful payment in the order
            // by checking the backend order status
            try {
              console.log('[Modal] Checking order status on backend...');
              const checkResponse = await fetch(`http://localhost:3001/api/wallet/balance`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                  'Content-Type': 'application/json'
                },
                credentials: 'include'
              });
              
              if (checkResponse.ok) {
                const balanceData = await checkResponse.json();
                console.log('[Modal] Current balance:', balanceData.balance);
                
                // Refresh wallet to see if balance changed
                await refreshWallet();
                
                // If payment was attempted and modal dismissed, might have succeeded
                // Check Razorpay dashboard or wait for webhook
                if (paymentAttempted) {
                  console.log('[Modal] Payment was attempted, check dashboard for status');
                  // Give it a moment, then refresh again
                  setTimeout(async () => {
                    await refreshWallet();
                  }, 2000);
                }
              }
            } catch (error) {
              console.error('[Modal] Error checking status:', error);
            }
            
            if (paymentAttempted) {
              console.log('[Modal] Payment failed or cancelled');
              setPaymentAttempted(false);
            }
          },
          escape: true,
          animation: true,
        },
      };

      console.log('[Deposit] Loading Razorpay SDK...');
      
      // Load Razorpay script dynamically
      try {
        await loadRazorpayScript();
        console.log('[Deposit] Razorpay SDK loaded successfully');
      } catch (error) {
        console.error('[Deposit] Failed to load Razorpay SDK:', error);
        throw new Error('Failed to load payment gateway. Please check your internet connection and try again.');
      }
      
      console.log('[Deposit] Initializing Razorpay...');
      console.log('[Deposit] Razorpay object available?', typeof window.Razorpay);
      
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay SDK not loaded. Please refresh the page.');
      }
      
      const razorpay = new window.Razorpay(options);
      console.log('[Deposit] Razorpay instance created');
      
      razorpay.on('payment.failed', function (response: any) {
        console.error('❌ Payment failed event triggered');
        console.error('Error details:', JSON.stringify(response.error, null, 2));
        console.error('Error code:', response.error?.code);
        console.error('Error description:', response.error?.description);
        console.error('Error source:', response.error?.source);
        console.error('Error reason:', response.error?.reason);
        setPaymentAttempted(false);
        setDepositFailedOpen(true);
      });
      
      console.log('[Deposit] Opening Razorpay modal...');
      razorpay.open();
    } catch (e: any) {
      console.error('[Deposit] ❌ Error:', e);
      alert(`Deposit error: ${e.message}`);
      setPaymentAttempted(false);
      setDepositFailedOpen(true);
    }
  };

  const confirmWithdraw = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No session');
      }
      
      const amt = Math.max(0, Number(amount) || 0);
      if (amt <= 0) {
        console.warn('Invalid amount entered:', amount);
        return;
      }
      
      const userId = sessionData.session.user.id;

      await withdraw(amt, userId);
      
      setWithdrawOpen(false);
      setAmount(100);
      await refreshWallet();
    } catch (e: any) {
      console.error('Withdraw error:', e);
    }
  };

  const movementSummary = useMemo(() => {
    const dep = tx.filter(t => t.transaction_type === 'deposit').reduce((s, t) => s + (t.amount ?? 0), 0);
    const wit = tx.filter(t => t.transaction_type === 'withdraw').reduce((s, t) => s + (t.amount ?? 0), 0);
    const total = dep + wit || 1;
    return { depPct: Math.round((dep / total) * 100), witPct: Math.round((wit / total) * 100) };
  }, [tx]);

  return (
    <div className="container max-w-7xl mx-auto px-6 py-6 grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <section className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-white via-white to-teal-50 opacity-70" />
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Wallet</h2>
              {loading ? (
                <div className="mt-2 h-6 w-40 bg-slate-100 animate-pulse rounded" />
              ) : wallet ? (
                <>
                  <div className="text-3xl font-semibold text-slate-900 mt-1">{formatCurrency(wallet.balance, wallet.currency)}</div>
                  <div className="text-xs text-slate-500 mt-1">Currency: {wallet.currency} • Last updated: {new Date().toLocaleString()}</div>
                </>
              ) : (
                <div className="text-sm text-slate-600 mt-2">No wallet found</div>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDepositOpen(true)} className="rounded-lg px-4 py-2 text-sm font-medium bg-teal-500 text-white hover:bg-teal-600 focus:ring-2 focus:ring-teal-500">Add Money</button>
              <button type="button" onClick={() => setWithdrawOpen(true)} className="rounded-lg px-4 py-2 text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 focus:ring-2 focus:ring-teal-500">Withdraw</button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
          </div>
          {loading ? (
            <div className="space-y-2 mt-2">
              <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
            </div>
          ) : tx.length === 0 ? (
            <p className="text-sm text-slate-600 mt-2">No transactions yet — add funds to get started!</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b">
                    <th className="text-left py-2">Date & Time</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-right py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tx.slice(0, 10).map((t, i) => (
                    <tr key={i}>
                      <td className="py-2 text-slate-700">{new Date(t.created_at ?? '').toLocaleString()}</td>
                      <td className="py-2 text-slate-800 capitalize">{t.transaction_type}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(t.amount ?? 0, wallet?.currency ?? 'INR')}</td>
                      <td className="py-2 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full ring-1 ${
                          t.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : t.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 ring-amber-200'
                            : 'bg-rose-50 text-rose-700 ring-rose-200'
                        }`}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Funds Movement Summary</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-600"><span>Deposits</span><span>{movementSummary.depPct}%</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-2 bg-teal-500" style={{width: `${movementSummary.depPct}%`}}/></div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-600"><span>Withdrawals</span><span>{movementSummary.witPct}%</span></div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-2 bg-slate-400" style={{width: `${movementSummary.witPct}%`}}/></div>
            </div>
          </div>
        </section>
      </div>

      <Modal open={depositOpen} title="Add Money" onClose={() => setDepositOpen(false)}>
        <div className="space-y-3">
          <label className="block text-sm text-slate-700">
            Amount (INR)
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(Number(e.target.value))} 
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500" 
              min="100"
            />
            <p className="text-xs text-slate-500 mt-1">Minimum deposit: ₹100</p>
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDepositOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium border border-slate-200 hover:shadow">Cancel</button>
            <button type="button" onClick={confirmDeposit} className="rounded-lg px-3 py-2 text-sm font-medium bg-teal-500 text-white hover:bg-teal-600">Proceed to Payment</button>
          </div>
        </div>
      </Modal>

      <Modal open={withdrawOpen} title="Withdraw Money" onClose={() => setWithdrawOpen(false)}>
        <div className="space-y-3">
          <label className="block text-sm text-slate-700">
            Amount (INR)
            <input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(Number(e.target.value))} 
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500" 
              min="1"
            />
            <p className="text-xs text-slate-500 mt-1">Minimum withdrawal: ₹1</p>
          </label>
          {wallet && (
            <p className="text-xs text-slate-500">
              Available balance: {formatCurrency(wallet.balance, wallet.currency)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setWithdrawOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium border border-slate-200 hover:shadow">Cancel</button>
            <button type="button" onClick={confirmWithdraw} className="rounded-lg px-3 py-2 text-sm font-medium bg-slate-700 text-white hover:bg-slate-800">Withdraw</button>
          </div>
        </div>
      </Modal>

      {depositSuccessOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300"
          role="dialog" 
          aria-modal="true" 
          aria-label="Deposit Successful"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDepositSuccessOpen(false);
              setAmount(100);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 animate-in zoom-in duration-300">
          <div className="flex flex-col items-center px-6 pt-8 pb-6">
            <div className="relative mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {/* Animated ring */}
              <div className="absolute inset-0 w-20 h-20 bg-green-100 rounded-full animate-ping opacity-20"></div>
            </div>
            
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h3>
            <p className="text-slate-600 text-center mb-6">
              Your deposit has been processed successfully
            </p>
            
            <div className="w-full bg-slate-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Amount Deposited</span>
                <span className="text-xl font-bold text-teal-600">
                  ₹{depositSuccessAmount.toLocaleString('en-IN')}
                </span>
              </div>
              {wallet && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-sm text-slate-600">New Balance</span>
                  <span className="text-lg font-semibold text-slate-900">
                    {formatCurrency(wallet.balance, wallet.currency)}
                  </span>
                </div>
              )}
            </div>
            
            <button
              onClick={() => {
                setDepositSuccessOpen(false);
                setAmount(100);
              }}
              className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              Done
            </button>
          </div>
          </div>
        </div>
      )}

      {depositFailedOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300"
          role="dialog" 
          aria-modal="true" 
          aria-label="Payment Failed"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDepositFailedOpen(false);
              setAmount(100);
              setPaymentAttempted(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 animate-in zoom-in duration-300">
            <div className="flex flex-col items-center px-6 pt-8 pb-6">
              <div className="relative mb-4">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Payment Failed</h3>
              <p className="text-slate-600 text-center mb-6">
                Your payment could not be processed. Please try again.
              </p>
              
              <div className="w-full bg-slate-50 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Attempted Amount</span>
                  <span className="text-xl font-bold text-slate-700">
                    ₹{depositFailedAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              
              <div className="w-full flex gap-2">
                <button
                  onClick={() => {
                    setDepositFailedOpen(false);
                    setAmount(100);
                    setPaymentAttempted(false);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setDepositFailedOpen(false);
                    setPaymentAttempted(false);
                    setDepositOpen(true);
                  }}
                  className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white text-slate-800 border border-slate-200 shadow-md rounded-lg px-4 py-2 z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
