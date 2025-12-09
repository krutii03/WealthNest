// ensureUser.ts

import { supabase } from '../lib/supabaseClient';

export async function ensurePublicUserExists() {
  try {
    // First try to get session (faster and more reliable than getUser)
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    
    if (sessionErr || !session?.user) {
      // If no session, try getUser as fallback
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      
      if (userErr || !user) {
        // Silently return if no user - they're not authenticated yet
        return;
      }
      
      // Use the user from getUser
      await createUserProfile(user);
    } else {
      // Use the user from session
      await createUserProfile(session.user);
    }
  } catch (err) {
    console.error('ensurePublicUserExists error:', err);
  }
}

async function createUserProfile(user: any) {
  // First check if user already exists in database
  const { data: existingUser } = await supabase
    .from('users')
    .select('name, email')
    .eq('user_id', user.id)
    .maybeSingle();

  // Determine the name to use (name column has NOT NULL constraint):
  // 1. If user exists and has a valid name (not email), preserve it
  // 2. Otherwise, use name from user_metadata (set during signup)
  // 3. Otherwise, use email prefix as fallback (required by NOT NULL constraint)
  let name = '';
  
  if (existingUser) {
    // User exists - preserve existing name if it's valid (not the email)
    if (existingUser.name && existingUser.name !== existingUser.email && existingUser.name.trim() !== '') {
      name = existingUser.name;
    } else {
      // Existing user but name is invalid - try to get from metadata
      name = user.user_metadata?.full_name || user.user_metadata?.name || '';
      // If still empty, use email prefix as fallback (required by NOT NULL constraint)
      if (!name || name.trim() === '') {
        name = user.email?.split('@')[0] || 'User';
      }
    }
  } else {
    // User doesn't exist yet - use name from metadata (from signup form)
    name = user.user_metadata?.full_name || user.user_metadata?.name || '';
    // If still empty, use email prefix as fallback (required by NOT NULL constraint)
    if (!name || name.trim() === '') {
      name = user.email?.split('@')[0] || 'User';
    }
  }

  // Ensure name is never empty (satisfy NOT NULL constraint)
  if (!name || name.trim() === '') {
    name = user.email?.split('@')[0] || 'User';
  }

  // upsert public.users
  // Include password_hash if the table requires it (use a placeholder since auth handles passwords)
  const userData: any = { 
    user_id: user.id, 
    email: user.email,
    password_hash: 'managed-by-supabase-auth' // Required field
  };
  
  // Handle name based on whether user exists
  if (!existingUser) {
    // New user - always include name (NOT NULL constraint)
    userData.name = name;
  } else {
    // Existing user - only update name if it's invalid (equals email or empty)
    // But always include name in upsert to satisfy NOT NULL constraint
    if (!existingUser.name || existingUser.name.trim() === '' || existingUser.name === existingUser.email) {
      userData.name = name;
    } else {
      // Preserve existing valid name
      userData.name = existingUser.name;
    }
  }

  const { error: uErr } = await supabase
    .from('users')
    .upsert(userData, { onConflict: 'user_id' });

  if (uErr) {
    console.error('upsert users error', uErr);
    // If it's a password_hash error and we already added it, try without it
    if (uErr.message?.includes('password_hash')) {
      // Try again without password_hash - maybe it's auto-generated
      // Ensure name is always included (NOT NULL constraint)
      const retryData: any = { 
        user_id: user.id, 
        email: user.email 
      };
      // Always include name (NOT NULL constraint)
      if (existingUser && existingUser.name && existingUser.name !== existingUser.email && existingUser.name.trim() !== '') {
        retryData.name = existingUser.name;
      } else {
        retryData.name = name; // Use the computed name
      }
      const { error: retryErr } = await supabase
        .from('users')
        .upsert(retryData, { onConflict: 'user_id' });
      
      if (retryErr) {
        console.error('upsert users retry error', retryErr);
        return; // Don't continue if user creation fails
      }
    } else {
      return; // Don't continue if user creation fails
    }
  }

  // Check if wallet exists, create if it doesn't
  const { data: existingWallet } = await supabase
    .from('wallets')
    .select('wallet_id')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (!existingWallet) {
    const { error: walletErr } = await supabase
      .from('wallets')
      .insert({ user_id: user.id, balance: 0, currency: 'INR' });
    
    if (walletErr) {
      // Only log non-duplicate errors
      console.warn('wallet insert error:', walletErr.message);
    }
  }

  // Check if portfolio exists, create if it doesn't
  const { data: existingPortfolio } = await supabase
    .from('portfolios')
    .select('portfolio_id')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (!existingPortfolio) {
    const { error: portfolioErr } = await supabase
      .from('portfolios')
      .insert({ user_id: user.id });
    
    if (portfolioErr) {
      // Only log errors (portfolio might have been created by another process)
      console.warn('portfolio insert error:', portfolioErr.message);
    }
  }

  console.log('Ensured public rows for user', user.id);
}

