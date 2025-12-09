import { Router, Request, Response } from 'express';
import { User } from '@supabase/supabase-js';
import { authenticateToken } from '../middleware/auth';
import { supabase, supabaseAdmin, createUserClient } from '../config/supabase';
import { updateUserLeaderboardPoints } from '../utils/leaderboard';

// Extend Express Request type (already declared in middleware/auth.ts, just reference it)
declare global {
  namespace Express {
    interface Request {
      user?: User;
      accessToken?: string;
    }
  }
}

const router = Router();

/**
 * Recalculate ranks for all users based on their points_total
 */
async function recalculateRanks(client: any) {
  try {
    console.log('[Leaderboard] Starting rank recalculation...');
    
    // Fetch all leaderboard entries ordered by points_total descending
    const { data: entries, error: fetchError } = await client
      .from('leaderboard')
      .select('leaderboard_id, user_id, points_total')
      .order('points_total', { ascending: false });

    if (fetchError) {
      console.error('[Leaderboard] Error fetching entries for rank recalculation:', fetchError);
      throw fetchError;
    }

    if (!entries || entries.length === 0) {
      console.log('[Leaderboard] No entries to rank');
      return;
    }

    // Calculate ranks (handle ties - same points get same rank)
    let currentRank = 1;
    let previousPoints: number | null = null;
    
    const updates = entries.map((entry: any, index: number) => {
      const points = entry.points_total || 0;
      
      // If points are different from previous, assign new rank
      // If points are same as previous, keep the same rank
      if (previousPoints !== null && points !== previousPoints) {
        currentRank = index + 1;
      }
      
      previousPoints = points;
      
      return {
        leaderboard_id: entry.leaderboard_id,
        rank: currentRank
      };
    });

    // Update ranks in batches to avoid overwhelming the database
    console.log(`[Leaderboard] Updating ranks for ${updates.length} entries...`);
    
    for (const update of updates) {
      const { error: updateError } = await client
        .from('leaderboard')
        .update({ rank: update.rank })
        .eq('leaderboard_id', update.leaderboard_id);

      if (updateError) {
        console.error(`[Leaderboard] Error updating rank for entry ${update.leaderboard_id}:`, updateError);
      }
    }

    console.log('[Leaderboard] Rank recalculation completed');
  } catch (error: any) {
    console.error('[Leaderboard] Error in recalculateRanks:', error);
    throw error;
  }
}

// Update leaderboard points for a user
router.post('/update', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = req.user.id;
    const token = req.accessToken || req.headers.authorization?.split(' ')[1];
    
    console.log(`[Leaderboard API] Updating leaderboard for user: ${userId}`);
    console.log(`[Leaderboard API] Admin client available: ${!!supabaseAdmin}`);
    
    // ALWAYS use admin client to bypass RLS - this is critical
    if (!supabaseAdmin) {
      console.error('[Leaderboard API] ERROR: Admin client not available! Cannot update leaderboard.');
      return res.status(500).json({ 
        error: 'Admin client not configured. Please set SUPABASE_SERVICE_ROLE_KEY in backend .env file.' 
      });
    }

    // Use admin client to bypass RLS
    const client = supabaseAdmin;
    
    console.log(`[Leaderboard API] Using admin client for database operations`);

    // Calculate and update leaderboard points
    const result = await updateUserLeaderboardPoints(client, userId);
    
    console.log(`[Leaderboard API] Successfully updated: points=${result.points}, badge=${result.badge}`);
    
    // Recalculate ranks after updating points
    await recalculateRanks(client);
    
    // Fetch the updated rank for this user
    const { data: updatedEntry } = await client
      .from('leaderboard')
      .select('rank')
      .eq('user_id', userId)
      .maybeSingle();
    
    res.json({
      success: true,
      points: result.points,
      badge: result.badge,
      portfolioValue: result.portfolioValue,
      rank: updatedEntry?.rank || null
    });
  } catch (error: any) {
    console.error('[Leaderboard API] Error updating leaderboard:', error);
    console.error('[Leaderboard API] Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    res.status(500).json({ 
      error: error.message || 'Failed to update leaderboard',
      details: error.details || error.code || 'Unknown error'
    });
  }
});

// Update leaderboard points for all users (admin operation)
router.post('/update-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = req.accessToken || req.headers.authorization?.split(' ')[1];
    const client = supabaseAdmin || (token ? createUserClient(token) : null);
    
    if (!client) {
      return res.status(500).json({ error: 'Database client not available' });
    }

    // Fetch all users with portfolios
    const { data: portfolios, error: portfolioError } = await client
      .from('portfolios')
      .select('user_id');

    if (portfolioError) {
      throw portfolioError;
    }

    if (!portfolios || portfolios.length === 0) {
      return res.json({ success: true, updated: 0, message: 'No portfolios found' });
    }

    // Get unique user IDs
    const userIds = [...new Set(portfolios.map(p => p.user_id))];

    // Update leaderboard for each user
    const updates = await Promise.all(
      userIds.map(userId => 
        updateUserLeaderboardPoints(client, userId).catch(err => {
          console.error(`Error updating leaderboard for user ${userId}:`, err);
          return null;
        })
      )
    );

    const successful = updates.filter(u => u !== null).length;

    // Recalculate ranks after updating all users
    await recalculateRanks(client);

    res.json({
      success: true,
      updated: successful,
      total: userIds.length
    });
  } catch (error: any) {
    console.error('Error updating all leaderboards:', error);
    res.status(500).json({ error: error.message || 'Failed to update leaderboards' });
  }
});

// Get leaderboard (public endpoint, no auth required)
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('[Leaderboard API] GET /api/leaderboard - Request received');
    
    // Use admin client or public client
    const client = supabaseAdmin || supabase;
    
    if (!client) {
      console.error('[Leaderboard API] No database client available');
      return res.status(500).json({ error: 'Database client not available' });
    }

    // Fetch leaderboard with user info
    const { data: leaderboardData, error } = await client
      .from('leaderboard')
      .select(`
        leaderboard_id,
        user_id,
        points_total,
        rank,
        badge,
        users:users(name, email)
      `)
      .order('points_total', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[Leaderboard API] Error fetching leaderboard:', error);
      throw error;
    }

    // Transform the data to match frontend expectations
    const formattedData = (leaderboardData || []).map((entry: any) => ({
      leaderboard_id: entry.leaderboard_id,
      user_id: entry.user_id,
      points_total: entry.points_total || 0,
      rank: entry.rank || null,
      badge: entry.badge || null,
      user: entry.users ? {
        name: entry.users.name,
        email: entry.users.email
      } : null
    }));

    res.json({
      success: true,
      leaderboard: formattedData
    });
  } catch (error: any) {
    console.error('[Leaderboard API] Error fetching leaderboard:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch leaderboard',
      details: error.details || error.code 
    });
  }
});

// Recalculate ranks endpoint (useful for manual triggers)
router.post('/recalculate-ranks', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not available' });
    }

    await recalculateRanks(supabaseAdmin);

    res.json({
      success: true,
      message: 'Ranks recalculated successfully'
    });
  } catch (error: any) {
    console.error('[Leaderboard API] Error recalculating ranks:', error);
    res.status(500).json({ error: error.message || 'Failed to recalculate ranks' });
  }
});

export default router;

