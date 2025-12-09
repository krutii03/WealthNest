import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import PINModal from '../components/PINModal';
import InsufficientBalanceModal from '../components/InsufficientBalanceModal';
import SuccessModal from '../components/SuccessModal';

type Fund = { id: number; name: string; symbol?: string | null; nav: number; changePct: number; high?: number; low?: number; risk: 'Low' | 'Moderate' | 'High' };
type Source = 'live' | 'mock' | 'nodata';

async function loadFunds(): Promise<Array<{ id: number; name: string; symbol?: string | null; nav: number; risk: Fund['risk'] }>> {
  try {
    const { data } = await supabase.from('assets').select('asset_id, name, symbol, current_price').eq('asset_type', 'mutual_fund').limit(12);
    const mapped = (data || []).map((a: any) => ({ id: a.asset_id, name: a.name, symbol: a.symbol, nav: Number(a.current_price ?? 100), risk: (['Low','Moderate','High'][Math.floor(Math.random()*3)] as any) }));
    if (mapped.length > 0) return mapped;
  } catch {}
  return Array.from({ length: 8 }).map((_, i) => ({ id: i + 1, name: `WealthNest Fund ${i+1}`, symbol: undefined, nav: 100 + Math.random() * 50, risk: (['Low','Moderate','High'][Math.floor(Math.random()*3)] as any) }));
}

export default function FundsPage() {
  const [tab, setTab] = useState<'All'|'Large Cap'|'Mid Cap'|'Balanced'|'Tax Saving'>('All');
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'lumpsum'|'sip'>('lumpsum');
  const [amount, setAmount] = useState<number>(5000);
  const [current, setCurrent] = useState<Fund | null>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sourceById, setSourceById] = useState<Record<number, Source>>({});
  const [pinOpen, setPinOpen] = useState(false);
  const [action, setAction] = useState<'buy'|'redeem'>('buy');
  const [holdings, setHoldings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  }>({
    open: false,
    title: '',
    message: '',
  });

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2000); };

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

  const refreshLive = async (base: Array<{ id: number; name: string; symbol?: string | null; nav: number; risk: Fund['risk'] }>) => {
    const key = import.meta.env.VITE_TWELVEDATA_KEY as string | undefined;
    const next: Fund[] = [];
    const src: Record<number, Source> = {};
    for (const f of base) {
      if (!key || !f.symbol) {
        next.push({ id: f.id, name: f.name, symbol: f.symbol, nav: f.nav, changePct: 0, risk: f.risk });
        src[f.id] = key ? 'nodata' : 'mock';
        continue;
      }
      try {
        const qRes = await fetch(`/td/quote?symbol=${encodeURIComponent(f.symbol)}&apikey=${key}`);
        if (!qRes.ok) throw new Error('quote');
        const q = await qRes.json();
        const price = Number(q?.price ?? q?.close ?? f.nav);
        const changePct = Number(q?.percent_change ?? 0);
        const high = Number(q?.high ?? price);
        const low = Number(q?.low ?? price);
        if (!isFinite(price) || price <= 0) throw new Error('invalid');
        next.push({ id: f.id, name: f.name, symbol: f.symbol, nav: price, changePct, high, low, risk: f.risk });
        src[f.id] = 'live';
      } catch {
        next.push({ id: f.id, name: f.name, symbol: f.symbol, nav: f.nav, changePct: 0, risk: f.risk });
        src[f.id] = 'mock';
      }
    }
    setFunds(next);
    setSourceById(src);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const base = await loadFunds();
      if (!active) return;
      await refreshLive(base);
      setLoading(false);
      try {
        const { data: s } = await supabase.auth.getSession();
        const email = s.session?.user?.email ?? '';
        if (email && s.session) {
          // Try backend API first for wallet
          try {
            const { getWallet } = await import('../utils/api');
            const walletData = await getWallet();
            setWallet({
              wallet_id: 0,
              user_id: s.session.user.id,
              balance: walletData.balance || 0,
              currency: walletData.currency || 'INR'
            } as any);
          } catch (apiError) {
            // Backend API failed - don't try Supabase fallback (causes 406 errors)
            console.warn('Backend API failed for wallet - wallet not available:', apiError);
            setWallet(null);
          }
          
          // Load holdings - get user_id from users table
          const { data: userRow } = await supabase.from('users').select('user_id').eq('email', email).maybeSingle();
          const userIdForQuery = (userRow as any)?.user_id || s.session.user.id;
          
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
            // Filter to only show mutual fund holdings on the client side
            const mutualFundHoldings = (hs || []).filter((h: any) => 
              h.asset?.asset_type === 'mutual_fund'
            );
            setHoldings(mutualFundHoldings);
          } else {
            setHoldings([]);
          }
        }
      } catch (err) {
        console.warn('Error loading holdings:', err);
        setHoldings([]);
      }
    };
    load();
    // Refresh every 2 minutes (120000ms) to get updated prices - same as stocks page
    const t = setInterval(load, 120000);
    return () => { active = false; clearInterval(t); };
  }, []);

  const filtered = useMemo(() => {
    let result = [...funds];
    
    // Filter by category/tab
    if (tab !== 'All') {
      // Map categories to risk levels or other properties
      // For now, we'll use risk level as a proxy for category
      // Large Cap = Low risk, Mid Cap = Moderate risk, Balanced = Moderate risk, Tax Saving = High risk
      const categoryMap: Record<string, Fund['risk'][]> = {
        'Large Cap': ['Low'],
        'Mid Cap': ['Moderate'],
        'Balanced': ['Moderate', 'Low'],
        'Tax Saving': ['High']
      };
      
      if (categoryMap[tab]) {
        result = result.filter(f => categoryMap[tab].includes(f.risk));
      }
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(f => 
        f.name.toLowerCase().includes(query) ||
        (f.symbol && f.symbol.toLowerCase().includes(query))
      );
    }
    
    // Sort funds alphabetically by name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [funds, tab, searchQuery]);

  const openInvest = async (f: Fund) => {
    try {
      setCurrent(f);
      setAction('buy');
      setPinOpen(true);
    } catch (e) {
      console.error(e);
      showToast((e as any)?.message || 'Failed to open investment');
    }
  };
  const openRedeem = async (f: Fund) => {
    try {
      setCurrent(f);
      setAction('redeem');
      setPinOpen(true);
    } catch (e) {
      console.error(e);
      showToast((e as any)?.message || 'Failed to open redemption');
    }
  };

  const onPINConfirm = async (pin: string) => {
    try {
    if (!current) throw new Error('No fund selected');
      
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) throw new Error('Not authenticated');

      // Verify PIN
      const verifyResponse = await fetch('/api/auth/pin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pin }),
      });

      if (!verifyResponse.ok) {
        const error = await verifyResponse.json();
        throw new Error(error.error || 'PIN verification failed');
      }
      
      // Use backend API for investment/redemption
      const { apiFetch } = await import('../utils/api');
      
      if (action === 'buy') {
        // Invest using backend API
        const result = await apiFetch<{
          success: boolean;
          message: string;
          transaction: any;
          units: number;
          nav: number;
          newBalance: number;
        }>('/portfolio/funds/invest', {
          method: 'POST',
          body: JSON.stringify({
            asset_name: current.name,
            amount: amount
          })
        });
        
        // Refresh wallet and holdings
        try {
          const { getWallet } = await import('../utils/api');
          const walletData = await getWallet();
          setWallet({
            wallet_id: wallet?.wallet_id || 0,
            user_id: sess.session?.user?.id,
            balance: walletData.balance || 0,
            currency: walletData.currency || 'INR'
          } as any);
        } catch (apiError) {
          console.warn('Failed to refresh wallet:', apiError);
        }
        
        // Refresh holdings
        try {
          const { data: s } = await supabase.auth.getSession();
          const email = s.session?.user?.email ?? '';
          if (email && s.session) {
            const { data: userRow } = await supabase.from('users').select('user_id').eq('email', email).maybeSingle();
            const userIdForQuery = (userRow as any)?.user_id || s.session.user.id;
            const { data: ports } = await supabase
              .from('portfolios')
              .select('portfolio_id')
              .eq('user_id', userIdForQuery);
            const ids = ports?.map((p: any) => p.portfolio_id) || [];
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
            } else {
              setHoldings([]);
            }
          }
        } catch (e) {
          console.warn('Failed to refresh holdings:', e);
        }
        
        // Show success modal
        setSuccessModal({
          open: true,
          title: 'Investment Successful!',
          message: `Successfully invested in ${current.name}`,
          details: {
            assetName: current.name,
            assetSymbol: current.symbol,
            units: result.units,
            nav: result.nav,
            amount: amount,
            newBalance: result.newBalance,
          },
        });
        setPinOpen(false);
      } else {
        // Redeem using backend API - need to get current holding quantity first
        const { data: s } = await supabase.auth.getSession();
        const email = s.session?.user?.email ?? '';
    const { data: userRow } = await supabase.from('users').select('user_id').eq('email', email).maybeSingle();
    const userId = (userRow as any)?.user_id as number;
        
        if (!userId) throw new Error('User not found');
        
    const { data: p } = await supabase.from('portfolios').select('*').eq('user_id', userId).limit(1).maybeSingle();
        if (!p?.portfolio_id) throw new Error('Portfolio not found');
        
    let { data: asset } = await supabase.from('assets').select('asset_id').eq('name', current.name).maybeSingle();
    if (!asset) {
      const upsert = await supabase
        .from('assets')
        .insert({ asset_type: 'mutual_fund', symbol: current.symbol ?? null, name: current.name, current_price: current.nav } as any)
        .select('asset_id')
        .maybeSingle();
      asset = upsert.data as any;
    }
        if (!asset?.asset_id) throw new Error('Failed to find fund asset');
        
    const { data: holding } = await supabase
      .from('portfolio_holdings')
      .select('*')
          .eq('portfolio_id', p.portfolio_id)
      .eq('asset_id', (asset as any)?.asset_id)
      .maybeSingle();
        
        if (!holding || Number(holding.quantity) <= 0) {
          throw new Error('No units to redeem');
        }
        
        const redeemQty = Number(holding.quantity);
        
        // Redeem using backend API
        const result = await apiFetch<{
          success: boolean;
          message: string;
          transaction: any;
          proceeds: number;
          nav: number;
          newBalance: number;
        }>('/portfolio/funds/redeem', {
          method: 'POST',
          body: JSON.stringify({
            asset_name: current.name,
            quantity: redeemQty
          })
        });
        
        // Refresh wallet and holdings
        try {
          const { getWallet } = await import('../utils/api');
          const walletData = await getWallet();
          setWallet({
            wallet_id: wallet?.wallet_id || 0,
            user_id: userId,
            balance: walletData.balance || 0,
            currency: walletData.currency || 'INR'
          } as any);
        } catch (apiError) {
          console.warn('Failed to refresh wallet:', apiError);
        }
        
        // Refresh holdings
        try {
          const userIdForQuery = userId || (await supabase.from('users').select('user_id').eq('email', email).maybeSingle()).data?.user_id;
          if (userIdForQuery) {
            const { data: ports } = await supabase
              .from('portfolios')
              .select('portfolio_id')
              .eq('user_id', userIdForQuery);
            const ids = ports?.map((p: any) => p.portfolio_id) || [];
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
      } else {
              setHoldings([]);
            }
          }
        } catch (e) {
          console.warn('Failed to refresh holdings:', e);
        }
        
        // Show success modal
        setSuccessModal({
          open: true,
          title: 'Redemption Successful!',
          message: `Successfully redeemed ${redeemQty.toFixed(4)} units of ${current.name}`,
          details: {
            assetName: current.name,
            assetSymbol: current.symbol,
            quantity: redeemQty,
            nav: result.nav,
            proceeds: result.proceeds,
            newBalance: result.newBalance,
          },
        });
        setPinOpen(false);
      }
    } catch (e: any) {
      console.error('Investment error:', e);
      const errorMessage = e?.message || '';
      
      // Check if it's an insufficient balance error
      const balanceInfo = parseInsufficientBalanceError(errorMessage);
      if (balanceInfo) {
        // Show insufficient balance modal instead of toast
        setInsufficientBalanceModal({
          open: true,
          requiredAmount: balanceInfo.required,
          availableBalance: balanceInfo.available,
          assetName: current?.name,
        });
        return; // Don't show toast for insufficient balance
      }
      
      // For other errors, show toast
      showToast(errorMessage || 'Transaction failed. Please try again.');
      throw e;
    }
  };

  return (
    <div className="container max-w-7xl mx-auto px-6 py-6">
      <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mutual Funds</h1>
            <p className="text-gray-600">Invest in mutual funds</p>
          </div>
          {wallet && (
            <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
              <p className="text-xs text-gray-600 mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-teal-600">₹{(wallet.balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {wallet.currency || 'INR'}</p>
            </div>
          )}
        </div>
        
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search mutual funds by name or symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        <div className="flex items-center gap-2">
          {(['All','Large Cap','Mid Cap','Balanced','Tax Saving'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  tab === t 
                    ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((f) => {
          const src = sourceById[f.id] || 'mock';
          const chip = src === 'live' ? 'bg-emerald-50 text-emerald-700' : src === 'nodata' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700';
          const up = (f.changePct ?? 0) >= 0;
          // Match holdings by asset_id or name (asset_id is more reliable)
          const holding = holdings.find(h => 
            h.asset?.asset_id === f.id || 
            h.asset?.name === f.name ||
            (h.asset_id === f.id)
          );
          const haveHolding = holding && (holding.quantity || 0) > 0;
          const ownedQuantity = holding ? (holding.quantity || 0) : 0;
          return (
            <div key={f.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col h-full">
              <div className="flex items-center justify-between mb-3 min-h-[2.5rem]">
                <div className="text-slate-900 font-semibold text-lg line-clamp-2 flex-1">{f.name}</div>
                {(src === 'live' || src === 'nodata') && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${chip} flex-shrink-0 ml-2`}>
                    {src === 'live' ? 'Live' : 'No data'}
                  </span>
                )}
              </div>
              
              <div className="space-y-1.5 mb-4 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">NAV</span>
                  <span className="text-sm font-semibold text-slate-900">₹{(f.nav ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Change</span>
                  <span className={`text-sm font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {up ? '+' : ''}{(f.changePct ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 min-h-[1.5rem]">
                  {f.high && f.low ? (
                    <>
                      <span>High: ₹{f.high.toFixed(2)}</span>
                      <span>Low: ₹{f.low.toFixed(2)}</span>
                    </>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </div>
              <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Risk Level</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    f.risk === 'Low' ? 'bg-emerald-100 text-emerald-700' :
                    f.risk === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {f.risk}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <select 
                    value={mode} 
                    onChange={(e)=>setMode(e.target.value as any)} 
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                  <option value="lumpsum">Lump-sum</option>
                  <option value="sip">SIP</option>
                </select>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={(e)=>setAmount(Number(e.target.value))} 
                    min="100"
                    step="100"
                    className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" 
                    placeholder="Amount"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={()=>openInvest(f)} 
                    className="flex-1 rounded-lg px-3 py-2 text-sm font-medium bg-teal-500 text-white hover:bg-teal-600 transition-colors shadow-sm"
                  >
                    Invest
                  </button>
                  {haveHolding && (
                    <button 
                      onClick={()=>openRedeem(f)} 
                      className="flex-1 rounded-lg px-3 py-2 text-sm font-medium bg-slate-600 text-white hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                      title={`You own ${ownedQuantity.toFixed(4)} units`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      Redeem
                    </button>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 min-h-[1.75rem]">
                  {haveHolding ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Owned Units:</span>
                      <span className="font-semibold text-slate-900">{ownedQuantity.toFixed(4)}</span>
                    </div>
                  ) : (
                    <div className="h-5"></div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <PINModal 
        open={pinOpen} 
        title={action==='buy' ? 'Confirm Investment - Verify PIN' : 'Confirm Redemption - Verify PIN'} 
        hint="Enter your PIN to confirm this transaction"
        mode="verify"
        onClose={()=>setPinOpen(false)} 
        onConfirm={onPINConfirm} 
      />

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
        transactionType={action === 'buy' ? 'invest' : 'redeem'}
        autoCloseDelay={4000}
      />

      {toast && (
        <div className="fixed bottom-4 right-4 bg-white border border-teal-200 shadow-lg rounded-lg px-4 py-3 text-sm z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-900">{toast}</span>
          </div>
        </div>
      )}
      
      {loading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading funds...</p>
          </div>
        </div>
      )}
    </div>
  );
}
