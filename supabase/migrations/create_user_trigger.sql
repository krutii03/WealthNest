-- Create a trigger to automatically create a user profile in public.users
-- when a new user is created in auth.users

-- Step 1: Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id INT;
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Extract user data
  user_email := NEW.email;
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.user_metadata->>'full_name',
    NEW.user_metadata->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Check if user_id column is INT or TEXT/VARCHAR
  -- Try to insert with auto-generated INT first (using sequence)
  BEGIN
    -- Option 1: If user_id is INT with auto-increment/sequence
    INSERT INTO public.users (email, name, created_at)
    VALUES (user_email, user_name, NOW())
    RETURNING user_id INTO new_user_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Option 2: If user_id needs to be set manually or is TEXT
    BEGIN
      -- Try storing the UUID as text in user_id
      INSERT INTO public.users (user_id, email, name, created_at)
      VALUES (NEW.id::text, user_email, user_name, NOW())
      ON CONFLICT (user_id) DO NOTHING;
      
    EXCEPTION WHEN OTHERS THEN
      -- Option 3: Try with just email and name (let user_id be auto-generated)
      BEGIN
        INSERT INTO public.users (email, name, created_at)
        VALUES (user_email, user_name, NOW())
        ON CONFLICT (email) DO UPDATE SET
          name = COALESCE(EXCLUDED.name, users.name);
          
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Could not create user profile for %: %', user_email, SQLERRM;
      END;
    END;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Verify the trigger was created
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

