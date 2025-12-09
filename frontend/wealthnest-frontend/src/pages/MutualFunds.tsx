import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MutualFunds() {
  const [funds, setFunds] = useState<any[]>([]);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        
        // Fetch all mutual funds from assets
        const { data: assets, error: assetsError } = await supabase
          .from('assets')
          .select('*')
          .eq('asset_type', 'mutual_fund')
          .order('name', { ascending: true });
        
        if (!assetsError && assets) {
          setFunds(assets);
        }
        
        // Fetch user's purchased mutual funds
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const email = session.user.email ?? '';
          if (email) {
            const { data: userRow } = await supabase
              .from('users')
              .select('user_id')
              .eq('email', email)
              .maybeSingle();
            
            const userIdForQuery = (userRow as any)?.user_id || session.user.id;
            
            // Get portfolio IDs for this user
            const { data: ports } = await supabase
              .from('portfolios')
              .select('portfolio_id')
              .eq('user_id', userIdForQuery);
            
            const ids = ports?.map((p: any) => p.portfolio_id) || [];
            
            // Get holdings for mutual funds only
            if (ids.length > 0) {
              const { data: hs } = await supabase
                .from('portfolio_holdings')
                .select('*, asset:assets(*)')
                .in('portfolio_id', ids);
              
              // Filter to only show mutual fund holdings
              const mutualFundHoldings = (hs || []).filter((h: any) => 
                h.asset?.asset_type === 'mutual_fund'
              );
              
              setHoldings(mutualFundHoldings);
            }
          }
        }
      } catch (err) {
        console.error('Error loading mutual funds:', err);
      } finally {
        setLoading(false);
      }
    };
    
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Mutual Funds</h1>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading mutual funds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Mutual Funds</h1>
      
      {/* Purchased Mutual Funds */}
      {holdings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Holdings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {holdings.map((holding: any) => (
              <div key={holding.holding_id} className="p-4 sm:p-5 border-2 border-teal-200 rounded-xl bg-teal-50 shadow-sm hover:shadow-md transition-shadow">
                <p className="font-semibold text-base sm:text-lg text-slate-900 mb-1">
                  {holding.asset?.name || 'Unknown Fund'}
                </p>
                <p className="text-xs sm:text-sm text-slate-600 mb-2">
                  Quantity: {holding.quantity?.toFixed(4) || '0'}
                </p>
                <p className="text-base sm:text-lg font-bold text-teal-700">
                  NAV: ₹{holding.asset?.current_price?.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  Value: ₹{((holding.asset?.current_price || 0) * (holding.quantity || 0)).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* All Available Mutual Funds */}
      <div>
        {holdings.length > 0 && (
          <h2 className="text-lg font-semibold text-slate-900 mb-4">All Available Funds</h2>
        )}
        {funds.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <p>No mutual funds available at the moment.</p>
            <p className="text-sm mt-2">Check back later or contact support.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {funds.map((fund: any) => (
              <div key={fund.asset_id} className="p-4 sm:p-5 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                <p className="font-semibold text-base sm:text-lg text-slate-900 mb-1">{fund.name || fund.symbol}</p>
                <p className="text-xs sm:text-sm text-slate-600 mb-2">{fund.sector || 'Mutual Fund'}</p>
                <p className="text-base sm:text-lg font-bold text-slate-900">
                  NAV: ₹{fund.current_price?.toFixed(2) || '0.00'}
                </p>
                {fund.change_percent !== undefined && fund.change_percent !== null && (
                  <p className={`text-xs mt-2 ${fund.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fund.change_percent >= 0 ? '+' : ''}{fund.change_percent.toFixed(2)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
