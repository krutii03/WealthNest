-- Add change_percent column to assets table if it doesn't exist
-- This column stores the percentage change in price from the previous price update

-- Check if column exists before adding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'assets' 
        AND column_name = 'change_percent'
    ) THEN
        ALTER TABLE public.assets 
        ADD COLUMN change_percent DECIMAL(10,2) DEFAULT 0;
        
        COMMENT ON COLUMN public.assets.change_percent IS 'Percentage change in price from previous update';
    END IF;
END $$;

