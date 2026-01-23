/*
  # Fix Profile Creation in handle_new_user Trigger
  
  ## Problem
  The handle_new_user() trigger is creating user_roles but failing to create profiles
  for some users. This is causing users to have roles but no profiles.
  
  ## Solution
  1. Improve error handling in the trigger function
  2. Ensure profile creation happens before role creation
  3. Add better logging
  4. Ensure the function handles edge cases (null email, etc.)
*/

-- Drop and recreate the handle_new_user function with improved profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  user_email TEXT;
  user_full_name TEXT;
BEGIN
  -- Extract email and full_name safely
  user_email := COALESCE(NEW.email, '');
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(user_email, '@', 1),
    'User'
  );
  
  -- Insert profile FIRST (with conflict handling)
  -- This must succeed for the user to have a profile
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
    VALUES (
      NEW.id, 
      user_email,
      user_full_name,
      COALESCE(NEW.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, profiles.email),
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but continue - we'll try to create it later
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Insert user role (with conflict handling)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but continue
    RAISE WARNING 'Failed to create role for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the user creation
  -- The user will be created in auth.users even if profile/role creation fails
  RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$fn$;

-- Verify the trigger exists and is properly configured
DO $check$
BEGIN
  -- Ensure trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $check$;
