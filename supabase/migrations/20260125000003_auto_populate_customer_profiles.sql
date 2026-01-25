-- ============================================================================
-- AUTO-POPULATE CUSTOMER PROFILES FROM ORDERS
-- ============================================================================
-- This migration creates a function and trigger to automatically create/update
-- customer profiles when orders are placed, extracting data from shipping_address
-- ============================================================================

-- Function to create or update profile from order data
CREATE OR REPLACE FUNCTION public.sync_customer_profile_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn1$
DECLARE
  shipping_addr JSONB;
  customer_email TEXT;
  customer_phone TEXT;
  customer_name TEXT;
  customer_id UUID;
BEGIN
  -- Skip if shipping_address is null
  IF NEW.shipping_address IS NULL THEN
    RETURN NEW;
  END IF;

  shipping_addr := NEW.shipping_address;

  -- Extract customer information from shipping_address JSONB
  -- Handle both camelCase and snake_case field names
  customer_email := COALESCE(
    shipping_addr->>'email',
    shipping_addr->>'Email',
    shipping_addr->>'customerEmail'
  );
  
  customer_phone := COALESCE(
    shipping_addr->>'phone',
    shipping_addr->>'Phone',
    shipping_addr->>'phoneNumber',
    shipping_addr->>'customerPhone'
  );
  
  customer_name := COALESCE(
    shipping_addr->>'fullName',
    shipping_addr->>'full_name',
    shipping_addr->>'FullName',
    shipping_addr->>'customerName',
    shipping_addr->>'name'
  );

  -- If we have a user_id, use it; otherwise create a guest profile
  IF NEW.user_id IS NOT NULL THEN
    customer_id := NEW.user_id;
    
    -- Update existing profile with order data (if email/phone/name is missing)
    INSERT INTO public.profiles (id, email, full_name, phone, updated_at)
    VALUES (
      customer_id,
      COALESCE(customer_email, (SELECT email FROM auth.users WHERE id = customer_id)),
      COALESCE(customer_name, (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = customer_id)),
      COALESCE(customer_phone, NULL)
    )
    ON CONFLICT (id) DO UPDATE SET
      email = COALESCE(EXCLUDED.email, profiles.email),
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      updated_at = NOW();
  ELSE
    -- For guest orders, create a profile using email as identifier
    -- If email exists, use it to find/create profile
    IF customer_email IS NOT NULL AND customer_email != '' THEN
      -- Try to find existing profile by email
      SELECT id INTO customer_id
      FROM public.profiles
      WHERE email = customer_email
      LIMIT 1;

      -- If profile exists, update it
      IF customer_id IS NOT NULL THEN
        UPDATE public.profiles
        SET
          full_name = COALESCE(customer_name, profiles.full_name),
          phone = COALESCE(customer_phone, profiles.phone),
          updated_at = NOW()
        WHERE id = customer_id;
      ELSE
        -- Create new profile for guest customer
        -- Generate a UUID for the profile
        customer_id := gen_random_uuid();
        
        INSERT INTO public.profiles (id, email, full_name, phone, created_at, updated_at)
        VALUES (
          customer_id,
          customer_email,
          customer_name,
          customer_phone,
          NOW(),
          NOW()
        );
      END IF;
      
      -- Update the order with the profile ID (for future reference)
      -- Note: This requires the order to have a nullable user_id or we need a guest_profile_id column
      -- For now, we'll just ensure the profile exists
    END IF;
  END IF;

  RETURN NEW;
END;
$fn1$;

-- Create trigger to sync profile on order creation
DROP TRIGGER IF EXISTS sync_customer_profile_on_order ON public.orders;
CREATE TRIGGER sync_customer_profile_on_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_customer_profile_from_order();

-- ============================================================================
-- BACKFILL: Create profiles for existing orders
-- ============================================================================
-- This will create/update profiles for all existing orders
-- ============================================================================

-- For orders with user_id but missing profile data
INSERT INTO public.profiles (id, email, full_name, phone, created_at, updated_at)
SELECT DISTINCT
  o.user_id,
  COALESCE(
    o.shipping_address->>'email',
    o.shipping_address->>'Email',
    u.email
  ),
  COALESCE(
    o.shipping_address->>'fullName',
    o.shipping_address->>'full_name',
    o.shipping_address->>'customerName',
    u.raw_user_meta_data->>'full_name'
  ),
  COALESCE(
    o.shipping_address->>'phone',
    o.shipping_address->>'Phone',
    o.shipping_address->>'phoneNumber'
  ),
  MIN(o.created_at),
  NOW()
FROM public.orders o
LEFT JOIN auth.users u ON u.id = o.user_id
WHERE o.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = o.user_id)
GROUP BY o.user_id, u.email, u.raw_user_meta_data
ON CONFLICT (id) DO UPDATE SET
  email = COALESCE(EXCLUDED.email, profiles.email),
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
  phone = COALESCE(EXCLUDED.phone, profiles.phone),
  updated_at = NOW();

-- For guest orders (no user_id), create profiles based on email
-- Use a DO block to handle email-based profile creation/updates
DO $$
DECLARE
  order_rec RECORD;
  existing_profile_id UUID;
  new_profile_id UUID;
BEGIN
  FOR order_rec IN 
    SELECT DISTINCT
      shipping_address->>'email' as email,
      COALESCE(
        shipping_address->>'fullName',
        shipping_address->>'full_name',
        shipping_address->>'customerName',
        'Guest Customer'
      ) as full_name,
      COALESCE(
        shipping_address->>'phone',
        shipping_address->>'Phone',
        shipping_address->>'phoneNumber'
      ) as phone,
      MIN(created_at) as first_order_date
    FROM public.orders
    WHERE user_id IS NULL
      AND shipping_address IS NOT NULL
      AND shipping_address->>'email' IS NOT NULL
      AND shipping_address->>'email' != ''
    GROUP BY 
      shipping_address->>'email',
      shipping_address->>'fullName',
      shipping_address->>'full_name',
      shipping_address->>'customerName',
      shipping_address->>'phone',
      shipping_address->>'Phone',
      shipping_address->>'phoneNumber'
  LOOP
    -- Check if profile exists by email
    SELECT id INTO existing_profile_id
    FROM public.profiles
    WHERE email = order_rec.email
    LIMIT 1;

    IF existing_profile_id IS NULL THEN
      -- Create new profile
      new_profile_id := gen_random_uuid();
      INSERT INTO public.profiles (id, email, full_name, phone, created_at, updated_at)
      VALUES (
        new_profile_id,
        order_rec.email,
        order_rec.full_name,
        order_rec.phone,
        order_rec.first_order_date,
        NOW()
      );
    ELSE
      -- Update existing profile
      UPDATE public.profiles
      SET
        full_name = COALESCE(NULLIF(order_rec.full_name, 'Guest Customer'), profiles.full_name),
        phone = COALESCE(order_rec.phone, profiles.phone),
        updated_at = NOW()
      WHERE id = existing_profile_id;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- CREATE INDEX FOR EMAIL LOOKUPS (for guest customer matching)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email) WHERE email IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check how many profiles were created/updated
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as profiles_with_email,
  COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as profiles_with_name,
  COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as profiles_with_phone
FROM public.profiles;

-- Check orders without corresponding profiles
SELECT 
  COUNT(*) as orders_without_profile,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as authenticated_orders_without_profile,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as guest_orders_without_profile
FROM public.orders o
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE (o.user_id IS NOT NULL AND p.id = o.user_id)
     OR (o.user_id IS NULL AND p.email = o.shipping_address->>'email')
);
