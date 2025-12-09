-- Fix trigger with better error handling and debugging
-- This version logs errors but doesn't fail user creation

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create function with comprehensive error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert the user profile
  BEGIN
    INSERT INTO public.users (user_id, email, name, created_at)
    VALUES (
      NEW.id,  -- Store UUID directly (user_id is UUID type)
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
    
    -- Log success
    RAISE NOTICE 'Successfully created user profile for % (user_id: %)', NEW.email, NEW.id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error with details but don't fail the auth user creation
    RAISE WARNING 'Failed to create user profile for % (user_id: %): %', 
      NEW.email, 
      NEW.id, 
      SQLERRM;
    RAISE WARNING 'SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
    
    -- Still return NEW to allow auth user creation to succeed
    RETURN NEW;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- Verify trigger was created
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  proname AS function_name,
  tgenabled AS enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

