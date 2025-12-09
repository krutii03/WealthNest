import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { sendEmail, generateTransactionEmailHTML, TransactionEmailData } from '../services/email.service';

const router = Router();

// Manual payment verification endpoint
router.post('/manual-verify-payment', async (req: Request, res: Response) => {
  try {
    const { payment_id, order_id, amount, userId } = req.body;

    console.log('[Manual Verify] Checking payment:', payment_id);
    console.log('[Manual Verify] Order:', order_id);
    console.log('[Manual Verify] Amount:', amount);
    console.log('[Manual Verify] User:', userId);

    // Get user wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      ?.from('wallets')
      .select('wallet_id, balance, currency')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const currentBalance = parseFloat(wallet.balance?.toString() || '0');
    const newBalance = currentBalance + amount;

    // Update wallet
    const { data: updatedWallet, error: updateError } = await supabaseAdmin
      ?.from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_id', wallet.wallet_id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update wallet' });
    }

    // Create transaction record
    await supabaseAdmin
      ?.from('transactions')
      .insert({
        user_id: userId,
        wallet_id: wallet.wallet_id,
        transaction_type: 'deposit',
        amount: amount,
        status: 'completed',
        created_at: new Date().toISOString()
      });

    // Send email
    const { data: userProfile } = await supabaseAdmin
      ?.from('users')
      .select('name, email')
      .eq('user_id', userId)
      .single();

    if (userProfile?.email) {
      const emailData: TransactionEmailData = {
        userName: userProfile.name || 'User',
        userEmail: userProfile.email,
        transactionType: 'deposit',
        assetName: 'Wallet Deposit',
        quantity: 1,
        price: amount,
        totalAmount: amount,
        transactionDate: new Date(),
        newWalletBalance: newBalance,
      };

      await sendEmail({
        to: userProfile.email,
        subject: 'Transaction Confirmation: Wallet Deposit',
        html: generateTransactionEmailHTML(emailData),
      });
    }

    res.json({
      success: true,
      message: 'Payment manually verified and processed',
      newBalance: newBalance
    });

  } catch (error: any) {
    console.error('[Manual Verify] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

