-- VERSION FOR INT user_id: Create trigger that generates INT user_id using sequence
-- Use this if your user_id column is INT and auto-incrementing

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create or get sequence for user_id if it doesn't exist
-- (Adjust the sequence name if yours is different, like users_user_id_seq)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'users_user_id_seq') THEN
    -- Create sequence if it doesn't exist
    CREATE SEQUENCE public.users_user_id_seq;
  END IF;
END $$;

-- Create function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_user_id INT;
BEGIN
  -- Insert user with auto-generated INT user_id
  -- The user_id will be generated automatically by the sequence/default
  INSERT INTO public.users (email, name, created_at)
  VALUES (
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
  RETURNING user_id INTO new_user_id
  ON CONFLICT (email) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, users.name);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail user creation
  RAISE WARNING 'Could not create user profile for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

