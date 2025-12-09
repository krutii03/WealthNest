-- Test script to manually insert a user and verify the schema
-- Replace the UUID and email with actual values from your auth.users table

-- 1. Check if a user exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Try to insert a test user profile manually
-- Replace 'YOUR-AUTH-USER-UUID' with an actual UUID from auth.users
/*
INSERT INTO public.users (user_id, email, name, created_at)
VALUES (
  'YOUR-AUTH-USER-UUID'::uuid,
  'test@example.com',
  'Test User',
  NOW()
);
*/

-- 3. Check if it was inserted
-- SELECT * FROM public.users WHERE email = 'test@example.com';

-- 4. Check the foreign key constraint details
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'wallets'
  AND kcu.column_name = 'user_id';

-- 5. Check users table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

