/*
  # Add Super Admin and Staff Role Enum Values
  
  1. Changes
    - Add 'super_admin' to app_role enum
    - Add 'staff' to app_role enum
  
  2. Notes
    - This must be in a separate migration because enum values must be committed before use
    - Next migration will add the functions and policies using these new values
*/

-- Add 'super_admin' role to enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
END $$;

-- Add 'staff' role to enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'staff' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'staff';
  END IF;
END $$;
