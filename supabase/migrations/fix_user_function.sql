-- Fix the function - remove password_hash field
-- Replace YOUR_FUNCTION_NAME with your actual function name

CREATE OR REPLACE FUNCTION YOUR_FUNCTION_NAME()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, email, name, created_at)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.user_metadata->>'full_name',
      NEW.user_metadata->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Instructions:
-- 1. Go to Supabase Dashboard → Database → Functions
-- 2. Find your function name (might be handle_new_user or similar)
-- 3. Replace YOUR_FUNCTION_NAME above with the actual function name
-- 4. Run this SQL in the SQL Editor
-- 
-- OR if created_at column doesn't exist:
-- Remove ", created_at" and ", NOW()" from the INSERT statement

