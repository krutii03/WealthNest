-- Ensure only one wallet per user
-- Add unique constraint on user_id in wallets table

-- Drop existing unique constraint if it exists (in case we need to recreate it)
DO $$
BEGIN
  -- Try to drop the constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'wallets_user_id_unique' 
    AND conrelid = 'public.wallets'::regclass
  ) THEN
    ALTER TABLE public.wallets DROP CONSTRAINT wallets_user_id_unique;
  END IF;
END $$;

-- Add unique constraint on user_id
ALTER TABLE public.wallets 
ADD CONSTRAINT wallets_user_id_unique UNIQUE (user_id);

-- Optional: Clean up duplicate wallets if any exist
-- This keeps only the most recent wallet for each user
DELETE FROM public.wallets w1
WHERE EXISTS (
  SELECT 1 FROM public.wallets w2
  WHERE w2.user_id = w1.user_id
  AND w2.wallet_id > w1.wallet_id
);

