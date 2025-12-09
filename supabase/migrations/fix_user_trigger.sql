-- Fix the function that creates users in public.users table
-- Replace password_hash with the correct fields

-- Replace YOUR_FUNCTION_NAME with your actual function name
-- Find it in Supabase Dashboard → Database → Functions

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
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  RAISE WARNING 'Could not create user profile: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- If created_at column doesn't exist, use this version instead:
-- (Remove the created_at field)
/*
CREATE OR REPLACE FUNCTION YOUR_FUNCTION_NAME()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (user_id, email, name)
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.user_metadata->>'full_name',
      NEW.user_metadata->>'name',
      split_part(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not create user profile: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/
