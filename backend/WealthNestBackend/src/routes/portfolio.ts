import { Router, Request, Response, NextFunction } from 'express';
import { User } from '@supabase/supabase-js';
import { supabase, supabaseAdmin, createUserClient } from '../config/supabase';
import { authenticateToken } from '../middleware/auth';
import { updateUserLeaderboardPoints } from '../utils/leaderboard';
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

// Get user's portfolio
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get the correct user_id (INT) from users table
    const token = req.accessToken || req.headers.authorization?.split(' ')[1];
    const client = supabaseAdmin || (token ? createUserClient(token) : supabase);

    // Find user profile to get INT user_id
    const { data: userProfile } = await client
      .from('users')
      .select('user_id, id')
      .or(`id.eq.${req.user.id},user_id.eq.${req.user.id}`)
      .maybeSingle();

    if (!userProfile) {
      // User profile doesn't exist - return empty portfolio
      return res.json([]);
    }

    const userIdForQuery = (userProfile as any).user_id || (userProfile as any).id || req.user.id;

    // First, try to get the user's portfolio_id
    const { data: portfolioData, error: portfolioError } = await client
      .from('portfolios')
      .select('portfolio_id')
      .eq('user_id', userIdForQuery)
      .maybeSingle();

    // If no portfolio exists, return empty array
    if (!portfolioData || portfolioError) {
      return res.json([]);
    }

    // Now get the holdings with asset information using the correct foreign key
    // Try using PostgREST foreign key relationship syntax
    const { data: portfolio, error } = await client
      .from('portfolio_holdings')
      .select(`
        holding_id,
        quantity,
        average_price,
        asset_id,
        assets (
          asset_id,
          symbol,
          name,
          current_price,
          change_percent
        )
      `)
      .eq('portfolio_id', portfolioData.portfolio_id);

    if (error) {
      // If the relationship doesn't work, try a simpler query
      console.warn('Portfolio query error, trying alternative:', error);
      
      // Alternative: Get holdings and assets separately
      const { data: holdings, error: holdingsError } = await client
        .from('portfolio_holdings')
        .select('holding_id, quantity, average_price, asset_id')
        .eq('portfolio_id', portfolioData.portfolio_id);
      
      if (holdingsError) throw holdingsError;
      
      if (!holdings || holdings.length === 0) {
        return res.json([]);
      }

      // Get asset IDs
      const assetIds = holdings.map(h => h.asset_id).filter(Boolean);
      
      if (assetIds.length === 0) {
        return res.json(holdings.map(h => ({
          id: h.holding_id,
          quantity: h.quantity,
          average_price: h.average_price,
          asset: null
        })));
      }

      // Fetch assets
      const { data: assets, error: assetsError } = await client
        .from('assets')
        .select('asset_id, symbol, name, current_price, change_percent')
        .in('asset_id', assetIds);

      if (assetsError) {
        console.error('Assets fetch error:', assetsError);
      }

      // Combine holdings with assets
      const combined = holdings.map(holding => {
        const asset = assets?.find(a => a.asset_id === holding.asset_id);
        return {
          id: holding.holding_id,
          quantity: holding.quantity,
          average_price: holding.average_price,
          asset: asset ? {
            symbol: asset.symbol,
            name: asset.name,
            current_price: asset.current_price,
            change_percent: asset.change_percent || 0
          } : null
        };
      });

      return res.json(combined);
    }

    // Transform the response to match expected format
    const transformed = portfolio?.map((item: any) => ({
      id: item.holding_id || item.id,
      quantity: item.quantity,
      average_price: item.average_price,
      asset: item.assets ? {
        symbol: item.assets.symbol,
        name: item.assets.name,
        current_price: item.assets.current_price,
        change_percent: item.assets.change_percent || 0
      } : null
    })) || [];

    res.json(transformed);
  } catch (error: any) {
    console.error('Portfolio error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add to portfolio
router.post('/add', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { symbol, quantity, price } = req.body;
    
    // Get or create asset
    const { data: asset } = await supabase
      .from('assets')
      .select('symbol')
      .eq('symbol', symbol)
      .single();

    if (!asset) {
      await supabase
        .from('assets')
        .insert([{ 
          symbol,
          name: symbol,
          current_price: price,
          change_percent: 0,
          updated_at: new Date().toISOString()
        }]);
    }

    // Add to portfolio
    const { data, error } = await supabase
      .from('portfolio_holdings')
      .insert([{ 
        user_id: req.user.id,
        symbol,
        quantity,
        average_price: price,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Stock trading routes - must come BEFORE /:id route to avoid conflicts
// Buy stocks
router.post('/stocktrading/buy', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { symbol, quantity } = req.body;
    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid request. Symbol and positive quantity required.' });
    }

    // Get asset with current price
    // Try in order: regular client (might allow public reads) -> admin client -> user client
    let asset = null;
    let assetError = null;
    const symbolUpper = symbol.toUpperCase();
    
    // 1. Try regular client first (assets might be publicly readable)
    const { data: regularData, error: regularError } = await supabase
      .from('assets')
      .select('asset_id, symbol, name, current_price')
      .eq('symbol', symbolUpper)
      .maybeSingle();
    
    if (regularData) {
      asset = regularData;
    } else if (regularError && regularError.code !== 'PGRST116') {
      assetError = regularError;
    }
    
    // 2. If not found and admin available, try admin client (bypasses RLS)
    if (!asset && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('assets')
        .select('asset_id, symbol, name, current_price')
        .eq('symbol', symbolUpper)
        .maybeSingle();
      
      if (data) {
        asset = data;
      } else if (error && error.code !== 'PGRST116') {
        assetError = error;
      }
    }
    
    // 3. If still not found, try user's authenticated client
    if (!asset && (!assetError || assetError.code === 'PGRST116')) {
      const token = req.accessToken || req.headers.authorization?.split(' ')[1];
      if (token) {
        const userClient = createUserClient(token);
        const { data, error } = await userClient
          .from('assets')
          .select('asset_id, symbol, name, current_price')
          .eq('symbol', symbolUpper)
          .maybeSingle();
        
        if (data) {
          asset = data;
        } else if (error && error.code !== 'PGRST116') {
          assetError = error;
        }
      }
    }

    // If asset doesn't exist, try to create it using static data
    if (!asset) {
      // Static asset data fallback
      const staticAssets: Record<string, { name: string; price: number }> = {
        'AAPL': { name: 'Apple Inc.', price: 175.34 },
        'MSFT': { name: 'Microsoft Corporation', price: 315.76 },
        'GOOGL': { name: 'Alphabet Inc.', price: 135.45 },
        'AMZN': { name: 'Amazon.com, Inc.', price: 145.67 },
        'TSLA': { name: 'Tesla, Inc.', price: 210.45 }
      };

      const staticAsset = staticAssets[symbol.toUpperCase()];
      
      if (!staticAsset) {
        return res.status(404).json({ error: `Asset ${symbol} not found. Available stocks: AAPL, MSFT, GOOGL, AMZN, TSLA` });
      }

      // Try to create the asset using admin client (bypasses RLS)
      if (supabaseAdmin) {
        const { data: newAsset, error: createAssetError } = await supabaseAdmin
          .from('assets')
          .insert([{
            symbol: symbol.toUpperCase(),
            name: staticAsset.name,
            current_price: staticAsset.price
          }])
          .select('asset_id, symbol, name, current_price')
          .single();

        if (!createAssetError && newAsset) {
          asset = newAsset;
          console.log(`Successfully created asset ${symbol} using admin client`);
        } else {
          console.error('Admin client failed to create asset:', createAssetError);
        }
      }

      // If still no asset, we can't proceed - provide helpful error message
      if (!asset) {
        return res.status(500).json({ 
          error: `Asset ${symbol} does not exist in database and cannot be created automatically. Please either:
1. Add SUPABASE_SERVICE_ROLE_KEY to your backend .env file, OR
2. Call POST /api/assets/seed to populate assets, OR
3. Manually create the asset in your Supabase dashboard.` 
        });
      }
    }

    if (!asset || !asset.current_price) {
      return res.status(404).json({ error: `Asset ${symbol} has no price` });
    }

    const currentPrice = asset.current_price;
    const totalCost = currentPrice * quantity;

    // Get or create user's portfolio - use admin client if available, otherwise user client
    const token = req.accessToken || req.headers.authorization?.split(' ')[1];
    const portfolioClient = supabaseAdmin || (token ? createUserClient(token) : supabase);
    
    let { data: portfolio, error: portfolioError } = await portfolioClient
      .from('portfolios')
      .select('portfolio_id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!portfolio) {
      // Create portfolio if it doesn't exist
      const { data: newPortfolio, error: createError } = await portfolioClient
        .from('portfolios')
        .insert([{
          user_id: req.user.id,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        }])
        .select('portfolio_id')
        .single();

      if (createError) {
        console.error('Error creating portfolio:', createError);
        throw createError;
      }
      portfolio = newPortfolio;
    }

    // Get or create wallet using UPSERT to ensure only one wallet per user
    const { data: existingWallet, error: walletError } = await portfolioClient
      .from('wallets')
      .select('wallet_id, balance, currency, user_id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    let walletToUse = existingWallet;
    
    // If wallet doesn't exist, create it using UPSERT (ensures only one per user)
    if (!walletToUse) {
      const { data: newWallet, error: createWalletError } = await portfolioClient
        .from('wallets')
        .upsert({
          user_id: req.user.id,
          balance: 0,
          currency: 'INR',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select('wallet_id, balance, currency, user_id')
        .maybeSingle();
      
      if (createWalletError) {
        console.error('Error creating wallet:', createWalletError);
        throw createWalletError;
      }
      
      if (!newWallet) {
        throw new Error('Could not create or retrieve wallet');
      }
      
      walletToUse = newWallet;
    }

    // walletToUse is now guaranteed to be non-null
    const walletBalance = walletToUse.balance || 0;
    if (walletBalance < totalCost) {
      return res.status(400).json({ 
        error: `Insufficient funds. Required: ${totalCost.toFixed(2)}, Available: ${walletBalance.toFixed(2)}` 
      });
    }
    
    // Update wallet balance using explicit UPDATE
    const finalBalance = walletBalance - totalCost;
    console.log(`[Buy] Current balance: ${walletBalance}, Cost: ${totalCost}, New balance: ${finalBalance}`);
    
    const { data: updatedWallet, error: updateWalletError } = await portfolioClient
      .from('wallets')
      .update({ 
        balance: finalBalance,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_id', walletToUse.wallet_id)
      .select('wallet_id, balance, currency')
      .single();

    if (updateWalletError || !updatedWallet) {
      console.error('[Buy] Error updating wallet balance:', updateWalletError);
      throw updateWalletError || new Error('Failed to update wallet balance');
    }

    console.log(`[Buy] Wallet balance updated successfully: ${updatedWallet.balance}`);

    // Check if user already has this asset in portfolio
    const { data: existingHolding, error: holdingCheckError } = await portfolioClient
      .from('portfolio_holdings')
      .select('holding_id, quantity, average_price')
      .eq('portfolio_id', portfolio.portfolio_id)
      .eq('asset_id', asset.asset_id)
      .maybeSingle();

    if (holdingCheckError && holdingCheckError.code !== 'PGRST116') {
      throw holdingCheckError;
    }

    if (existingHolding) {
      // Update existing holding
      const newQuantity = existingHolding.quantity + quantity;
      const newAveragePrice = ((existingHolding.quantity * existingHolding.average_price) + (quantity * currentPrice)) / newQuantity;

      const { error: updateError } = await portfolioClient
        .from('portfolio_holdings')
        .update({
          quantity: newQuantity,
          average_price: newAveragePrice
        })
        .eq('holding_id', existingHolding.holding_id);

      if (updateError) {
        console.error('Error updating holding:', updateError);
        throw updateError;
      }
    } else {
      // Create new holding
      const { error: insertError } = await portfolioClient
        .from('portfolio_holdings')
        .insert([{
          portfolio_id: portfolio.portfolio_id,
          asset_id: asset.asset_id,
          quantity: quantity,
          average_price: currentPrice,
          created_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('Error creating holding:', insertError);
        throw insertError;
      }
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await portfolioClient
      .from('transactions')
      .insert([{
        user_id: req.user.id,
        wallet_id: walletToUse.wallet_id,
        asset_id: asset.asset_id,
        transaction_type: 'buy',
        quantity: quantity,
        amount: totalCost,
        status: 'completed',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (transactionError) {
      console.warn('Failed to create transaction record:', transactionError);
      // Don't fail the whole operation if transaction logging fails
    }

    // Update leaderboard points after trade
    try {
      await updateUserLeaderboardPoints(portfolioClient, req.user.id);
    } catch (lbError) {
      console.warn('Failed to update leaderboard points after buy:', lbError);
      // Don't fail the trade if leaderboard update fails
    }

    // Send transaction confirmation email
    if (req.user?.email && asset) {
      try {
        console.log(`[Buy Stock] Preparing to send email to ${req.user.email}...`);
        const { data: userProfile } = await portfolioClient
          .from('users')
          .select('name, email')
          .eq('email', req.user.email)
          .maybeSingle();

        const userName = userProfile?.name || req.user.email?.split('@')[0] || 'User';
        const newBalance = parseFloat(updatedWallet.balance?.toString() || finalBalance.toString());

        console.log(`[Buy Stock] User: ${userName}, Email: ${req.user.email}, Asset: ${asset.name}`);

        const emailData: TransactionEmailData = {
          userName,
          userEmail: req.user.email,
          transactionType: 'buy',
          assetName: asset.name,
          assetSymbol: asset.symbol,
          quantity,
          price: currentPrice,
          totalAmount: totalCost,
          transactionDate: new Date(),
          newWalletBalance: newBalance,
        };

        const emailSent = await sendEmail({
          to: req.user.email,
          subject: `Transaction Confirmation: Stock Purchase - ${asset.symbol}`,
          html: generateTransactionEmailHTML(emailData),
        });

        if (emailSent) {
          console.log(`[Buy Stock] ✅ Email sent successfully`);
        } else {
          console.warn(`[Buy Stock] ⚠️  Email was not sent (check SMTP configuration)`);
        }
      } catch (emailError: any) {
        console.error('[Buy Stock] ❌ Failed to send transaction email:', emailError?.message || emailError);
        // Don't fail the transaction if email fails
      }
    } else {
      console.warn(`[Buy Stock] ⚠️  Cannot send email: ${!req.user?.email ? 'No user email' : 'No asset data'}`);
    }

    res.json({
      success: true,
      message: `Successfully bought ${quantity} share(s) of ${symbol}`,
      transaction: transaction || null,
      newBalance: parseFloat(updatedWallet.balance?.toString() || finalBalance.toString())
    });
  } catch (error: any) {
    console.error('Error executing buy order:', error);
    res.status(500).json({ error: error.message || 'Failed to execute buy order' });
  }
});

// Sell stocks
router.post('/stocktrading/sell', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { symbol, quantity } = req.body;
    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid request. Symbol and positive quantity required.' });
    }

    // Get asset with current price
    // Try in order: regular client (might allow public reads) -> admin client -> user client
    let asset = null;
    let assetError = null;
    const symbolUpper = symbol.toUpperCase();
    
    // 1. Try regular client first (assets might be publicly readable)
    const { data: regularData, error: regularError } = await supabase
      .from('assets')
      .select('asset_id, symbol, name, current_price')
      .eq('symbol', symbolUpper)
      .maybeSingle();
    
    if (regularData) {
      asset = regularData;
    } else if (regularError && regularError.code !== 'PGRST116') {
      assetError = regularError;
    }
    
    // 2. If not found and admin available, try admin client (bypasses RLS)
    if (!asset && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('assets')
        .select('asset_id, symbol, name, current_price')
        .eq('symbol', symbolUpper)
        .maybeSingle();
      
      if (data) {
        asset = data;
      } else if (error && error.code !== 'PGRST116') {
        assetError = error;
      }
    }
    
    // 3. If still not found, try user's authenticated client
    if (!asset && (!assetError || assetError.code === 'PGRST116')) {
      const token = req.accessToken || req.headers.authorization?.split(' ')[1];
      if (token) {
        const userClient = createUserClient(token);
        const { data, error } = await userClient
          .from('assets')
          .select('asset_id, symbol, name, current_price')
          .eq('symbol', symbolUpper)
          .maybeSingle();
        
        if (data) {
          asset = data;
        } else if (error && error.code !== 'PGRST116') {
          assetError = error;
        }
      }
    }

    // If asset doesn't exist, try to create it using static data
    if (!asset) {
      // Static asset data fallback
      const staticAssets: Record<string, { name: string; price: number }> = {
        'AAPL': { name: 'Apple Inc.', price: 175.34 },
        'MSFT': { name: 'Microsoft Corporation', price: 315.76 },
        'GOOGL': { name: 'Alphabet Inc.', price: 135.45 },
        'AMZN': { name: 'Amazon.com, Inc.', price: 145.67 },
        'TSLA': { name: 'Tesla, Inc.', price: 210.45 }
      };

      const staticAsset = staticAssets[symbol.toUpperCase()];
      
      if (!staticAsset) {
        return res.status(404).json({ error: `Asset ${symbol} not found. Available stocks: AAPL, MSFT, GOOGL, AMZN, TSLA` });
      }

      // Try to create the asset using admin client (bypasses RLS)
      if (supabaseAdmin) {
        const { data: newAsset, error: createAssetError } = await supabaseAdmin
          .from('assets')
          .insert([{
            symbol: symbol.toUpperCase(),
            name: staticAsset.name,
            current_price: staticAsset.price
          }])
          .select('asset_id, symbol, name, current_price')
          .single();

        if (!createAssetError && newAsset) {
          asset = newAsset;
          console.log(`Successfully created asset ${symbol} using admin client`);
        } else {
          console.error('Admin client failed to create asset:', createAssetError);
        }
      }

      // If still no asset, we can't proceed - provide helpful error message
      if (!asset) {
        return res.status(500).json({ 
          error: `Asset ${symbol} does not exist in database and cannot be created automatically. Please either:
1. Add SUPABASE_SERVICE_ROLE_KEY to your backend .env file, OR
2. Call POST /api/assets/seed to populate assets, OR
3. Manually create the asset in your Supabase dashboard.` 
        });
      }
    }

    if (!asset || !asset.current_price) {
      return res.status(404).json({ error: `Asset ${symbol} has no price` });
    }

    const currentPrice = asset.current_price;
    const totalValue = currentPrice * quantity;

    // Get user's portfolio - use admin client if available, otherwise user client
    const token = req.accessToken || req.headers.authorization?.split(' ')[1];
    const portfolioClient = supabaseAdmin || (token ? createUserClient(token) : supabase);

    const { data: portfolio, error: portfolioError } = await portfolioClient
      .from('portfolios')
      .select('portfolio_id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found. You need to buy stocks first.' });
    }

    // Check if user has this holding
    const { data: holding, error: holdingError } = await portfolioClient
      .from('portfolio_holdings')
      .select('holding_id, quantity, average_price')
      .eq('portfolio_id', portfolio.portfolio_id)
      .eq('asset_id', asset.asset_id)
      .maybeSingle();

    if (holdingError || !holding) {
      return res.status(404).json({ error: `You don't own any ${symbol} stock` });
    }

    if (holding.quantity < quantity) {
      return res.status(400).json({
        error: `Insufficient shares. You own ${holding.quantity} shares, but trying to sell ${quantity}`
      });
    }

    // Get wallet using UPSERT to ensure only one wallet per user
    const { data: wallet, error: walletError } = await portfolioClient
      .from('wallets')
      .select('wallet_id, balance, currency, user_id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    let walletToUseInSell = wallet;
    
    // If wallet doesn't exist, create it using UPSERT
    if (!walletToUseInSell) {
      const { data: newWallet, error: createWalletError } = await portfolioClient
        .from('wallets')
        .upsert({
          user_id: req.user.id,
          balance: 0,
          currency: 'INR',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select('wallet_id, balance, currency, user_id')
        .maybeSingle();
      
      if (createWalletError || !newWallet) {
        console.error('Error creating wallet:', createWalletError);
        throw createWalletError || new Error('Could not create or retrieve wallet');
      }
      
      walletToUseInSell = newWallet;
    }

    const currentBalance = walletToUseInSell.balance || 0;
    const newBalance = currentBalance + totalValue;
    console.log(`[Sell] Current balance: ${currentBalance}, Adding: ${totalValue}, New balance: ${newBalance}`);
    
    const { data: updatedWallet, error: updateWalletError } = await portfolioClient
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_id', walletToUseInSell.wallet_id)
      .select('wallet_id, balance, currency')
      .single();

    if (updateWalletError || !updatedWallet) {
      console.error('[Sell] Error updating wallet balance:', updateWalletError);
      throw updateWalletError || new Error('Failed to update wallet balance');
    }

    console.log(`[Sell] Wallet balance updated successfully: ${updatedWallet.balance}`);

    // Update or delete holding
    const newQuantity = holding.quantity - quantity;
    if (newQuantity <= 0) {
      // Delete holding if quantity becomes 0
      const { error: deleteError } = await portfolioClient
        .from('portfolio_holdings')
        .delete()
        .eq('holding_id', holding.holding_id);

      if (deleteError) {
        console.error('Error deleting holding:', deleteError);
        throw deleteError;
      }
    } else {
      // Update holding quantity
      const { error: updateError } = await portfolioClient
        .from('portfolio_holdings')
        .update({
          quantity: newQuantity
        })
        .eq('holding_id', holding.holding_id);

      if (updateError) {
        console.error('Error updating holding:', updateError);
        throw updateError;
      }
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await portfolioClient
      .from('transactions')
      .insert([{
        user_id: req.user.id,
        wallet_id: walletToUseInSell.wallet_id,
        asset_id: asset.asset_id,
        transaction_type: 'sell',
        quantity: quantity,
        amount: totalValue,
        status: 'completed',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (transactionError) {
      console.warn('Failed to create transaction record:', transactionError);
      // Don't fail the whole operation if transaction logging fails
    }

    // Update leaderboard points after trade
    try {
      await updateUserLeaderboardPoints(portfolioClient, req.user.id);
    } catch (lbError) {
      console.warn('Failed to update leaderboard points after sell:', lbError);
      // Don't fail the trade if leaderboard update fails
    }

    // Send transaction confirmation email
    if (req.user?.email && asset) {
      try {
        console.log(`[Sell Stock] Preparing to send email to ${req.user.email}...`);
        const { data: userProfile } = await portfolioClient
          .from('users')
          .select('name, email')
          .eq('email', req.user.email)
          .maybeSingle();

        const userName = userProfile?.name || req.user.email?.split('@')[0] || 'User';
        const finalBalance = parseFloat(updatedWallet.balance?.toString() || newBalance.toString());

        console.log(`[Sell Stock] User: ${userName}, Email: ${req.user.email}, Asset: ${asset.name}`);

        const emailData: TransactionEmailData = {
          userName,
          userEmail: req.user.email,
          transactionType: 'sell',
          assetName: asset.name,
          assetSymbol: asset.symbol,
          quantity,
          price: currentPrice,
          totalAmount: totalValue,
          transactionDate: new Date(),
          newWalletBalance: finalBalance,
        };

        const emailSent = await sendEmail({
          to: req.user.email,
          subject: `Transaction Confirmation: Stock Sale - ${asset.symbol}`,
          html: generateTransactionEmailHTML(emailData),
        });

        if (emailSent) {
          console.log(`[Sell Stock] ✅ Email sent successfully`);
        } else {
          console.warn(`[Sell Stock] ⚠️  Email was not sent (check SMTP configuration)`);
        }
      } catch (emailError: any) {
        console.error('[Sell Stock] ❌ Failed to send transaction email:', emailError?.message || emailError);
        // Don't fail the transaction if email fails
      }
    } else {
      console.warn(`[Sell Stock] ⚠️  Cannot send email: ${!req.user?.email ? 'No user email' : 'No asset data'}`);
    }

    res.json({
      success: true,
      message: `Successfully sold ${quantity} share(s) of ${symbol}`,
      transaction: transaction || null,
      newBalance: parseFloat(updatedWallet.balance?.toString() || newBalance.toString())
    });
  } catch (error: any) {
    console.error('Error executing sell order:', error);
    res.status(500).json({ error: error.message || 'Failed to execute sell order' });
  }
});
// Get transaction history
router.get('/stocktrading/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = req.accessToken || req.headers.authorization?.split(' ')[1];
    const client = supabaseAdmin || (token ? createUserClient(token) : supabase);
    
    const limit = parseInt(req.query.limit as string) || 10;
    const days = parseInt(req.query.days as string) || 90;
    
    // Calculate date threshold (90 days ago)
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    
    // Try to fetch transactions with asset info
    const { data: transactions, error } = await client
      .from('transactions')
      .select(`
        transaction_id,
        asset_id,
        transaction_type,
        quantity,
        amount,
        status,
        created_at,
        assets (
          symbol,
          name
        )
      `)
      .eq('user_id', req.user.id)
      .gte('created_at', dateThreshold.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transaction history:', error);
      // Fallback to simple query without join
      const { data: simpleTransactions, error: simpleError } = await client
        .from('transactions')
        .select('*')
        .eq('user_id', req.user.id)
        .gte('created_at', dateThreshold.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (simpleError) throw simpleError;
      
      // Transform to expected format
      const formatted = (simpleTransactions || []).map((t: any) => ({
        id: t.transaction_id,
        symbol: 'N/A',
        quantity: t.quantity,
        price: t.amount ? (t.amount / t.quantity) : 0,
        type: t.transaction_type === 'buy' ? 'buy' : 'sell',
        created_at: t.created_at
      }));
      
      return res.json(formatted);
    }

    // Transform to expected format with asset info
    const formatted = (transactions || []).map((t: any) => ({
      id: t.transaction_id,
      symbol: t.assets?.symbol || 'N/A',
      quantity: t.quantity,
      price: t.amount ? (t.amount / t.quantity) : 0,
      type: t.transaction_type === 'buy' ? 'buy' : 'sell',
      created_at: t.created_at
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('Transaction history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mutual fund routes
// Invest in mutual fund
router.post('/funds/invest', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { asset_id, asset_name, amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid request. Investment amount must be positive.' });
    }

    if (!asset_id && !asset_name) {
      return res.status(400).json({ error: 'Invalid request. Either asset_id or asset_name is required.' });
    }

    // Get asset (mutual fund) with current NAV (price)
    const token = req.accessToken || req.headers.authorization?.split(' ')[1];
    const portfolioClient = supabaseAdmin || (token ? createUserClient(token) : supabase);
    
    let asset = null;
    
    // Try to get asset by asset_id or name
    if (asset_id) {
      const { data, error } = await portfolioClient
        .from('assets')
        .select('asset_id, symbol, name, current_price, asset_type')
        .eq('asset_id', asset_id)
        .maybeSingle();
      
      if (data) {
        asset = data;
      }
    } else if (asset_name) {
      const { data, error } = await portfolioClient
        .from('assets')
        .select('asset_id, symbol, name, current_price, asset_type')
        .eq('name', asset_name)
        .eq('asset_type', 'mutual_fund')
        .maybeSingle();
      
      if (data) {
        asset = data;
      }
    }

    if (!asset) {
      return res.status(404).json({ error: `Mutual fund not found` });
    }

    if (!asset.current_price || asset.current_price <= 0) {
      return res.status(400).json({ error: `Fund NAV is invalid or not available` });
    }

    const nav = asset.current_price;
    const units = amount / nav; // Calculate units from investment amount

    // Get or create user's portfolio
    let { data: portfolio, error: portfolioError } = await portfolioClient
      .from('portfolios')
      .select('portfolio_id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!portfolio) {
      // Create portfolio if it doesn't exist
      const { data: newPortfolio, error: createError } = await portfolioClient
        .from('portfolios')
        .insert([{
          user_id: req.user.id,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        }])
        .select('portfolio_id')
        .single();

      if (createError) {
        console.error('[Funds Invest] Error creating portfolio:', createError);
        throw createError;
      }
      portfolio = newPortfolio;
    }

    // Get or create wallet using UPSERT to ensure only one wallet per user
    const { data: existingWallet, error: walletError } = await portfolioClient
      .from('wallets')
      .select('wallet_id, balance, currency, user_id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    let walletToUse = existingWallet;
    
    if (!walletToUse) {
      const { data: newWallet, error: createWalletError } = await portfolioClient
        .from('wallets')
        .upsert({
          user_id: req.user.id,
          balance: 0,
          currency: 'INR',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select('wallet_id, balance, currency, user_id')
        .maybeSingle();
      
      if (createWalletError) {
        console.error('[Funds Invest] Error creating wallet:', createWalletError);
        throw createWalletError;
      }
      
      if (!newWallet) {
        throw new Error('Could not create or retrieve wallet');
      }
      
      walletToUse = newWallet;
    }

    const walletBalance = walletToUse.balance || 0;
    if (walletBalance < amount) {
      return res.status(400).json({ 
        error: `Insufficient funds. Required: ₹${amount.toLocaleString('en-IN')}, Available: ₹${walletBalance.toLocaleString('en-IN')}` 
      });
    }
    
    // Update wallet balance using explicit UPDATE
    const finalBalance = walletBalance - amount;
    console.log(`[Funds Invest] Current balance: ${walletBalance}, Investment: ${amount}, New balance: ${finalBalance}`);
    
    const { data: updatedWallet, error: updateWalletError } = await portfolioClient
      .from('wallets')
      .update({ 
        balance: finalBalance,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_id', walletToUse.wallet_id)
      .select('wallet_id, balance, currency')
      .single();

    if (updateWalletError || !updatedWallet) {
      console.error('[Funds Invest] Error updating wallet balance:', updateWalletError);
      throw updateWalletError || new Error('Failed to update wallet balance');
    }

    console.log(`[Funds Invest] Wallet balance updated successfully: ${updatedWallet.balance}`);

    // Check if user already has this fund in portfolio
    const { data: existingHolding, error: holdingCheckError } = await portfolioClient
      .from('portfolio_holdings')
      .select('holding_id, quantity, average_price')
      .eq('portfolio_id', portfolio.portfolio_id)
      .eq('asset_id', asset.asset_id)
      .maybeSingle();

    if (holdingCheckError && holdingCheckError.code !== 'PGRST116') {
      throw holdingCheckError;
    }

    if (existingHolding) {
      // Update existing holding (weighted average price)
      const newQuantity = existingHolding.quantity + units;
      const newAveragePrice = ((existingHolding.quantity * existingHolding.average_price) + amount) / newQuantity;

      const { error: updateError } = await portfolioClient
        .from('portfolio_holdings')
        .update({
          quantity: newQuantity,
          average_price: newAveragePrice
        })
        .eq('holding_id', existingHolding.holding_id);

      if (updateError) {
        console.error('[Funds Invest] Error updating holding:', updateError);
        throw updateError;
      }
    } else {
      // Create new holding
      const { error: insertError } = await portfolioClient
        .from('portfolio_holdings')
        .insert([{
          portfolio_id: portfolio.portfolio_id,
          asset_id: asset.asset_id,
          quantity: units,
          average_price: nav,
          created_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('[Funds Invest] Error creating holding:', insertError);
        throw insertError;
      }
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await portfolioClient
      .from('transactions')
      .insert([{
        user_id: req.user.id,
        wallet_id: walletToUse.wallet_id,
        asset_id: asset.asset_id,
        transaction_type: 'buy',
        quantity: units,
        amount: amount,
        status: 'completed',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (transactionError) {
      console.error('[Funds Invest] Failed to create transaction record:', transactionError);
      // Don't fail the whole operation if transaction logging fails, but log it
    } else {
      console.log('[Funds Invest] Transaction record created successfully');
    }

    // Update leaderboard points after investment
    try {
      await updateUserLeaderboardPoints(portfolioClient, req.user.id);
    } catch (lbError) {
      console.warn('[Funds Invest] Failed to update leaderboard points:', lbError);
      // Don't fail the investment if leaderboard update fails
    }

    // Send transaction confirmation email
    if (req.user?.email && asset) {
      try {
        console.log(`[Funds Invest] Preparing to send email to ${req.user.email}...`);
        const { data: userProfile } = await portfolioClient
          .from('users')
          .select('name, email')
          .eq('email', req.user.email)
          .maybeSingle();

        const userName = userProfile?.name || req.user.email?.split('@')[0] || 'User';
        const newBalance = parseFloat(updatedWallet.balance?.toString() || finalBalance.toString());

        console.log(`[Funds Invest] User: ${userName}, Email: ${req.user.email}`);

        const emailData: TransactionEmailData = {
          userName,
          userEmail: req.user.email,
          transactionType: 'invest',
          assetName: asset.name,
          assetSymbol: asset.symbol,
          quantity: units,
          price: nav,
          totalAmount: amount,
          transactionDate: new Date(),
          newWalletBalance: newBalance,
        };

        const emailSent = await sendEmail({
          to: req.user.email,
          subject: `Transaction Confirmation: Mutual Fund Investment - ${asset.name}`,
          html: generateTransactionEmailHTML(emailData),
        });

        if (emailSent) {
          console.log(`[Funds Invest] ✅ Email sent successfully`);
        } else {
          console.warn(`[Funds Invest] ⚠️  Email was not sent (check SMTP configuration)`);
        }
      } catch (emailError: any) {
        console.error('[Funds Invest] ❌ Failed to send transaction email:', emailError?.message || emailError);
        // Don't fail the transaction if email fails
      }
    } else {
      console.warn(`[Funds Invest] ⚠️  Cannot send email: ${!req.user?.email ? 'No user email' : 'No asset data'}`);
    }

    res.json({
      success: true,
      message: `Successfully invested ₹${amount.toLocaleString('en-IN')} in ${asset.name}`,
      transaction: transaction || null,
      units: units,
      nav: nav,
      newBalance: parseFloat(updatedWallet.balance?.toString() || finalBalance.toString())
    });
  } catch (error: any) {
    console.error('[Funds Invest] Error executing investment:', error);
    res.status(500).json({ error: error.message || 'Failed to execute investment' });
  }
});

// Redeem mutual fund
router.post('/funds/redeem', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { asset_id, asset_name, quantity } = req.body;
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid request. Quantity must be positive.' });
    }

    if (!asset_id && !asset_name) {
      return res.status(400).json({ error: 'Invalid request. Either asset_id or asset_name is required.' });
    }

    // Get asset (mutual fund) with current NAV (price)
    const token = req.accessToken || req.headers.authorization?.split(' ')[1];
    const portfolioClient = supabaseAdmin || (token ? createUserClient(token) : supabase);
    
    let asset = null;
    
    // Try to get asset by asset_id or name
    if (asset_id) {
      const { data, error } = await portfolioClient
        .from('assets')
        .select('asset_id, symbol, name, current_price, asset_type')
        .eq('asset_id', asset_id)
        .maybeSingle();
      
      if (data) {
        asset = data;
      }
    } else if (asset_name) {
      const { data, error } = await portfolioClient
        .from('assets')
        .select('asset_id, symbol, name, current_price, asset_type')
        .eq('name', asset_name)
        .eq('asset_type', 'mutual_fund')
        .maybeSingle();
      
      if (data) {
        asset = data;
      }
    }

    if (!asset) {
      return res.status(404).json({ error: `Mutual fund not found` });
    }

    if (!asset.current_price || asset.current_price <= 0) {
      return res.status(400).json({ error: `Fund NAV is invalid or not available` });
    }

    const nav = asset.current_price;
    const proceeds = nav * quantity; // Calculate redemption proceeds

    // Get user's portfolio
    const { data: portfolio, error: portfolioError } = await portfolioClient
      .from('portfolios')
      .select('portfolio_id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found. You need to invest in funds first.' });
    }

    // Check if user has this holding
    const { data: holding, error: holdingError } = await portfolioClient
      .from('portfolio_holdings')
      .select('holding_id, quantity, average_price')
      .eq('portfolio_id', portfolio.portfolio_id)
      .eq('asset_id', asset.asset_id)
      .maybeSingle();

    if (holdingError || !holding) {
      return res.status(404).json({ error: `You don't own any units of ${asset.name}` });
    }

    if (holding.quantity < quantity) {
      return res.status(400).json({
        error: `Insufficient units. You own ${holding.quantity.toFixed(4)} units, but trying to redeem ${quantity.toFixed(4)}`
      });
    }

    // Get or create wallet using UPSERT to ensure only one wallet per user
    const { data: existingWallet, error: walletError } = await portfolioClient
      .from('wallets')
      .select('wallet_id, balance, currency, user_id')
      .eq('user_id', req.user.id)
      .maybeSingle();

    let walletToUse = existingWallet;
    
    if (!walletToUse) {
      const { data: newWallet, error: createWalletError } = await portfolioClient
        .from('wallets')
        .upsert({
          user_id: req.user.id,
          balance: 0,
          currency: 'INR',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select('wallet_id, balance, currency, user_id')
        .maybeSingle();
      
      if (createWalletError || !newWallet) {
        console.error('[Funds Redeem] Error creating wallet:', createWalletError);
        throw createWalletError || new Error('Could not create or retrieve wallet');
      }
      
      walletToUse = newWallet;
    }

    const currentBalance = walletToUse.balance || 0;
    const newBalance = currentBalance + proceeds;
    console.log(`[Funds Redeem] Current balance: ${currentBalance}, Proceeds: ${proceeds}, New balance: ${newBalance}`);
    
    const { data: updatedWallet, error: updateWalletError } = await portfolioClient
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_id', walletToUse.wallet_id)
      .select('wallet_id, balance, currency')
      .single();

    if (updateWalletError || !updatedWallet) {
      console.error('[Funds Redeem] Error updating wallet balance:', updateWalletError);
      throw updateWalletError || new Error('Failed to update wallet balance');
    }

    console.log(`[Funds Redeem] Wallet balance updated successfully: ${updatedWallet.balance}`);

    // Update or delete holding
    const newQuantity = holding.quantity - quantity;
    if (newQuantity <= 0.0001) { // Small threshold for floating point comparison
      // Delete holding if quantity becomes 0
      const { error: deleteError } = await portfolioClient
        .from('portfolio_holdings')
        .delete()
        .eq('holding_id', holding.holding_id);

      if (deleteError) {
        console.error('[Funds Redeem] Error deleting holding:', deleteError);
        throw deleteError;
      }
    } else {
      // Update holding quantity
      const { error: updateError } = await portfolioClient
        .from('portfolio_holdings')
        .update({
          quantity: newQuantity
        })
        .eq('holding_id', holding.holding_id);

      if (updateError) {
        console.error('[Funds Redeem] Error updating holding:', updateError);
        throw updateError;
      }
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await portfolioClient
      .from('transactions')
      .insert([{
        user_id: req.user.id,
        wallet_id: walletToUse.wallet_id,
        asset_id: asset.asset_id,
        transaction_type: 'sell',
        quantity: quantity,
        amount: proceeds,
        status: 'completed',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (transactionError) {
      console.error('[Funds Redeem] Failed to create transaction record:', transactionError);
      // Don't fail the whole operation if transaction logging fails, but log it
    } else {
      console.log('[Funds Redeem] Transaction record created successfully');
    }

    // Update leaderboard points after redemption
    try {
      await updateUserLeaderboardPoints(portfolioClient, req.user.id);
    } catch (lbError) {
      console.warn('[Funds Redeem] Failed to update leaderboard points:', lbError);
      // Don't fail the redemption if leaderboard update fails
    }

    // Send transaction confirmation email
    if (req.user?.email && asset) {
      try {
        console.log(`[Funds Redeem] Preparing to send email to ${req.user.email}...`);
        const { data: userProfile } = await portfolioClient
          .from('users')
          .select('name, email')
          .eq('email', req.user.email)
          .maybeSingle();

        const userName = userProfile?.name || req.user.email?.split('@')[0] || 'User';
        const finalBalance = parseFloat(updatedWallet.balance?.toString() || newBalance.toString());

        console.log(`[Funds Redeem] User: ${userName}, Email: ${req.user.email}, Asset: ${asset.name}`);

        const emailData: TransactionEmailData = {
          userName,
          userEmail: req.user.email,
          transactionType: 'redeem',
          assetName: asset.name,
          assetSymbol: asset.symbol,
          quantity,
          price: nav,
          totalAmount: proceeds,
          transactionDate: new Date(),
          newWalletBalance: finalBalance,
        };

        const emailSent = await sendEmail({
          to: req.user.email,
          subject: `Transaction Confirmation: Mutual Fund Redemption - ${asset.name}`,
          html: generateTransactionEmailHTML(emailData),
        });

        if (emailSent) {
          console.log(`[Funds Redeem] ✅ Email sent successfully`);
        } else {
          console.warn(`[Funds Redeem] ⚠️  Email was not sent (check SMTP configuration)`);
        }
      } catch (emailError: any) {
        console.error('[Funds Redeem] ❌ Failed to send transaction email:', emailError?.message || emailError);
        // Don't fail the transaction if email fails
      }
    } else {
      console.warn(`[Funds Redeem] ⚠️  Cannot send email: ${!req.user?.email ? 'No user email' : 'No asset data'}`);
    }

    res.json({
      success: true,
      message: `Successfully redeemed ${quantity.toFixed(4)} units of ${asset.name} for ₹${proceeds.toLocaleString('en-IN')}`,
      transaction: transaction || null,
      proceeds: proceeds,
      nav: nav,
      newBalance: parseFloat(updatedWallet.balance?.toString() || newBalance.toString())
    });
  } catch (error: any) {
    console.error('[Funds Redeem] Error executing redemption:', error);
    res.status(500).json({ error: error.message || 'Failed to execute redemption' });
  }
});

export default router;