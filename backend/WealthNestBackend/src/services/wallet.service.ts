import { v4 as uuidv4 } from 'uuid';
import { query, beginTransaction, commitTransaction, rollbackTransaction } from './db.service';
import { LedgerEntryDto } from '../models/dto';

export interface Wallet {
  wallet_id: string;
  user_id: string;
  balance: number;
  currency: string;
  updated_at: Date;
}

export async function getWalletByUserId(userId: string): Promise<Wallet | null> {
  try {
    const result = await query<Wallet>(
      `SELECT wallet_id, user_id, balance, currency, updated_at 
       FROM wallets 
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error getting wallet by user ID:', error);
    throw error;
  }
}

export async function updateWalletBalance(walletId: string, newBalance: number): Promise<Wallet> {
  try {
    const result = await query<Wallet>(
      `UPDATE wallets 
       SET balance = $1, updated_at = NOW() 
       WHERE wallet_id = $2 
       RETURNING wallet_id, user_id, balance, currency, updated_at`,
      [newBalance, walletId]
    );

    if (result.rows.length === 0) {
      throw new Error('Wallet not found');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error updating wallet balance:', error);
    throw error;
  }
}

export async function createTransaction(
  userId: string,
  walletId: string,
  transactionType: 'buy' | 'sell' | 'deposit' | 'withdraw',
  amount: number,
  assetId: string | null = null,
  quantity: number | null = null,
  status: 'pending' | 'completed' | 'failed' = 'completed'
): Promise<string> {
  try {
    const transactionId = uuidv4();
    
    await query(
      `INSERT INTO transactions (
        transaction_id, user_id, wallet_id, asset_id, 
        transaction_type, amount, quantity, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [transactionId, userId, walletId, assetId, transactionType, amount, quantity, status]
    );

    return transactionId;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

export async function createLedgerEntry(entry: LedgerEntryDto): Promise<string> {
  try {
    const ledgerId = uuidv4();
    
    await query(
      `INSERT INTO client_fund_ledger (
        ledger_id, user_id, transaction_id, wallet_id, 
        entry_type, amount, balance_after, fund_account_balance, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        ledgerId,
        entry.userId,
        entry.transactionId,
        entry.walletId,
        entry.entryType,
        entry.amount,
        entry.balanceAfter,
        entry.fundAccountBalance
      ]
    );

    return ledgerId;
  } catch (error) {
    console.error('Error creating ledger entry:', error);
    throw error;
  }
}

export async function getSystemFundBalance(): Promise<number> {
  try {
    const result = await query<{ total: number }>(
      `SELECT COALESCE(SUM(balance), 0) as total FROM wallets`
    );

    return parseFloat(result.rows[0]?.total?.toString() || '0');
  } catch (error) {
    console.error('Error getting system fund balance:', error);
    throw error;
  }
}

export async function processDeposit(
  userId: string,
  amount: number
): Promise<{ wallet: Wallet; transactionId: string; ledgerId: string }> {
  const client = await beginTransaction();
  
  try {
    let wallet = await getWalletByUserId(userId);
    
    if (!wallet) {
      const walletId = uuidv4();
      await client.query(
        `INSERT INTO wallets (wallet_id, user_id, balance, currency, updated_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [walletId, userId, 0, 'INR']
      );
      
      const result = await client.query<Wallet>(
        `SELECT wallet_id, user_id, balance, currency, updated_at 
         FROM wallets 
         WHERE wallet_id = $1`,
        [walletId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Failed to create wallet');
      }
      
      wallet = result.rows[0];
    }

    const newBalance = parseFloat(wallet.balance.toString()) + amount;
    const updateResult = await client.query<Wallet>(
      `UPDATE wallets 
       SET balance = $1, updated_at = NOW() 
       WHERE wallet_id = $2 
       RETURNING wallet_id, user_id, balance, currency, updated_at`,
      [newBalance, wallet.wallet_id]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('Failed to update wallet balance');
    }

    const updatedWallet = updateResult.rows[0];

    // Create transaction within transaction
    const transactionId = uuidv4();
    await client.query(
      `INSERT INTO transactions (
        transaction_id, user_id, wallet_id, asset_id, 
        transaction_type, amount, quantity, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [transactionId, userId, wallet.wallet_id, null, 'deposit', amount, null, 'completed']
    );

    const fundResult = await client.query<{ total: number }>(
      `SELECT COALESCE(SUM(balance), 0) as total FROM wallets`
    );
    const systemFundBalance = parseFloat(fundResult.rows[0]?.total?.toString() || '0');

    // Create ledger entry within transaction
    const ledgerId = uuidv4();
    await client.query(
      `INSERT INTO client_fund_ledger (
        ledger_id, user_id, transaction_id, wallet_id, 
        entry_type, amount, balance_after, fund_account_balance, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        ledgerId,
        userId,
        transactionId,
        wallet.wallet_id,
        'credit',
        amount,
        newBalance,
        systemFundBalance
      ]
    );

    await commitTransaction(client);

    return {
      wallet: updatedWallet,
      transactionId,
      ledgerId
    };
  } catch (error) {
    await rollbackTransaction(client);
    throw error;
  }
}

export async function processWithdraw(
  userId: string,
  amount: number
): Promise<{ wallet: Wallet; transactionId: string; ledgerId: string }> {
  const client = await beginTransaction();
  
  try {
    const wallet = await getWalletByUserId(userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const currentBalance = parseFloat(wallet.balance.toString());
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }

    const newBalance = currentBalance - amount;
    const updateResult = await client.query<Wallet>(
      `UPDATE wallets 
       SET balance = $1, updated_at = NOW() 
       WHERE wallet_id = $2 
       RETURNING wallet_id, user_id, balance, currency, updated_at`,
      [newBalance, wallet.wallet_id]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('Failed to update wallet balance');
    }

    const updatedWallet = updateResult.rows[0];

    // Create transaction within transaction
    const transactionId = uuidv4();
    await client.query(
      `INSERT INTO transactions (
        transaction_id, user_id, wallet_id, asset_id, 
        transaction_type, amount, quantity, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [transactionId, userId, wallet.wallet_id, null, 'withdraw', amount, null, 'completed']
    );

    const fundResult = await client.query<{ total: number }>(
      `SELECT COALESCE(SUM(balance), 0) as total FROM wallets`
    );
    const systemFundBalance = parseFloat(fundResult.rows[0]?.total?.toString() || '0');

    // Create ledger entry within transaction
    const ledgerId = uuidv4();
    await client.query(
      `INSERT INTO client_fund_ledger (
        ledger_id, user_id, transaction_id, wallet_id, 
        entry_type, amount, balance_after, fund_account_balance, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        ledgerId,
        userId,
        transactionId,
        wallet.wallet_id,
        'debit',
        amount,
        newBalance,
        systemFundBalance
      ]
    );

    await commitTransaction(client);

    return {
      wallet: updatedWallet,
      transactionId,
      ledgerId
    };
  } catch (error) {
    await rollbackTransaction(client);
    throw error;
  }
}

