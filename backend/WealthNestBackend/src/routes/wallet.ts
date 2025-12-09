import { Router } from 'express';
import { User } from '@supabase/supabase-js';
import { supabase, supabaseAdmin, createUserClient } from '../config/supabase';
import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { sendEmail, generateTransactionEmailHTML, TransactionEmailData } from '../services/email.service';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
      accessToken?: string;
    }
  }
}

const router = Router();

// Get wallet balance
router.get('/balance', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Set Content-Type header explicitly
    res.setHeader('Content-Type', 'application/json');
    
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Use the access token from the request (set by auth middleware)
    const token = req.accessToken || req.headers.authorization?.split(' ')[1];
    
    // Use admin client or user client for queries
    const client = supabaseAdmin || (token ? createUserClient(token) : supabase);

    // First, verify the user exists in users table (required for foreign key)
    // user_id is UUID type, matching auth.users.id
    let userProfile = null;
    
    // Use admin client for better RLS bypass - always use admin client first
    const queryClient = supabaseAdmin || client;
    
    // Try to find user using OR condition to check multiple fields at once
    if (!queryClient) {
      console.error('No database client available');
      return res.status(500).json({ error: 'Database client not available' });
    }
    
    // Try multiple queries in parallel for better performance
    const [userByUserId, userByIdColumn, userByEmail] = await Promise.all([
      queryClient
        .from('users')
        .select('user_id, id, email')
        .eq('user_id', req.user.id)
        .maybeSingle(),
      queryClient
        .from('users')
        .select('user_id, id, email')
        .eq('id', req.user.id)
        .maybeSingle(),
      req.user.email ? queryClient
        .from('users')
        .select('user_id, id, email')
        .eq('email', req.user.email)
        .maybeSingle() : Promise.resolve({ data: null, error: null })
    ]);
    
    // Use the first successful result
    if (userByUserId.data) {
      userProfile = userByUserId.data;
    } else if (userByIdColumn.data) {
      userProfile = userByIdColumn.data;
    } else if (userByEmail.data) {
      userProfile = userByEmail.data;
    }

    // If user profile still doesn't exist, try to create it before creating wallet
    if (!userProfile) {
      console.warn(`User profile not found for auth user ${req.user.id} - attempting to create it`);
      
      // Try to create the user profile using admin client
      if (!supabaseAdmin) {
        console.error('WARNING: SUPABASE_SERVICE_ROLE_KEY not set! User profile creation will likely fail due to RLS.');
      }
      const adminClient = supabaseAdmin || client;
      
      console.log('Attempting to create user profile in wallet route:', {
        user_id: req.user.id,
        email: req.user.email,
        name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email?.split('@')[0] || 'User'
      });
      
      // Use the same insert format as signup
      // Include password_hash as it's required by the schema
      const { error: insertError } = await adminClient.from("users").insert({
        user_id: req.user.id,
        name: req.user.user_metadata?.full_name || req.user.user_metadata?.name || req.user.email?.split('@')[0] || 'User',
        email: req.user.email || '',
        password_hash: 'managed-by-supabase-auth' // Placeholder since Supabase Auth handles passwords
      });
      
      if (insertError) {
        // If it's a duplicate key error, the user already exists - try to fetch it
        if (insertError.code === '23505' || insertError.message?.includes('duplicate key') || insertError.message?.includes('unique constraint')) {
          console.log('User profile already exists (duplicate key error), fetching it...');
          
          // Try to fetch the existing user by different methods
          let fetchedUser = null;
          
          // Try by user_id (UUID)
          const { data: userByUserId } = await adminClient
            .from('users')
            .select('user_id, id, email')
            .eq('user_id', req.user.id)
            .maybeSingle();
          
          if (userByUserId) {
            fetchedUser = userByUserId;
          } else {
            // Try by id column if it exists
            const { data: userById } = await adminClient
              .from('users')
              .select('user_id, id, email')
              .eq('id', req.user.id)
              .maybeSingle();
            
            if (userById) {
              fetchedUser = userById;
            } else {
              // Try by email
              const { data: userByEmail } = await adminClient
                .from('users')
                .select('user_id, id, email')
                .eq('email', req.user.email || '')
                .maybeSingle();
              
              if (userByEmail) {
                fetchedUser = userByEmail;
              }
            }
          }
          
          if (fetchedUser) {
            userProfile = fetchedUser;
            console.log('Found existing user profile - user_id:', fetchedUser.user_id || fetchedUser.id);
          } else {
            // User exists (duplicate error) but can't fetch it - use auth user ID directly
            // We know the user exists because insert failed with duplicate key
            console.log('User exists (duplicate key) but query failed - using auth user ID directly');
            userProfile = {
              user_id: req.user.id,
              id: req.user.id,
              email: req.user.email || ''
            };
          }
        } else {
          console.error('Failed to create user profile:', insertError);
          return res.status(500).json({ 
            error: 'Could not create user profile',
            details: insertError.message 
          });
        }
      } else {
        // Insert succeeded, fetch the created user
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const { data: newUserProfile, error: fetchError } = await adminClient
          .from('users')
          .select('user_id, id, email')
          .eq('user_id', req.user.id)
          .maybeSingle();
        
        if (fetchError || !newUserProfile) {
          console.error('Failed to fetch created user profile:', fetchError);
          return res.status(500).json({ 
            error: 'User profile created but could not be retrieved',
            details: fetchError?.message 
          });
        }
        
        userProfile = newUserProfile;
        console.log('Successfully created user profile as fallback:', newUserProfile.user_id);
      }
    }

    // Get the correct user_id from the profile
    const userIdForWallet = (userProfile as any).user_id || (userProfile as any).id || req.user.id;
    
    console.log(`Found user profile - user_id: ${userIdForWallet}, email: ${(userProfile as any).email}`);

    // Try to fetch wallet - use admin client if available for better RLS bypass
    const walletClient = supabaseAdmin || client;
    
    // Try multiple query strategies to find existing wallet
    // ALWAYS use admin client for wallet queries to bypass RLS
    let wallet = null;
    let walletQueryError = null;
    
    // Strategy 1: Use admin client first (if available) - this bypasses RLS
    if (supabaseAdmin) {
      console.log(`[Wallet] Querying wallet using admin client for user_id: ${userIdForWallet}`);
      const { data: walletByAdmin, error: adminError } = await supabaseAdmin
        .from('wallets')
        .select('wallet_id, balance, currency, user_id')
        .eq('user_id', userIdForWallet)
        .maybeSingle();
      
      if (walletByAdmin) {
        wallet = walletByAdmin;
        console.log(`[Wallet] Found wallet via admin client: balance=${wallet.balance}`);
        // Return immediately if wallet found
        console.log(`[Wallet] Returning existing wallet immediately - balance: ${wallet.balance}, currency: ${wallet.currency}`);
        return res.json({
          balance: parseFloat(wallet.balance?.toString() || '0'),
          currency: wallet.currency || 'INR'
        });
      } else if (adminError && adminError.code !== 'PGRST116') {
        walletQueryError = adminError;
        console.error(`[Wallet] Admin client query error:`, adminError);
      } else if (!walletByAdmin && !adminError) {
        // maybeSingle() returns null when no rows - this is expected if wallet doesn't exist
        console.log(`[Wallet] No wallet found via admin client (wallet doesn't exist yet)`);
      }
    }
    
    // Strategy 2: If admin client didn't find it and we have a user client, try that
    if (!wallet && !supabaseAdmin && client) {
      console.log(`[Wallet] Admin client not available, trying user client`);
      const { data: walletByUser, error: userError } = await client
        .from('wallets')
        .select('wallet_id, balance, currency, user_id')
        .eq('user_id', userIdForWallet)
        .maybeSingle();
      
      if (walletByUser) {
        wallet = walletByUser;
        console.log(`[Wallet] Found wallet via user client: balance=${wallet.balance}`);
        // Return immediately if wallet found
        console.log(`[Wallet] Returning existing wallet immediately - balance: ${wallet.balance}, currency: ${wallet.currency}`);
        return res.json({
          balance: parseFloat(wallet.balance?.toString() || '0'),
          currency: wallet.currency || 'INR'
        });
      } else if (userError && userError.code !== 'PGRST116') {
        walletQueryError = userError;
        console.error(`[Wallet] User client query error:`, userError);
      }
    }
    
    // Strategy 3: If admin client is available but didn't find it, try fetching all wallets (last resort)
    if (!wallet && supabaseAdmin) {
      try {
        console.log(`[Wallet] Fallback: Querying all wallets to find match`);
        const { data: allWallets, error: allError } = await supabaseAdmin
          .from('wallets')
          .select('wallet_id, balance, currency, user_id');
        
        if (!allError && allWallets && allWallets.length > 0) {
          // Find wallet matching user_id (try both UUID formats)
          const matchingWallet = allWallets.find((w: any) => {
            const wUserId = w.user_id?.toString();
            const targetUserId = userIdForWallet?.toString();
            return wUserId === targetUserId || 
                   (req.user && wUserId === req.user.id?.toString());
          });
          
          if (matchingWallet) {
            wallet = matchingWallet;
            console.log(`[Wallet] Found wallet via fallback query: balance=${wallet.balance}`);
            // Return immediately if wallet found
            console.log(`[Wallet] Returning existing wallet immediately - balance: ${wallet.balance}, currency: ${wallet.currency}`);
            return res.json({
              balance: parseFloat(wallet.balance?.toString() || '0'),
              currency: wallet.currency || 'INR'
            });
          } else {
            console.log(`[Wallet] Fallback query found ${allWallets.length} wallets but none match user_id: ${userIdForWallet}`);
          }
        }
      } catch (e: any) {
        console.error(`[Wallet] Fallback query failed:`, e.message);
        // Don't fail - just log and continue
      }
    }

    // Handle errors - only proceed to create if wallet truly doesn't exist
    if (walletQueryError) {
      const errorCode = (walletQueryError as any).code;
      const errorMessage = (walletQueryError as any).message || '';
      
      // If it's a "not found" error, that's fine - we'll create the wallet
      if (errorCode === 'PGRST116') {
        console.log('[Wallet] Wallet not found (PGRST116), will create new wallet');
      } else if (errorMessage.includes('row-level security') || errorCode === '42501') {
        // RLS error - this shouldn't happen if we used admin client, but handle it
        console.warn('[Wallet] RLS error encountered - this should not happen with admin client');
        if (!supabaseAdmin) {
          return res.status(500).json({ 
            error: 'Cannot access wallet due to RLS. Please set SUPABASE_SERVICE_ROLE_KEY in backend .env file.' 
          });
        }
        // If admin client exists but still got RLS error, something is wrong - continue anyway
      } else {
        console.error('[Wallet] Unexpected error fetching wallet:', walletQueryError);
        // For other errors, log but continue to wallet creation
      }
    }

    // Wallet doesn't exist - create one
    // ALWAYS use admin client for wallet creation to bypass RLS
    if (!supabaseAdmin) {
      console.error('[Wallet] Cannot create wallet - admin client not available');
      return res.status(500).json({ 
        error: 'Cannot create wallet. Please set SUPABASE_SERVICE_ROLE_KEY in backend .env file.' 
      });
    }
    
    console.log(`[Wallet] Creating new wallet for user: ${userIdForWallet}`);
    const defaultCurrency = 'INR';
    const defaultBalance = 0; // Initial balance for new users
    
    // Use UPSERT to ensure only one wallet per user (bypasses RLS)
    // This will insert if it doesn't exist, or return existing wallet if it does
    const { data: newWallet, error: createError } = await supabaseAdmin!
      .from('wallets')
      .upsert({ 
        user_id: userIdForWallet,
        balance: defaultBalance,
        currency: defaultCurrency,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select('wallet_id, balance, currency, user_id')
      .maybeSingle();
    
    if (createError) {
      console.error('[Wallet] Failed to create wallet:', createError);
      
      // If it's a duplicate/conflict, wallet already exists - try to fetch it again with admin client
      if (createError.code === '23505' || createError.message?.includes('duplicate') || createError.message?.includes('unique constraint')) {
        console.log('[Wallet] Duplicate key error - wallet already exists, fetching it...');
        
        // Use admin client to fetch the existing wallet - we already checked it exists above
        const { data: existingWallet, error: fetchError } = await supabaseAdmin!
          .from('wallets')
          .select('wallet_id, balance, currency, user_id')
          .eq('user_id', userIdForWallet)
          .maybeSingle();
        
        if (existingWallet) {
          console.log(`[Wallet] Found existing wallet after duplicate error: balance=${existingWallet.balance}`);
          return res.json({
            balance: parseFloat(existingWallet.balance?.toString() || '0'),
            currency: existingWallet.currency || 'INR'
          });
        } else if (fetchError) {
          console.error('[Wallet] Failed to fetch wallet after duplicate error:', fetchError);
          return res.status(500).json({ 
            error: 'Wallet creation conflict detected but could not fetch existing wallet',
            details: fetchError.message 
          });
        }
      }
      
      // If foreign key constraint, user profile might not match
      if (createError.message?.includes('foreign key constraint')) {
        console.error('Foreign key constraint error - user profile mismatch');
        return res.status(500).json({ 
          error: 'Could not create wallet - user profile mismatch',
          details: createError.message 
        });
      }
      
      // For other errors, return a default wallet so the app doesn't break
      console.warn('Returning default wallet due to creation error');
      return res.json({
        balance: defaultBalance,
        currency: defaultCurrency
      });
    }
    
    if (newWallet) {
      return res.json(newWallet);
    }
    
    // If creation succeeded but no wallet returned, return default
    return res.json({
      balance: defaultBalance,
      currency: defaultCurrency
    });
  } catch (error: any) {
    console.error('Wallet error:', error);
    
    // Return actual error, don't fake a wallet
    res.status(500).json({ 
      error: error.message || 'Failed to fetch wallet balance',
      details: error.details || error.code 
    });
  }
});

// Helper function to get current wallet balance
async function getCurrentWalletBalance(userId: string): Promise<{ wallet_id: number; balance: number; currency: string } | null> {
  if (!supabaseAdmin) return null;
  
  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('user_id, id, email')
    .eq('user_id', userId)
    .maybeSingle();

  const userIdForWallet = (userProfile as any)?.user_id || userId;

  const { data: wallet, error } = await supabaseAdmin
    .from('wallets')
    .select('wallet_id, balance, currency, user_id')
    .eq('user_id', userIdForWallet)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[Wallet] Error fetching wallet:', error);
    return null;
  }

  if (!wallet) {
    // Create wallet if it doesn't exist
    const { data: newWallet, error: createError } = await supabaseAdmin
      .from('wallets')
      .insert({
        user_id: userIdForWallet,
        balance: 0,
        currency: 'INR',
        updated_at: new Date().toISOString()
      })
      .select('wallet_id, balance, currency, user_id')
      .maybeSingle();

    if (createError) {
      console.error('[Wallet] Error creating wallet:', createError);
      return null;
    }

    return newWallet ? {
      wallet_id: newWallet.wallet_id,
      balance: parseFloat(newWallet.balance?.toString() || '0'),
      currency: newWallet.currency || 'INR'
    } : null;
  }

  return {
    wallet_id: wallet.wallet_id,
    balance: parseFloat(wallet.balance?.toString() || '0'),
    currency: wallet.currency || 'INR'
  };
}

// Deposit money
router.post('/deposit', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount. Amount must be a positive number.' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not available' });
    }

    // Get current wallet balance
    const wallet = await getCurrentWalletBalance(req.user.id);
    if (!wallet) {
      return res.status(500).json({ error: 'Failed to fetch or create wallet' });
    }

    console.log(`[Deposit] Current balance: ${wallet.balance}, Adding: ${amount}`);
    const currentBalance = wallet.balance;
    const newBalance = currentBalance + amount;

    // Update wallet balance using explicit UPDATE with WHERE clause
    const { data: updatedWallet, error: updateError } = await supabaseAdmin!
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_id', wallet.wallet_id)
      .select('wallet_id, balance, currency, user_id')
      .single();

    if (updateError || !updatedWallet) {
      console.error('[Deposit] Error updating wallet balance:', updateError);
      return res.status(500).json({ error: 'Failed to update wallet balance', details: updateError?.message });
    }

    console.log(`[Deposit] Updated balance: ${updatedWallet.balance}, Wallet ID: ${updatedWallet.wallet_id}`);

    // Verify the update by fetching again
    const { data: verifiedWallet } = await supabaseAdmin!
      .from('wallets')
      .select('balance, currency')
      .eq('wallet_id', wallet.wallet_id)
      .single();

    console.log(`[Deposit] Verified balance in DB: ${verifiedWallet?.balance}`);

    // Create transaction record (optional, don't fail if it errors)
    try {
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('user_id, id, email')
        .eq('user_id', req.user.id)
        .maybeSingle();

      const userIdForWallet = (userProfile as any)?.user_id || req.user.id;

      await supabaseAdmin!
        .from('transactions')
        .insert({
          user_id: userIdForWallet,
          wallet_id: wallet.wallet_id,
          transaction_type: 'deposit',
          amount: amount,
          status: 'completed',
          created_at: new Date().toISOString()
        });
    } catch (txError) {
      console.warn('[Deposit] Could not log deposit transaction:', txError);
    }

    // Send deposit confirmation email
    if (req.user?.email) {
      try {
        console.log(`[Deposit] Preparing to send email to ${req.user.email}...`);
        const { data: userProfile } = await supabaseAdmin
          ?.from('users')
          .select('name, email')
          .eq('email', req.user.email)
          .maybeSingle() || { data: null };

        const userName = userProfile?.name || req.user.email?.split('@')[0] || 'User';
        const finalBalance = parseFloat(updatedWallet.balance?.toString() || '0');

        console.log(`[Deposit] User: ${userName}, Email: ${req.user.email}, Amount: ₹${amount}`);

        const emailData: TransactionEmailData = {
          userName,
          userEmail: req.user.email,
          transactionType: 'deposit',
          assetName: 'Wallet Deposit',
          quantity: 1,
          price: amount,
          totalAmount: amount,
          transactionDate: new Date(),
          newWalletBalance: finalBalance,
        };

        const emailSent = await sendEmail({
          to: req.user.email,
          subject: 'Transaction Confirmation: Wallet Deposit',
          html: generateTransactionEmailHTML(emailData),
        });

        if (emailSent) {
          console.log(`[Deposit] ✅ Email sent successfully`);
        } else {
          console.warn(`[Deposit] ⚠️  Email was not sent (check SMTP configuration)`);
        }
      } catch (emailError: any) {
        console.error('[Deposit] ❌ Failed to send deposit email:', emailError?.message || emailError);
      }
    }

    const finalBalance = parseFloat(updatedWallet.balance?.toString() || '0');
    return res.json({
      success: true,
      balance: finalBalance,
      currency: updatedWallet.currency || 'INR',
      message: `Successfully deposited ₹${amount.toLocaleString('en-IN')}`
    });
  } catch (error: any) {
    console.error('[Deposit] Deposit error:', error);
    res.status(500).json({ error: error.message || 'Failed to process deposit' });
  }
});

// Withdraw money
router.post('/withdraw', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount. Amount must be a positive number.' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not available' });
    }

    // Get current wallet balance
    const wallet = await getCurrentWalletBalance(req.user.id);
    if (!wallet) {
      return res.status(500).json({ error: 'Failed to fetch wallet' });
    }

    console.log(`[Withdraw] Current balance: ${wallet.balance}, Subtracting: ${amount}`);
    const currentBalance = wallet.balance;
    
    if (currentBalance < amount) {
      return res.status(400).json({ 
        error: `Insufficient balance. Available: ₹${currentBalance.toLocaleString('en-IN')}, Requested: ₹${amount.toLocaleString('en-IN')}` 
      });
    }

    const newBalance = currentBalance - amount;

    // Update wallet balance using explicit UPDATE with WHERE clause
    const { data: updatedWallet, error: updateError } = await supabaseAdmin!
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_id', wallet.wallet_id)
      .select('wallet_id, balance, currency, user_id')
      .single();

    if (updateError || !updatedWallet) {
      console.error('[Withdraw] Error updating wallet balance:', updateError);
      return res.status(500).json({ error: 'Failed to update wallet balance', details: updateError?.message });
    }

    console.log(`[Withdraw] Updated balance: ${updatedWallet.balance}, Wallet ID: ${updatedWallet.wallet_id}`);

    // Verify the update by fetching again
    const { data: verifiedWallet } = await supabaseAdmin!
      .from('wallets')
      .select('balance, currency')
      .eq('wallet_id', wallet.wallet_id)
      .single();

    console.log(`[Withdraw] Verified balance in DB: ${verifiedWallet?.balance}`);

    // Create transaction record (optional, don't fail if it errors)
    try {
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('user_id, id, email')
        .eq('user_id', req.user.id)
        .maybeSingle();

      const userIdForWallet = (userProfile as any)?.user_id || req.user.id;

      await supabaseAdmin!
        .from('transactions')
        .insert({
          user_id: userIdForWallet,
          wallet_id: wallet.wallet_id,
          transaction_type: 'withdraw',
          amount: amount,
          status: 'completed',
          created_at: new Date().toISOString()
        });
    } catch (txError) {
      console.warn('[Withdraw] Could not log withdraw transaction:', txError);
    }

    // Send withdraw confirmation email
    if (req.user?.email) {
      try {
        console.log(`[Withdraw] Preparing to send email to ${req.user.email}...`);
        const { data: userProfile } = await supabaseAdmin
          ?.from('users')
          .select('name, email')
          .eq('email', req.user.email)
          .maybeSingle() || { data: null };

        const userName = userProfile?.name || req.user.email?.split('@')[0] || 'User';
        const finalBalance = parseFloat(updatedWallet.balance?.toString() || '0');

        console.log(`[Withdraw] User: ${userName}, Email: ${req.user.email}, Amount: ₹${amount}`);

        const emailData: TransactionEmailData = {
          userName,
          userEmail: req.user.email,
          transactionType: 'withdraw',
          assetName: 'Wallet Withdrawal',
          quantity: 1,
          price: amount,
          totalAmount: amount,
          transactionDate: new Date(),
          newWalletBalance: finalBalance,
        };

        const emailSent = await sendEmail({
          to: req.user.email,
          subject: 'Transaction Confirmation: Wallet Withdrawal',
          html: generateTransactionEmailHTML(emailData),
        });

        if (emailSent) {
          console.log(`[Withdraw] ✅ Email sent successfully`);
        } else {
          console.warn(`[Withdraw] ⚠️  Email was not sent (check SMTP configuration)`);
        }
      } catch (emailError: any) {
        console.error('[Withdraw] ❌ Failed to send withdrawal email:', emailError?.message || emailError);
      }
    }

    const finalBalance = parseFloat(updatedWallet.balance?.toString() || '0');
    return res.json({
      success: true,
      balance: finalBalance,
      currency: updatedWallet.currency || 'INR',
      message: `Successfully withdrew ₹${amount.toLocaleString('en-IN')}`
    });
  } catch (error: any) {
    console.error('[Withdraw] Withdraw error:', error);
    res.status(500).json({ error: error.message || 'Failed to process withdraw' });
  }
});

export default router;