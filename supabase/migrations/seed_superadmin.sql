-- Seed script: Create superadmin
-- Replace email and supabase_user_id with actual values
-- Run this after creating the admin tables

-- Example: Insert superadmin (replace with actual values)
-- The supabase_user_id should match an existing auth.users.id if linking to Supabase auth
INSERT INTO public.admins (admin_id, name, email, role, supabase_user_id, is_active, created_at, updated_at)
VALUES (
  '5d7a149b-44e6-44ef-9cb0-5a9e9ed4bee5'::uuid,
  'Super Administrator',
  'krutippatel@yahoo.com',
  'superadmin'::admin_role,
  'c1e0a53d-65a5-48dc-9d76-9a500c1f46c4'::uuid,
  true,
  now(),
  now()
)
ON CONFLICT (email) 
DO UPDATE SET
  role = EXCLUDED.role,
  supabase_user_id = EXCLUDED.supabase_user_id,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Verify the insert
SELECT admin_id, name, email, role, is_active, created_at 
FROM public.admins 
WHERE email = 'krutippatel@yahoo.com';

