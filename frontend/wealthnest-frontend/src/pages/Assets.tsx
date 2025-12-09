import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Asset, Wallet } from '../types';
import BuyModal from '../components/BuyModal';
import { formatCurrency } from '../utils/currency';

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [buyAsset, setBuyAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'stock' | 'mutual_fund'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch assets from API
        const response = await fetch('/api/assets');
        if (!response.ok) {
          throw new Error('Failed to fetch assets');
        }
        
        const data = await response.json();
        setAssets(data || []);

        // Fetch wallet if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const walletResponse = await fetch('/api/wallet/balance', {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          
          if (walletResponse.ok) {
            const walletData = await walletResponse.json();
            if (walletData && typeof walletData.balance === 'number') {
              setWallet(walletData);
            }
          }
        }
      } catch (err: any) {
        console.error('Error loading assets:', err);
        setError(err.message || 'Failed to load assets');
      } finally {
        setLoading(false);
      }
    };

    load();

    // Realtime subscription for price updates
    const channel = supabase
      .channel('assets-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assets' }, (payload) => {
        const updated = payload.new as Asset;
        setAssets((prev) => prev.map((a) => (a.asset_id === updated.asset_id ? { ...a, ...updated } : a)));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredAssets = useMemo(() => {
    let result = [...assets];

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(a => a.asset_type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(a => 
        a.name?.toLowerCase().includes(query) || 
        a.symbol?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [assets, filterType, searchQuery]);

  const handleConfirmBuy = async (qty: number) => {
    if (!buyAsset || !wallet) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to buy assets');
        return;
      }

      // Use the backend API for trading
      const response = await fetch('/api/portfolio/stocktrading/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          symbol: buyAsset.symbol,
          quantity: qty,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute trade');
      }

      // Refresh wallet balance with error handling
      try {
        const walletResponse = await fetch('/api/wallet/balance', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Accept': 'application/json',
          },
        });
        
        if (walletResponse.ok) {
          const walletData = await walletResponse.json();
          setWallet(walletData);
        } else {
          console.warn('Failed to refresh wallet balance:', walletResponse.status);
        }
      } catch (walletError) {
        console.warn('Error refreshing wallet (non-critical):', walletError);
      }

      setBuyAsset(null);
      alert(`Successfully bought ${qty} ${buyAsset.symbol}`);
    } catch (err: any) {
      console.error('Error buying asset:', err);
      alert(err.message || 'Failed to buy asset');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Assets</h1>
        <p className="text-gray-600">Browse all available stocks and mutual funds</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by name or symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('stock')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'stock'
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Stocks
            </button>
            <button
              onClick={() => setFilterType('mutual_fund')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'mutual_fund'
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mutual Funds
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Balance */}
      {wallet && (
        <div className="mb-6 p-4 bg-teal-50 rounded-lg border border-teal-200">
          <p className="text-xs text-gray-600 mb-1">Available Balance</p>
          <p className="text-2xl font-bold text-teal-600">{formatCurrency(wallet.balance)} {wallet.currency}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-4 text-gray-600">Loading assets...</p>
        </div>
      ) : (
        <>
          {/* Assets Table */}
          {filteredAssets.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600">No assets found.</p>
              {searchQuery && (
                <p className="text-sm text-gray-500 mt-2">Try adjusting your search or filter.</p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAssets.map((asset) => (
                      <tr key={asset.asset_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{asset.symbol}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{asset.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            asset.asset_type === 'stock'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {asset.asset_type === 'stock' ? 'Stock' : 'Mutual Fund'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(asset.current_price)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => setBuyAsset(asset)}
                            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
                          >
                            Buy
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Buy Modal */}
      <BuyModal 
        asset={buyAsset} 
        wallet={wallet} 
        onClose={() => setBuyAsset(null)} 
        onConfirm={handleConfirmBuy}
      />
    </div>
  );
}
