import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import { verifyRazorpaySignature } from '../utils/razorpay.util';
import { processDeposit } from './wallet.service';
import { VerifyPaymentDto } from '../models/dto';
import { isDatabaseAvailable } from './db.service';
import { supabaseAdmin } from '../config/supabase';
import { sendEmail, generateTransactionEmailHTML, TransactionEmailData } from './email.service';

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

export async function createOrder(amount: number): Promise<any> {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }

    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        description: `WealthNest deposit of ₹${amount}`,
      },
    };

    const order = await razorpay.orders.create(options);
    
    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    };
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    throw new Error(`Failed to create order: ${error.message}`);
  }
}

export async function verifyPayment(payload: VerifyPaymentDto): Promise<{ success: boolean; transactionId?: string; message?: string }> {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount, userId } = payload;

    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay key secret not configured');
    }

    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );

    if (!isValid) {
      return {
        success: false,
        message: 'Invalid payment signature',
      };
    }

    if (isDatabaseAvailable()) {
      const result = await processDeposit(userId, amount);
      
      // Send deposit confirmation email
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
            transactionType: 'deposit',
            assetName: 'Wallet Deposit',
            quantity: 1,
            price: amount,
            totalAmount: amount,
            transactionDate: new Date(),
            newWalletBalance: parseFloat(result.wallet.balance.toString()),
          };

          await sendEmail({
            to: userProfile.email,
            subject: 'Transaction Confirmation: Wallet Deposit',
            html: generateTransactionEmailHTML(emailData),
          });
        }
      } catch (emailError) {
        console.warn('[Payment Verify] Failed to send deposit email:', emailError);
      }
      
      return {
        success: true,
        transactionId: result.transactionId,
        message: 'Payment verified and deposit processed successfully',
      };
    } else {
      console.log('DATABASE_URL not configured, using Supabase deposit logic');
      
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not available. Please configure SUPABASE_SERVICE_ROLE_KEY in backend .env file.');
      }

      try {
        const { data: userProfile } = await supabaseAdmin
          .from('users')
          .select('user_id, id, email')
          .eq('user_id', userId)
          .maybeSingle();

        const userIdForWallet = (userProfile as any)?.user_id || userId;

        const { data: wallet, error: walletError } = await supabaseAdmin
          .from('wallets')
          .select('wallet_id, balance, currency, user_id')
          .eq('user_id', userIdForWallet)
          .maybeSingle();

        let walletId: number;
        let currentBalance = 0;

        if (walletError && walletError.code !== 'PGRST116') {
          console.error('Error fetching wallet:', walletError);
        }

        if (!wallet) {
          const { data: newWallet, error: createError } = await supabaseAdmin
            .from('wallets')
            .insert({
              user_id: userIdForWallet,
              balance: 0,
              currency: 'INR',
              updated_at: new Date().toISOString()
            })
            .select('wallet_id, balance')
            .single();

          if (createError || !newWallet) {
            console.error('Failed to create wallet:', createError);
            throw new Error(`Failed to create wallet: ${createError?.message || 'Unknown error'}`);
          }
          walletId = newWallet.wallet_id;
        } else {
          walletId = wallet.wallet_id;
          currentBalance = parseFloat(wallet.balance?.toString() || '0');
        }

        const newBalance = currentBalance + amount;

        const { data: updatedWallet, error: updateError } = await supabaseAdmin
          .from('wallets')
          .update({
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('wallet_id', walletId)
          .select('wallet_id, balance, currency')
          .single();

        if (updateError || !updatedWallet) {
          console.error('Failed to update wallet balance:', updateError);
          throw new Error(`Failed to update wallet balance: ${updateError?.message || 'Unknown error'}`);
        }

        let transactionId = `tx_${Date.now()}`;
        try {
          const { data: transaction, error: txError } = await supabaseAdmin
            .from('transactions')
            .insert({
              user_id: userIdForWallet,
              wallet_id: walletId,
              transaction_type: 'deposit',
              amount: amount,
              status: 'completed',
              created_at: new Date().toISOString()
            })
            .select('transaction_id')
            .single();

          if (transaction?.transaction_id) {
            transactionId = transaction.transaction_id.toString();
          }
        } catch (txError) {
          console.warn('Could not create transaction record (non-critical):', txError);
        }

        // Send deposit confirmation email
        try {
          if (userProfile?.email) {
            const userName = userProfile.name || userProfile.email.split('@')[0] || 'User';
            
            const emailData: TransactionEmailData = {
              userName,
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
        } catch (emailError) {
          console.warn('[Payment Verify] Failed to send deposit email:', emailError);
        }

        return {
          success: true,
          transactionId: transactionId,
          message: 'Payment verified and deposit processed successfully',
        };
      } catch (error: any) {
        console.error('Error processing Supabase deposit:', error);
        throw new Error(`Payment deposit failed: ${error.message || 'Unknown error'}`);
      }
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    throw new Error(`Payment verification failed: ${error.message}`);
  }
}

export async function handleWebhook(event: any): Promise<{ success: boolean; message?: string }> {
  try {
    if (event.event === 'payment.captured') {
      console.log('Payment captured:', event.payload.payment.entity);
      return {
        success: true,
        message: 'Payment captured event processed',
      };
    }

    return {
      success: true,
      message: 'Webhook event processed',
    };
  } catch (error: any) {
    console.error('Error handling webhook:', error);
    throw new Error(`Webhook processing failed: ${error.message}`);
  }
}

