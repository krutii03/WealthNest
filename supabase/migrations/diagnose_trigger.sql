-- Diagnostic queries to check trigger setup and user creation

-- 1. Check if the trigger exists
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  proname AS function_name,
  tgenabled AS enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass
  AND tgname = 'on_auth_user_created';

-- 2. Check if the function exists
SELECT 
  proname AS function_name,
  prosrc AS function_body
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = 'public'::regnamespace;

-- 3. Check recent auth users (last 10)
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check recent public users (last 10)
SELECT 
  user_id,
  email,
  name,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check if there are users in auth but not in public
SELECT 
  au.id AS auth_user_id,
  au.email AS auth_email,
  pu.user_id AS public_user_id,
  pu.email AS public_email
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.user_id
WHERE pu.user_id IS NULL
ORDER BY au.created_at DESC
LIMIT 10;

-- 6. Test the trigger function manually (replace with a test UUID)
-- Uncomment and use a real UUID to test:
/*
DO $$
DECLARE
  test_uuid UUID := '00000000-0000-0000-0000-000000000000'; -- Replace with actual UUID
BEGIN
  -- This simulates what the trigger does
  INSERT INTO public.users (user_id, email, name, created_at)
  VALUES (
    test_uuid,
    'test@example.com',
    'Test User',
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE NOTICE 'Test insert completed';
END $$;
*/

