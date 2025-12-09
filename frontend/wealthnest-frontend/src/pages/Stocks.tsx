import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import BuyModal from '../components/BuyModal';
import PINModal from '../components/PINModal';
import InsufficientBalanceModal from '../components/InsufficientBalanceModal';
import SuccessModal from '../components/SuccessModal';
import { executeTrade, fetchUserHoldings } from '../services/portfolioService';
import { formatCurrency } from '../utils/currency';
import { apiFetch } from '../utils/api';
import type { Asset, Wallet } from '../types';

interface Stock extends Asset {
  asset_id?: number;
}

interface UserHolding {
  symbol: string;
  quantity: number;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [holdings, setHoldings] = useState<Map<string, UserHolding>>(new Map());
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isSellMode, setIsSellMode] = useState(false);
  const [trading, setTrading] = useState<string | null>(null); // Track which stock is being traded
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPINModalOpen, setIsPINModalOpen] = useState(false);
  const [pendingTrade, setPendingTrade] = useState<{ quantity: number } | null>(null);
  const [insufficientBalanceModal, setInsufficientBalanceModal] = useState<{
    open: boolean;
    requiredAmount: number;
    availableBalance: number;
    assetName?: string;
  }>({
    open: false,
    requiredAmount: 0,
    availableBalance: 0,
  });
  const [successModal, setSuccessModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    details?: any;
    transactionType?: 'buy' | 'sell';
  }>({
    open: false,
    title: '',
    message: '',
  });

  // Helper function to parse insufficient balance error
  const parseInsufficientBalanceError = (errorMessage: string): { required: number; available: number } | null => {
    // Try to extract JSON from error message if it contains JSON
    let messageToParse = errorMessage;
    try {
      // Check if error message contains JSON (e.g., "API 400: {...}")
      const jsonMatch = errorMessage.match(/\{.*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error) {
          messageToParse = parsed.error;
        }
      }
    } catch {
      // If JSON parsing fails, use original message
    }
    
    // Match patterns like "Required: ₹5,000, Available: ₹3,565.25" or "Required: ₹5000, Available: ₹3565.25"
    const requiredMatch = messageToParse.match(/Required:\s*₹?([\d,]+\.?\d*)/i);
    const availableMatch = messageToParse.match(/Available:\s*₹?([\d,]+\.?\d*)/i);
    
    if (requiredMatch && availableMatch) {
      const required = parseFloat(requiredMatch[1].replace(/,/g, ''));
      const available = parseFloat(availableMatch[1].replace(/,/g, ''));
      if (!isNaN(required) && !isNaN(available)) {
        return { required, available };
      }
    }
    return null;
  };

  // Fetch stocks list - refresh every 2 minutes to get updated prices
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        setError(null);
        
        const response = await fetch('/api/assets');
        if (!response.ok) {
          throw new Error('Failed to fetch stocks');
        }
        
        const data = await response.json();
        // Filter only stocks (not mutual funds)
        // If asset_type is not present, assume all are stocks (backward compatibility)
        const stocksOnly = (data || []).filter((asset: Stock) => 
          !asset.asset_type || asset.asset_type === 'stock'
        );
        setStocks(stocksOnly);
        setLoading(false); // Always set loading to false after fetch completes
      } catch (err: any) {
        console.error('Error fetching stocks:', err);
        setError(err.message || 'Failed to load stocks');
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStocks();
    
    // Refresh every 2 minutes (120000ms) to get updated prices
    const interval = setInterval(fetchStocks, 120000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user holdings and wallet
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch wallet
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            const walletResponse = await fetch('/api/wallet/balance', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Accept': 'application/json',
              },
            });
            
            if (walletResponse.ok) {
              const walletData = await walletResponse.json();
              // Only set wallet if we have actual data (not fake defaults)
              if (walletData && typeof walletData.balance === 'number') {
                setWallet(walletData);
              } else {
                console.warn('Invalid wallet data received:', walletData);
                setWallet(null);
              }
            } else {
              // If API returns error, wallet might not exist yet
              console.warn('Failed to fetch wallet:', walletResponse.status);
              setWallet(null);
            }
          } catch (walletError) {
            console.warn('Error fetching wallet (non-critical):', walletError);
            setWallet(null);
          }
        }

        // Fetch holdings
        try {
          const userHoldings = await fetchUserHoldings();
          const holdingsMap = new Map<string, UserHolding>();
          
          userHoldings.forEach(holding => {
            if (holding.symbol && holding.quantity > 0) {
              holdingsMap.set(holding.symbol.toUpperCase(), {
                symbol: holding.symbol,
                quantity: holding.quantity,
              });
            }
          });
          
          setHoldings(holdingsMap);
        } catch (holdingsError) {
          // If holdings fetch fails, just log and continue with empty holdings
          console.warn('Error fetching holdings:', holdingsError);
          setHoldings(new Map());
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleBuyClick = (stock: Stock) => {
    setSelectedStock(stock);
    setIsSellMode(false);
    setIsBuyModalOpen(true);
  };

  const handleSellClick = (stock: Stock) => {
    setSelectedStock(stock);
    setIsSellMode(true);
    setIsBuyModalOpen(true);
  };

  const handleTradeConfirm = async (quantity: number) => {
    if (!selectedStock) return;

    // Store the trade details and open PIN modal
    setPendingTrade({ quantity });
    setIsBuyModalOpen(false);
    setIsPINModalOpen(true);
  };

  const handlePINVerify = async (pin: string) => {
    if (!selectedStock || !pendingTrade) return;

    try {
      setTrading(selectedStock.symbol);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // Verify PIN
      const verifyResponse = await fetch('/api/auth/pin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ pin }),
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || 'PIN verification failed');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get current price
      const currentPrice = selectedStock.current_price || 0;

      const tradeData = {
        userId: user.id,
        assetId: selectedStock.asset_id?.toString() || '',
        symbol: selectedStock.symbol,
        quantity: pendingTrade.quantity,
        price: currentPrice,
        type: isSellMode ? 'sell' as const : 'buy' as const,
      };

      await executeTrade(tradeData);

      // Refresh holdings and wallet
      const userHoldings = await fetchUserHoldings();
      const holdingsMap = new Map<string, UserHolding>();
      
      userHoldings.forEach(holding => {
        if (holding.symbol && holding.quantity > 0) {
          holdingsMap.set(holding.symbol.toUpperCase(), {
            symbol: holding.symbol,
            quantity: holding.quantity,
          });
        }
      });
      
      setHoldings(holdingsMap);

      // Refresh wallet and get updated balance
      let updatedWalletBalance: number | undefined = undefined;
      if (session) {
        try {
          const walletResponse = await fetch('/api/wallet/balance', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Accept': 'application/json',
            },
          });
          
          if (walletResponse.ok) {
            const walletData = await walletResponse.json();
            // Only set wallet if we have actual data
            if (walletData && typeof walletData.balance === 'number') {
              setWallet(walletData);
              updatedWalletBalance = walletData.balance;
            }
          } else {
            console.warn('Failed to refresh wallet:', walletResponse.status);
          }
        } catch (walletError) {
          console.warn('Error refreshing wallet (non-critical):', walletError);
        }
      }

      // Update leaderboard points after trade
      try {
        const { updateLeaderboardPoints } = await import('../utils/leaderboard');
        // Fetch current holdings with asset prices to calculate portfolio value
        const { data: portfolios } = await supabase
          .from('portfolios')
          .select('portfolio_id')
          .eq('user_id', user.id);
        
        if (portfolios && portfolios.length > 0) {
          const portfolioIds = portfolios.map((p: any) => p.portfolio_id);
          const { data: holdingsData } = await supabase
            .from('portfolio_holdings')
            .select('quantity, asset:assets(current_price)')
            .in('portfolio_id', portfolioIds);
          
          const portfolioValue = (holdingsData || []).reduce((sum, h: any) => {
            const price = (h.asset as any)?.current_price || 0;
            return sum + (parseFloat(h.quantity) * parseFloat(price));
          }, 0);
          
          await updateLeaderboardPoints(user.id, portfolioValue);
        }
      } catch (lbError) {
        console.warn('Failed to update leaderboard points:', lbError);
        // Don't fail the trade if leaderboard update fails
      }

      setIsPINModalOpen(false);
      
      // Calculate transaction details
      const totalAmount = (selectedStock.current_price || 0) * pendingTrade.quantity;
      
      // Show success modal
      setSuccessModal({
        open: true,
        title: `${isSellMode ? 'Sale' : 'Purchase'} Successful!`,
        message: `Successfully ${isSellMode ? 'sold' : 'bought'} ${pendingTrade.quantity} share(s) of ${selectedStock.symbol}`,
        details: {
          assetName: selectedStock.name,
          assetSymbol: selectedStock.symbol,
          quantity: pendingTrade.quantity,
          amount: totalAmount,
          newBalance: updatedWalletBalance,
        },
        transactionType: isSellMode ? 'sell' : 'buy',
      });
      
      setSelectedStock(null);
      setPendingTrade(null);
    } catch (err: any) {
      console.error('Trade execution error:', err);
      const errorMessage = err?.message || '';
      
      // Check if it's an insufficient balance error
      const balanceInfo = parseInsufficientBalanceError(errorMessage);
      if (balanceInfo && selectedStock) {
        // Show insufficient balance modal instead of alert
        setInsufficientBalanceModal({
          open: true,
          requiredAmount: balanceInfo.required,
          availableBalance: balanceInfo.available,
          assetName: `${selectedStock.symbol} - ${selectedStock.name}`,
        });
      } else {
        // For other errors, show alert (can be upgraded to toast later)
        alert(`Trade failed: ${errorMessage || 'Unknown error'}`);
      }
    } finally {
      setTrading(null);
    }
  };

  const getHoldingQuantity = (symbol: string): number => {
    const holding = holdings.get(symbol.toUpperCase());
    return holding?.quantity || 0;
  };

  const hasStock = (symbol: string): boolean => {
    return getHoldingQuantity(symbol) > 0;
  };

  const formatChange = (changePercent: number | undefined) => {
    if (changePercent === undefined || changePercent === null) return 'N/A';
    const sign = changePercent >= 0 ? '+' : '';
    const color = changePercent >= 0 ? 'text-green-600' : 'text-red-600';
    return <span className={color}>{sign}{changePercent.toFixed(2)}%</span>;
  };

  // Filter stocks based on search query
  const filteredStocks = stocks.filter(stock => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      stock.symbol.toLowerCase().includes(query) ||
      (stock.name && stock.name.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stocks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error loading stocks</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Stocks</h1>
            <p className="text-sm sm:text-base text-gray-600">Browse and trade stocks</p>
          </div>
          {wallet && (
            <div className="p-3 sm:p-4 bg-teal-50 rounded-lg border border-teal-200 w-full sm:w-auto">
              <p className="text-xs text-gray-600 mb-1">Available Balance</p>
              <p className="text-xl sm:text-2xl font-bold text-teal-600 break-words">{formatCurrency(wallet.balance)} {wallet.currency}</p>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <div className="relative w-full sm:max-w-md">
            <input
              type="text"
              placeholder="Search stocks by symbol or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 sm:py-2 pl-10 text-base sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent touch-manipulation"
            />
            <svg className="absolute left-3 top-3 sm:top-2.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl sm:rounded-lg shadow overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change %
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Your Holdings
                </th>
                <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                    {searchQuery ? `No stocks found matching "${searchQuery}"` : 'No stocks available'}
                  </td>
                </tr>
              ) : (
                filteredStocks.map((stock) => {
                  const ownedQuantity = getHoldingQuantity(stock.symbol);
                  const canSell = hasStock(stock.symbol);
                  const isTradingThis = trading === stock.symbol;

                  return (
                    <tr key={stock.symbol} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">{stock.symbol}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className="text-gray-900">{stock.name || stock.symbol}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-gray-900 font-medium">
                          {formatCurrency(stock.current_price || 0)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        {formatChange(stock.change_percent)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        {ownedQuantity > 0 ? (
                          <span className="text-gray-900 font-medium">{ownedQuantity.toFixed(4)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleBuyClick(stock)}
                            disabled={isTradingThis}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-teal-500 text-white hover:bg-teal-600 active:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors touch-manipulation"
                          >
                            {isTradingThis && !isSellMode ? 'Processing...' : 'Buy'}
                          </button>
                          {canSell && (
                            <button
                              onClick={() => handleSellClick(stock)}
                              disabled={isTradingThis}
                              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                              {isTradingThis && isSellMode ? 'Processing...' : 'Sell'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Mobile Card View */}
        <div className="sm:hidden divide-y divide-gray-200">
          {filteredStocks.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              {searchQuery ? `No stocks found matching "${searchQuery}"` : 'No stocks available'}
            </div>
          ) : (
            filteredStocks.map((stock) => {
              const ownedQuantity = getHoldingQuantity(stock.symbol);
              const canSell = hasStock(stock.symbol);
              const isTradingThis = trading === stock.symbol;

              return (
                <div key={stock.symbol} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-base">{stock.symbol}</span>
                        {formatChange(stock.change_percent)}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{stock.name || stock.symbol}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-base font-bold text-gray-900">{formatCurrency(stock.current_price || 0)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-600">
                      Holdings: {ownedQuantity > 0 ? (
                        <span className="font-medium text-gray-900">{ownedQuantity.toFixed(4)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBuyClick(stock)}
                        disabled={isTradingThis}
                        className="px-4 py-2 text-xs font-medium rounded-lg bg-teal-500 text-white hover:bg-teal-600 active:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors touch-manipulation"
                      >
                        {isTradingThis && !isSellMode ? 'Processing...' : 'Buy'}
                      </button>
                      {canSell && (
                        <button
                          onClick={() => handleSellClick(stock)}
                          disabled={isTradingThis}
                          className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 hover:bg-slate-50 active:bg-slate-100 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors touch-manipulation"
                        >
                          {isTradingThis && isSellMode ? 'Processing...' : 'Sell'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isBuyModalOpen && selectedStock && (
        <BuyModal
          asset={selectedStock}
          wallet={wallet}
          onClose={() => {
            setIsBuyModalOpen(false);
            setSelectedStock(null);
          }}
          onConfirm={handleTradeConfirm}
          isSellMode={isSellMode}
          availableQuantity={getHoldingQuantity(selectedStock.symbol)}
        />
      )}

      {isPINModalOpen && (
        <PINModal
          open={isPINModalOpen}
          title={`${isSellMode ? 'Sell' : 'Buy'} ${selectedStock?.symbol} - Verify PIN`}
          hint="Enter your PIN to confirm this transaction"
          mode="verify"
          onClose={() => {
            setIsPINModalOpen(false);
            setPendingTrade(null);
          }}
          onConfirm={handlePINVerify}
        />
      )}

      <InsufficientBalanceModal
        open={insufficientBalanceModal.open}
        onClose={() => setInsufficientBalanceModal({ ...insufficientBalanceModal, open: false })}
        requiredAmount={insufficientBalanceModal.requiredAmount}
        availableBalance={insufficientBalanceModal.availableBalance}
        currency={wallet?.currency || 'INR'}
        assetName={insufficientBalanceModal.assetName}
      />

      <SuccessModal
        open={successModal.open}
        onClose={() => setSuccessModal({ ...successModal, open: false })}
        title={successModal.title}
        message={successModal.message}
        details={successModal.details}
        currency={wallet?.currency || 'INR'}
        transactionType={successModal.transactionType}
        autoCloseDelay={4000}
      />
    </div>
  );
}
