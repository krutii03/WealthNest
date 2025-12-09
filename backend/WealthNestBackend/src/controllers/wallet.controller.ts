import { Request, Response } from 'express';
import { getWalletByUserId, processWithdraw } from '../services/wallet.service';
import { WithdrawRequest } from '../models/dto';
import { isDatabaseAvailable } from '../services/db.service';
import { sendEmail, generateTransactionEmailHTML, TransactionEmailData } from '../services/email.service';
import { supabaseAdmin } from '../config/supabase';

export async function getWalletController(req: Request, res: Response): Promise<void> {
  try {
    if (!isDatabaseAvailable()) {
      res.status(503).json({ 
        error: 'PostgreSQL wallet service not available. DATABASE_URL environment variable is not configured.',
        fallback: 'Use /api/wallet/balance endpoint instead'
      });
      return;
    }

    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const wallet = await getWalletByUserId(userId);

    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }

    res.status(200).json({
      wallet_id: wallet.wallet_id,
      user_id: wallet.user_id,
      balance: parseFloat(wallet.balance.toString()),
      currency: wallet.currency,
      updated_at: wallet.updated_at,
    });
  } catch (error: any) {
    console.error('Error in getWalletController:', error);
    
    if (error.message?.includes('DATABASE_URL') || error.message?.includes('connection')) {
      res.status(503).json({ 
        error: 'Database connection unavailable',
        details: 'Please configure DATABASE_URL environment variable'
      });
      return;
    }
    
    res.status(500).json({ error: error.message || 'Failed to get wallet' });
  }
}

export async function withdrawController(req: Request, res: Response): Promise<void> {
  try {
    if (!isDatabaseAvailable()) {
      res.status(503).json({ 
        error: 'PostgreSQL wallet service not available. DATABASE_URL environment variable is not configured.',
        fallback: 'Use /api/wallet/withdraw endpoint from Supabase routes instead'
      });
      return;
    }

    const { amount, userId }: WithdrawRequest = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ error: 'Invalid amount. Amount must be a positive number.' });
      return;
    }

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const result = await processWithdraw(userId, amount);

    // Send withdraw confirmation email
    try {
      const { data: userProfile } = await supabaseAdmin
        ?.from('users')
        .select('user_id, email, name')
        .eq('user_id', userId)
        .maybeSingle() || { data: null };

      if (userProfile?.email) {
        const userName = userProfile.name || userProfile.email.split('@')[0] || 'User';
        
        const emailData: TransactionEmailData = {
          userName,
          userEmail: userProfile.email,
          transactionType: 'withdraw',
          assetName: 'Wallet Withdrawal',
          quantity: 1,
          price: amount,
          totalAmount: amount,
          transactionDate: new Date(),
          newWalletBalance: parseFloat(result.wallet.balance.toString()),
        };

        await sendEmail({
          to: userProfile.email,
          subject: 'Transaction Confirmation: Wallet Withdrawal',
          html: generateTransactionEmailHTML(emailData),
        });
      }
    } catch (emailError) {
      console.warn('[Withdraw] Failed to send withdrawal email:', emailError);
    }

    res.status(200).json({
      success: true,
      wallet: {
        wallet_id: result.wallet.wallet_id,
        user_id: result.wallet.user_id,
        balance: parseFloat(result.wallet.balance.toString()),
        currency: result.wallet.currency,
        updated_at: result.wallet.updated_at,
      },
      transactionId: result.transactionId,
      message: `Successfully withdrew ₹${amount.toLocaleString('en-IN')}`,
    });
  } catch (error: any) {
    console.error('Error in withdrawController:', error);
    
    if (error.message === 'Insufficient balance' || error.message === 'Wallet not found') {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: error.message || 'Failed to process withdrawal' });
  }
}

