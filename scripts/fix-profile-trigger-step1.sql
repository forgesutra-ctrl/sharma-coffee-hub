-- Step 1: Create/Update the handle_new_user function
-- Run this first in Supabase SQL Editor
-- Make sure to copy and paste the ENTIRE block from AS $$ to END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_email TEXT;
  user_full_name TEXT;
BEGIN
  user_email := COALESCE(NEW.email, '');
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(user_email, '@', 1),
    'User'
  );
  
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
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;
  
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create role for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
