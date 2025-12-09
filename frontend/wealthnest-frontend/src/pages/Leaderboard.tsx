import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { LeaderboardEntry } from '../types';
import { getBadgeFromPoints, getBadgeColor, getBadgeIcon } from '../utils/leaderboard';

interface LeaderboardRow extends LeaderboardEntry {
  user?: { name?: string; email?: string };
  portfolioValue?: number;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;
        setCurrentUserId(userId);

        // Fetch leaderboard from backend API
        const API_BASE_URL = import.meta.env.PROD 
          ? (import.meta.env.VITE_API_URL || '') 
          : '';
        
        const endpoint = API_BASE_URL 
          ? `${API_BASE_URL.replace(/\/$/, '')}/api/leaderboard`
          : `/api/leaderboard`;

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success || !result.leaderboard) {
          throw new Error('Invalid leaderboard response');
        }

        // Transform data to match expected format
        const leaderboardRows: LeaderboardRow[] = result.leaderboard.map((entry: any) => ({
          leaderboard_id: entry.leaderboard_id,
          user_id: entry.user_id,
          points_total: entry.points_total || 0,
          rank: entry.rank || null,
          badge: entry.badge || getBadgeFromPoints(entry.points_total || 0),
          user: entry.user,
          portfolioValue: 0, // Not included in API response, but that's okay
        }));

        // Sort by rank (or points if rank is null)
        const sortedRows = leaderboardRows.sort((a, b) => {
          if (a.rank && b.rank) {
            return a.rank - b.rank;
          }
          return (b.points_total || 0) - (a.points_total || 0);
        });

        setRows(sortedRows);
      } catch (err: any) {
        console.error('Error loading leaderboard:', err);
        // Fallback to empty array on error
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    load();
    
    // Refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);


  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        <p className="mt-4 text-gray-600">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-blue-500 to-purple-600 mb-3">
          🏆 Leaderboard
        </h1>
        <p className="text-gray-600 text-lg">Compete with fellow investors and climb the ranks!</p>
        <div className="mt-4 flex justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-full border border-orange-200">
            <span className="text-2xl">🥉</span>
            <span className="text-sm font-medium text-orange-800">100+ Bronze</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-200">
            <span className="text-2xl">🥈</span>
            <span className="text-sm font-medium text-gray-800">500+ Silver</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-full border border-yellow-200">
            <span className="text-2xl">🥇</span>
            <span className="text-sm font-medium text-yellow-800">1000+ Gold</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
            <span className="text-2xl">💠</span>
            <span className="text-sm font-medium text-blue-800">5000+ Sapphire</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full border border-purple-200">
            <span className="text-2xl">💎</span>
            <span className="text-sm font-medium text-purple-800">10000+ Diamond</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Investor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Badge
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No entries yet. Start trading to appear on the leaderboard!
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isCurrentUser = row.user_id === currentUserId;
                  const badge = row.badge || getBadgeFromPoints(row.points_total || 0);
                  const badgeColor = getBadgeColor(badge);
                  const badgeIcon = getBadgeIcon(badge);
                  
                  return (
                    <tr
                      key={row.leaderboard_id || row.user_id}
                      className={`hover:bg-gray-50 ${isCurrentUser ? 'bg-teal-50' : ''}`}
                    >
                      {/* Rank */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">#{row.rank || '—'}</span>
                      </td>

                      {/* Investor Name */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {row.user?.name || row.user?.email || 'Anonymous'}
                          {isCurrentUser && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-teal-500 text-white rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{row.user?.email}</div>
                      </td>

                      {/* Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {badge ? (
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-medium text-sm ${badgeColor}`}>
                            <span>{badgeIcon}</span>
                            <span>{badge}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>

                      {/* Points */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {row.points_total?.toLocaleString() || 0}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
