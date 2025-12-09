import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import ChangePINModal from '../components/ChangePINModal';
import PINModal from '../components/PINModal';
import { formatCurrency } from '../utils/currency';
import { getBadgeFromPoints, getBadgeColor, getBadgeIcon, calculatePointsFromPortfolioValue, updateLeaderboardPoints } from '../utils/leaderboard';
import { ensurePublicUserExists } from '../utils/ensureUser';

type UserForm = {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  birthdate: string; // ISO yyyy-mm-dd
  address: string;
  pin?: number | null;
  created_at?: string;
};

export default function ProfilePage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm | null>(null);
  const [isChangePINOpen, setIsChangePINOpen] = useState(false);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<{ points: number; badge: string | null; rank: number | null; portfolioValue?: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        // Loading state managed internally
        const session = (await supabase.auth.getSession()).data.session;
        const uid = session?.user?.id;
        const email = session?.user?.email ?? '';
        if (!uid) throw new Error('No session');
        
        // Try to get user record by email first, then by user_id
        let record: any = null;
        const { data: usersByEmail, error: emailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        
        if (emailError) {
          console.error('Error fetching user by email:', emailError);
        }
        
        if (usersByEmail) {
          record = usersByEmail;
        } else {
          // Try by user_id (UUID)
          const { data: usersById, error: idError } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', uid)
            .maybeSingle();
          
          if (idError) {
            console.error('Error fetching user by ID:', idError);
          }
          
          if (usersById) {
            record = usersById;
          }
        }
        
        if (!mounted) return;
        
        // If name is the same as email, treat it as empty (user probably hasn't set a name yet)
        const userName = record?.name && record.name !== record?.email 
          ? record.name 
          : (session?.user?.user_metadata?.full_name ?? session?.user?.user_metadata?.name ?? '');
        
        const full: UserForm = {
          user_id: uid,
          name: userName,
          email: record?.email ?? session?.user?.email ?? email,
          phone: record?.phone ?? '',
          birthdate: record?.birthdate ? (new Date(record.birthdate).toISOString().slice(0, 10)) : '',
          address: record?.address ?? '',
          pin: record?.pin ?? null,
          created_at: record?.created_at ?? session?.user?.created_at ?? undefined,
        };
        setForm(full);
        setHasPin(record?.pin !== null && record?.pin !== undefined);
        
        if (!record) {
          // User doesn't exist - use ensureUser utility to create it
          try {
            await ensurePublicUserExists();
            // Reload the profile after ensuring user exists
            const { data: newRecord } = await supabase
              .from('users')
              .select('*')
              .eq('email', email)
              .maybeSingle();
            
            if (newRecord) {
              record = newRecord;
              // If name is the same as email, treat it as empty
              const userName = record?.name && record.name !== record?.email 
                ? record.name 
                : (session?.user?.user_metadata?.full_name ?? session?.user?.user_metadata?.name ?? '');
              
              const full: UserForm = {
                user_id: uid,
                name: userName,
                email: record?.email ?? session?.user?.email ?? email,
                phone: record?.phone ?? '',
                birthdate: record?.birthdate ? (new Date(record.birthdate).toISOString().slice(0, 10)) : '',
                address: record?.address ?? '',
                pin: record?.pin ?? null,
                created_at: record?.created_at ?? session?.user?.created_at ?? undefined,
              };
              setForm(full);
              setHasPin(record?.pin !== null && record?.pin !== undefined);
            }
            setError(null);
          } catch (createError: any) {
            console.error('Error ensuring user profile:', createError);
            setError('Could not load user profile. Please refresh the page.');
          }
        } else {
          setError(null);
        }

        // Load portfolio holdings
        const portfolios = (await supabase.from('portfolios').select('portfolio_id').eq('user_id', uid)).data || [];
        const portfolioIds = portfolios.map((p: any) => p.portfolio_id);
        let portfolioValue = 0;
        if (portfolioIds.length > 0) {
          const { data: holdingsData } = await supabase
            .from('portfolio_holdings')
            .select('*, asset:assets(*)')
            .in('portfolio_id', portfolioIds);
          setHoldings(holdingsData || []);
          
          // Calculate total portfolio value from actual holdings
          portfolioValue = (holdingsData || []).reduce((sum, h: any) => {
            const asset = h.asset;
            return sum + ((asset?.current_price || 0) * h.quantity);
          }, 0);
        }
        setPortfolioLoading(false);

        // Update leaderboard points and fetch badge based on actual portfolio value
        try {
          // Always update points from actual portfolio value
          const pointsResult = await updateLeaderboardPoints(uid, portfolioValue);
          
          // Wait a bit for rank recalculation to complete on the backend
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Fetch updated leaderboard data including rank
          const { data: lbData } = await supabase
            .from('leaderboard')
            .select('points_total, badge, rank')
            .eq('user_id', uid)
            .maybeSingle();
          
          if (lbData) {
            setLeaderboardData({
              points: pointsResult.points || lbData.points_total || 0,
              badge: pointsResult.badge || lbData.badge || getBadgeFromPoints(pointsResult.points || 0),
              rank: pointsResult.rank !== undefined && pointsResult.rank !== null ? pointsResult.rank : (lbData.rank || null),
              portfolioValue: portfolioValue, // Store actual portfolio value
            });
          } else if (pointsResult) {
            // If no leaderboard entry yet, use the calculated points
            setLeaderboardData({
              points: pointsResult.points || 0,
              badge: pointsResult.badge || null,
              rank: pointsResult.rank !== undefined && pointsResult.rank !== null ? pointsResult.rank : null,
              portfolioValue: portfolioValue,
            });
          }
        } catch (err) {
          console.error('Error updating leaderboard:', err);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load profile');
      } finally {
        // Loading complete
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Refresh leaderboard data when holdings change (for real-time updates)
  useEffect(() => {
    if (!holdings.length || portfolioLoading) return;

    const refreshLeaderboard = async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const uid = session?.user?.id;
        if (!uid) return;

        // Calculate current portfolio value
        const portfolioValue = holdings.reduce((sum, h: any) => {
          const asset = h.asset;
          return sum + ((asset?.current_price || 0) * h.quantity);
        }, 0);

        // Update leaderboard points
        const pointsResult = await updateLeaderboardPoints(uid, portfolioValue);
        
        // Wait a bit for rank recalculation to complete on the backend
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch updated leaderboard data including rank
        const { data: lbData } = await supabase
          .from('leaderboard')
          .select('points_total, badge, rank')
          .eq('user_id', uid)
          .maybeSingle();
        
        if (lbData || pointsResult) {
          setLeaderboardData({
            points: pointsResult?.points || lbData?.points_total || 0,
            badge: pointsResult?.badge || lbData?.badge || getBadgeFromPoints(pointsResult?.points || 0),
            rank: pointsResult?.rank !== undefined && pointsResult?.rank !== null ? pointsResult.rank : (lbData?.rank || null),
            portfolioValue: portfolioValue,
          });
        }
      } catch (err) {
        console.error('Error refreshing leaderboard:', err);
      }
    };

    refreshLeaderboard();
  }, [holdings, portfolioLoading]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      setSaving(true);
      setMessage(null);
      setError(null);
      // Note: Don't call ensurePublicUserExists() here as it might overwrite the name
      // The user should already exist from login/signup
      
      // Check if user exists to determine if we should use insert or update
      const { data: existingUser } = await supabase
        .from('users')
        .select('user_id, password_hash')
        .eq('user_id', form.user_id)
        .maybeSingle();
      
      const updatePayload: any = {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        birthdate: form.birthdate || null,
        address: form.address || null,
      };
      
      let updateError: any = null;
      
      if (existingUser) {
        // User exists - just update (don't touch password_hash)
        const { error } = await supabase
          .from('users')
          .update(updatePayload)
          .eq('user_id', form.user_id);
        updateError = error;
        
        if (updateError) {
          // Try by email as fallback
          const { error: emailError } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('email', form.email);
          updateError = emailError;
        }
      } else {
        // User doesn't exist - use upsert with password_hash
        const insertPayload = {
          ...updatePayload,
          user_id: form.user_id,
          password_hash: 'managed-by-supabase-auth',
        };
        const { error } = await supabase
          .from('users')
          .upsert(insertPayload, {
            onConflict: 'user_id',
          });
        updateError = error;
      }
      
      if (updateError) {
        console.error('Update error:', updateError);
        throw new Error('Could not update profile. Please try again or contact support.');
      }
      setMessage('Profile saved');
    } catch (e: any) {
      setError(e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const update = (k: keyof UserForm, v: any) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const handleChangePIN = async (password: string, partialPhone: string, newPin: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/auth/pin/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password, partialPhone, newPin }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change PIN');
      }

      setMessage('PIN changed successfully');
      setHasPin(true);
      if (form) {
        setForm({ ...form, pin: parseInt(newPin, 10) });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to change PIN');
      throw e;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Profile Form Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h1 className="text-2xl font-bold mb-6">Profile</h1>
        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
            {error}
          </div>
        )}
        {form && (
          <form onSubmit={onSubmit} className="space-y-4" aria-label="Edit profile form">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm text-slate-700">
                Name
                <input value={form.name} onChange={(e) => update('name', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500" required />
              </label>
              <label className="block text-sm text-slate-700">
                Email
                <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500" required />
              </label>
              <label className="block text-sm text-slate-700">
                Phone
                <input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500" />
              </label>
              <label className="block text-sm text-slate-700">
                Birthdate
                <input type="date" value={form.birthdate} onChange={(e) => update('birthdate', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500" />
              </label>
            </div>

            <label className="block text-sm text-slate-700">
              Address
              <textarea value={form.address} onChange={(e) => update('address', e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500" rows={3} />
            </label>

            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Transaction PIN
                </label>
                <button
                  type="button"
                  onClick={() => setIsChangePINOpen(true)}
                  className="text-sm text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  {hasPin ? 'Change PIN' : 'Set PIN'}
                </button>
              </div>
              <div className="text-sm text-slate-600">
                {hasPin ? (
                  <span className="text-emerald-600">✓ PIN is set</span>
                ) : (
                  <span className="text-amber-600">⚠ PIN not set - required for transactions</span>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-500">Created: {form.created_at ? new Date(form.created_at).toLocaleString() : '—'}</div>

            <div className="flex gap-3">
              <button disabled={saving} type="submit" className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 disabled:opacity-50">{saving ? 'Saving...' : 'Save Profile'}</button>
              <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium border border-slate-200 hover:shadow focus:ring-2 focus:ring-teal-500">Reset</button>
            </div>
          </form>
        )}
        </div>

        {/* Leaderboard Badge Section */}
        <div className="bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 rounded-2xl shadow-sm border-2 border-teal-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">🏆 Achievements</h2>
          {leaderboardData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Badge Display */}
                <div className="bg-white rounded-xl p-6 border-2 border-slate-200 text-center flex flex-col min-h-[240px]">
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-5xl mb-3">
                      {leaderboardData.badge ? getBadgeIcon(leaderboardData.badge as any) : '⭐'}
                    </div>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold text-lg mb-3 ${
                      leaderboardData.badge ? getBadgeColor(leaderboardData.badge as any) : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}>
                      <span>{leaderboardData.badge || 'No Badge Yet'}</span>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 mt-auto pt-4">
                    {leaderboardData.badge ? `Congratulations! You've earned the ${leaderboardData.badge} badge!` : 'Keep trading to earn your first badge!'}
                  </div>
                </div>

                {/* Points Display */}
                <div className="bg-white rounded-xl p-6 border-2 border-slate-200 text-center flex flex-col min-h-[240px]">
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="text-3xl font-bold text-teal-600 mb-2">
                      {leaderboardData.points.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-600 mb-2">Leaderboard Points</div>
                    <div className="text-xs text-slate-500 mb-4">
                      Portfolio Value: {formatCurrency(leaderboardData.portfolioValue || holdings.reduce((sum, h: any) => {
                        const asset = h.asset;
                        return sum + ((asset?.current_price || 0) * h.quantity);
                      }, 0))}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-200 mt-auto">
                    <div className="text-xs text-slate-500 mb-1">Next Badge:</div>
                    <div className="text-sm font-semibold text-slate-700">
                      {leaderboardData.points < 100 && `🥉 Bronze at 100 points`}
                      {leaderboardData.points >= 100 && leaderboardData.points < 500 && `🥈 Silver at 500 points`}
                      {leaderboardData.points >= 500 && leaderboardData.points < 1000 && `🥇 Gold at 1000 points`}
                      {leaderboardData.points >= 1000 && leaderboardData.points < 5000 && `💠 Sapphire at 5000 points`}
                      {leaderboardData.points >= 5000 && leaderboardData.points < 10000 && `💎 Diamond at 10000 points`}
                      {leaderboardData.points >= 10000 && `🌟 You've reached the maximum badge!`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rank Display - Full Width */}
              <div className="bg-white rounded-xl p-6 border-2 border-slate-200 text-center flex flex-col min-h-[240px]">
                <div className="flex-1 flex flex-col justify-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    #{leaderboardData.rank || '—'}
                  </div>
                  <div className="text-sm text-slate-600 mb-4">Global Rank</div>
                </div>
                <div className="mt-auto pt-4">
                  <button
                    onClick={() => navigate('/leaderboard')}
                    className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
                  >
                    View Leaderboard →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-xl border-2 border-slate-200">
              <div className="text-4xl mb-2">⭐</div>
              <div className="text-slate-700 font-medium mb-1">Start investing to earn badges!</div>
              <div className="text-slate-600 text-sm mb-4">Build your portfolio to climb the leaderboard.</div>
              <button
                onClick={() => navigate('/stocks')}
                className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium bg-teal-500 text-white hover:bg-teal-600 transition-colors"
              >
                Start Trading
              </button>
            </div>
          )}
        </div>

      {/* Investment Portfolio Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Investment Portfolio</h2>
          <button
            onClick={() => navigate('/portfolio')}
            className="text-sm text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            View Full Portfolio →
          </button>
        </div>

        {portfolioLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-2 text-sm text-slate-600">Loading portfolio...</p>
          </div>
        ) : holdings.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 mb-3 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-slate-700 font-medium mb-1">No investments yet</div>
            <div className="text-slate-600 text-sm mb-4">Start investing to build your portfolio.</div>
            <button
              onClick={() => navigate('/stocks')}
              className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium bg-teal-500 text-white hover:bg-teal-600 transition-colors"
            >
              Browse Stocks
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {holdings.slice(0, 5).map((holding: any, index: number) => {
              const asset = holding.asset;
              const value = (asset?.current_price || 0) * holding.quantity;
              const pl = holding.average_price > 0 
                ? ((asset?.current_price || 0) - holding.average_price) / holding.average_price 
                : 0;

              return (
                <div
                  key={holding.holding_id || index}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">
                        {asset?.symbol || 'N/A'}
                      </span>
                      <span className="text-sm text-slate-600">
                        {asset?.name || 'Unknown Asset'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {holding.quantity.toFixed(4)} shares @ {formatCurrency(holding.average_price || 0)} avg
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900">
                      {formatCurrency(value)}
                    </div>
                    <div className={`text-sm ${pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {pl >= 0 ? '+' : ''}{(pl * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}

            {holdings.length > 5 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => navigate('/portfolio')}
                  className="text-sm text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  View all {holdings.length} holdings →
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Total Portfolio Value</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatCurrency(
                    holdings.reduce((sum, h) => {
                      const asset = h.asset;
                      return sum + ((asset?.current_price || 0) * h.quantity);
                    }, 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change PIN Modal */}
      <ChangePINModal
        open={isChangePINOpen}
        onClose={() => setIsChangePINOpen(false)}
        onConfirm={handleChangePIN}
      />
      </div>
    </div>
  );
}
