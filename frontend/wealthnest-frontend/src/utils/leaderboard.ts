// Utility functions for leaderboard and badges

export type Badge = 'Bronze' | 'Silver' | 'Gold' | 'Sapphire' | 'Diamond' | null;

export function getBadgeFromPoints(points: number): Badge {
  if (points >= 10000) return 'Diamond';
  if (points >= 5000) return 'Sapphire';
  if (points >= 1000) return 'Gold';
  if (points >= 500) return 'Silver';
  if (points >= 100) return 'Bronze';
  return null;
}

export function getBadgeColor(badge: Badge): string {
  switch (badge) {
    case 'Bronze':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'Silver':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'Gold':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Sapphire':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Diamond':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-300';
  }
}

export function getBadgeIcon(badge: Badge): string {
  switch (badge) {
    case 'Bronze':
      return '🥉';
    case 'Silver':
      return '🥈';
    case 'Gold':
      return '🥇';
    case 'Sapphire':
      return '💠';
    case 'Diamond':
      return '💎';
    default:
      return '⭐';
  }
}

export function calculatePointsFromPortfolioValue(portfolioValue: number): number {
  return Math.floor(portfolioValue / 100);
}

export async function updateLeaderboardPoints(userId: string, portfolioValue: number) {
  const points = calculatePointsFromPortfolioValue(portfolioValue);
  const badge = getBadgeFromPoints(points);
  
  console.log(`[Leaderboard] Updating for user ${userId}: portfolioValue=${portfolioValue}, points=${points}, badge=${badge}`);
  
  // Try using backend API first (bypasses RLS)
  try {
    const { supabase } = await import('../lib/supabaseClient');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      const API_BASE_URL = import.meta.env.PROD 
        ? (import.meta.env.VITE_API_URL || '') 
        : '';
      
      const endpoint = API_BASE_URL 
        ? `${API_BASE_URL.replace(/\/$/, '')}/api/leaderboard/update`
        : `/api/leaderboard/update`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[Leaderboard] Successfully updated via API:`, result);
        return { 
          points: result.points || points, 
          badge: result.badge || badge,
          rank: result.rank || null
        };
      } else {
        console.warn(`[Leaderboard] API update failed, falling back to direct update`);
      }
    }
  } catch (apiError) {
    console.warn('[Leaderboard] API update failed, falling back to direct update:', apiError);
  }

  // Fallback: Direct database update (subject to RLS) - but likely to fail due to RLS
  console.warn('[Leaderboard] Falling back to direct database update (may fail due to RLS)');
  const { supabase } = await import('../lib/supabaseClient');
  
  // Check if entry exists first
  const { data: existing, error: checkError } = await supabase
    .from('leaderboard')
    .select('leaderboard_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('[Leaderboard] Error checking existing entry:', checkError);
    // Don't throw, just log - API should handle it
  }

  let error = null;
  
  if (existing) {
    // Try to update
    const { error: updateError } = await supabase
      .from('leaderboard')
      .update({
        points_total: points,
        badge: badge,
      })
      .eq('user_id', userId);
    
    error = updateError;
  } else {
    // Try to insert
    const { error: insertError } = await supabase
      .from('leaderboard')
      .insert({
        user_id: userId,
        points_total: points,
        badge: badge,
      });
    
    error = insertError;
    
    // If insert fails with duplicate, try update
    if (insertError && (insertError.code === '23505' || insertError.message?.includes('duplicate'))) {
      const { error: updateError } = await supabase
        .from('leaderboard')
        .update({
          points_total: points,
          badge: badge,
        })
        .eq('user_id', userId);
      
      error = updateError;
    }
  }

  if (error) {
    console.error('[Leaderboard] Error in fallback database update:', error);
    // Don't throw - API should handle it, but log the error
    console.warn('[Leaderboard] Direct database update failed - this is expected if RLS is enabled. Use backend API instead.');
  } else {
    console.log(`[Leaderboard] Successfully updated leaderboard for user ${userId} via fallback`);
  }

  return { points, badge, rank: null }; // Rank will be null if fallback used - should use API instead
}

