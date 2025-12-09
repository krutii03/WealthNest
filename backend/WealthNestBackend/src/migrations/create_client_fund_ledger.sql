-- Create Client_Fund_Ledger table (UUID version)
-- This table tracks all fund movements (credits/debits) for audit and reconciliation

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.client_fund_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    transaction_id UUID NOT NULL,
    wallet_id UUID NOT NULL,
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('credit', 'debit')),
    amount DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    fund_account_balance DECIMAL(14,2) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_ledger_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_ledger_transaction FOREIGN KEY (transaction_id) REFERENCES public.transactions(transaction_id) ON DELETE CASCADE,
    CONSTRAINT fk_ledger_wallet FOREIGN KEY (wallet_id) REFERENCES public.wallets(wallet_id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON public.client_fund_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction_id ON public.client_fund_ledger(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_wallet_id ON public.client_fund_ledger(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_timestamp ON public.client_fund_ledger(timestamp);

-- Sample INSERT statements (using placeholder UUIDs - replace with actual UUIDs in production)
-- Example deposit ledger entry:
-- INSERT INTO public.client_fund_ledger (user_id, transaction_id, wallet_id, entry_type, amount, balance_after, fund_account_balance)
-- VALUES (
--     '00000000-0000-0000-0000-000000000001'::UUID,  -- user_id
--     '00000000-0000-0000-0000-000000000002'::UUID,  -- transaction_id
--     '00000000-0000-0000-0000-000000000003'::UUID,  -- wallet_id
--     'credit',
--     1000.00,
--     1000.00,  -- balance_after (new wallet balance)
--     1000.00   -- fund_account_balance (system total)
-- );

-- Example withdraw ledger entry:
-- INSERT INTO public.client_fund_ledger (user_id, transaction_id, wallet_id, entry_type, amount, balance_after, fund_account_balance)
-- VALUES (
--     '00000000-0000-0000-0000-000000000001'::UUID,  -- user_id
--     '00000000-0000-0000-0000-000000000004'::UUID,  -- transaction_id
--     '00000000-0000-0000-0000-000000000003'::UUID,  -- wallet_id
--     'debit',
--     500.00,
--     500.00,  -- balance_after (new wallet balance)
--     500.00   -- fund_account_balance (system total)
-- );

