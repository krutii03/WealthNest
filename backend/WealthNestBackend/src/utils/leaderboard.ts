import { SupabaseClient } from '@supabase/supabase-js';

export type Badge = 'Bronze' | 'Silver' | 'Gold' | 'Sapphire' | 'Diamond' | null;

export function getBadgeFromPoints(points: number): Badge {
  if (points >= 10000) return 'Diamond';
  if (points >= 5000) return 'Sapphire';
  if (points >= 1000) return 'Gold';
  if (points >= 500) return 'Silver';
  if (points >= 100) return 'Bronze';
  return null;
}

export function calculatePointsFromPortfolioValue(portfolioValue: number): number {
  return Math.floor(portfolioValue / 100);
}

/**
 * Calculate portfolio value and update leaderboard points for a user
 */
export async function updateUserLeaderboardPoints(
  client: SupabaseClient,
  userId: string
): Promise<{ points: number; badge: Badge; portfolioValue: number }> {
  try {
    // Get user's portfolio
    const { data: portfolios } = await client
      .from('portfolios')
      .select('portfolio_id')
      .eq('user_id', userId);

    if (!portfolios || portfolios.length === 0) {
      // No portfolio, set points to 0
      const points = 0;
      const badge = getBadgeFromPoints(points);
      
      // Check if entry exists first
      const { data: existing, error: checkError } = await client
        .from('leaderboard')
        .select('leaderboard_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing entry for zero portfolio:', checkError);
        throw checkError;
      }

      if (existing) {
        // Update existing
        const { error: updateError } = await client
          .from('leaderboard')
          .update({
            points_total: points,
            badge: badge,
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating leaderboard for zero portfolio:', updateError);
          throw updateError;
        }
      } else {
        // Insert new
        const { error: insertError } = await client
          .from('leaderboard')
          .insert({
            user_id: userId,
            points_total: points,
            badge: badge,
          });

        if (insertError) {
          console.error('Error inserting leaderboard for zero portfolio:', insertError);
          throw insertError;
        }
      }
      
      return { points, badge, portfolioValue: 0 };
    }

    // Calculate total portfolio value from all holdings
    let portfolioValue = 0;
    
    for (const portfolio of portfolios) {
      const { data: holdings } = await client
        .from('portfolio_holdings')
        .select('quantity, asset:assets(current_price)')
        .eq('portfolio_id', portfolio.portfolio_id);

      if (holdings) {
        const totalValue = holdings.reduce((sum, h) => {
          const price = (h.asset as any)?.current_price || 0;
          return sum + (parseFloat(h.quantity.toString()) * parseFloat(price.toString()));
        }, 0);
        
        portfolioValue += totalValue;
      }
    }

    // Calculate points and badge
    const points = calculatePointsFromPortfolioValue(portfolioValue);
    const badge = getBadgeFromPoints(points);

    // Check if entry exists first
    console.log(`[Leaderboard Utils] Checking for existing entry for user: ${userId}`);
    const { data: existing, error: checkError } = await client
      .from('leaderboard')
      .select('leaderboard_id, points_total, badge')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[Leaderboard Utils] Error checking existing entry:', checkError);
      throw checkError;
    }

    console.log(`[Leaderboard Utils] Existing entry:`, existing ? `found (points=${existing.points_total}, badge=${existing.badge})` : 'not found');

    if (existing) {
      // Update existing entry
      console.log(`[Leaderboard Utils] Updating existing entry with points=${points}, badge=${badge}`);
      const { error: updateError, data: updateData } = await client
        .from('leaderboard')
        .update({
          points_total: points,
          badge: badge,
        })
        .eq('user_id', userId)
        .select();

      if (updateError) {
        console.error('[Leaderboard Utils] Error updating leaderboard:', updateError);
        console.error('[Leaderboard Utils] Error details:', {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint
        });
        throw updateError;
      }

      console.log(`[Leaderboard Utils] Successfully updated entry:`, updateData);
    } else {
      // Insert new entry
      console.log(`[Leaderboard Utils] Inserting new entry with points=${points}, badge=${badge}`);
      const { error: insertError, data: insertData } = await client
        .from('leaderboard')
        .insert({
          user_id: userId,
          points_total: points,
          badge: badge,
        })
        .select();

      if (insertError) {
        console.error('[Leaderboard Utils] Error inserting leaderboard:', insertError);
        console.error('[Leaderboard Utils] Error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        });
        throw insertError;
      }

      console.log(`[Leaderboard Utils] Successfully inserted entry:`, insertData);
    }

    return { points, badge, portfolioValue };
  } catch (error) {
    console.error('Error in updateUserLeaderboardPoints:', error);
    throw error;
  }
}

