-- ============================================================================
-- FIX ORDER CREATION RELIABILITY
-- ============================================================================
-- This migration improves order creation reliability by:
-- 1. Ensuring order_number is always generated (even if trigger fails)
-- 2. Making the trigger more robust
-- 3. Adding better error handling
-- ============================================================================

-- Improve generate_order_number function to handle edge cases
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $fn1$
DECLARE
  new_order_number text;
  retry_count int := 0;
  max_retries int := 5;
BEGIN
  -- Only generate if order_number is NULL or empty
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    -- Generate order number with retry logic for uniqueness
    LOOP
      new_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      
      -- Check if this order number already exists
      IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = new_order_number) THEN
        NEW.order_number := new_order_number;
        EXIT;
      END IF;
      
      retry_count := retry_count + 1;
      IF retry_count >= max_retries THEN
        -- Fallback: use timestamp + random to ensure uniqueness
        new_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        NEW.order_number := new_order_number;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$fn1$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- ============================================================================
-- IMPROVE PHONE NUMBER VALIDATION TO HANDLE NORMALIZATION
-- ============================================================================

-- Update validate_order_shipping_address to handle both phone formats
CREATE OR REPLACE FUNCTION public.validate_order_shipping_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $fn2$
DECLARE
  phone_val text;
  pincode_val text;
  full_name_val text;
  address_line1_val text;
  normalized_phone text;
BEGIN
  -- Skip validation if shipping_address is null
  IF NEW.shipping_address IS NULL THEN
    RETURN NEW;
  END IF;

  -- Extract values from JSONB (handle both camelCase and snake_case)
  phone_val := COALESCE(
    NEW.shipping_address->>'phone',
    NEW.shipping_address->>'Phone'
  );
  pincode_val := COALESCE(
    NEW.shipping_address->>'pincode',
    NEW.shipping_address->>'Pincode'
  );
  full_name_val := COALESCE(
    NEW.shipping_address->>'fullName',
    NEW.shipping_address->>'full_name',
    NEW.shipping_address->>'FullName'
  );
  address_line1_val := COALESCE(
    NEW.shipping_address->>'addressLine1',
    NEW.shipping_address->>'address_line1',
    NEW.shipping_address->>'AddressLine1'
  );

  -- Normalize phone number: remove +91, spaces, dashes, etc.
  IF phone_val IS NOT NULL THEN
    normalized_phone := regexp_replace(phone_val, '[^0-9]', '', 'g');
    
    -- If it starts with 91 and is 12 digits, remove the 91 prefix
    IF length(normalized_phone) = 12 AND normalized_phone LIKE '91%' THEN
      normalized_phone := substring(normalized_phone from 3);
    END IF;
    
    -- Update the shipping_address with normalized phone
    NEW.shipping_address := jsonb_set(
      NEW.shipping_address,
      '{phone}',
      to_jsonb(normalized_phone)
    );
    
    -- Validate normalized phone (Indian mobile: 10 digits starting with 6-9)
    IF normalized_phone !~ '^[6-9][0-9]{9}$' THEN
      RAISE EXCEPTION 'Invalid phone number format. Must be a valid 10-digit Indian mobile number. Received: %', phone_val;
    END IF;
  END IF;

  -- Validate pincode (Indian: 6 digits)
  IF pincode_val IS NOT NULL AND pincode_val !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'Invalid pincode format. Must be a valid 6-digit Indian pincode.';
  END IF;

  -- Validate full_name (2-100 characters, no special dangerous characters)
  IF full_name_val IS NOT NULL THEN
    IF length(full_name_val) < 2 OR length(full_name_val) > 100 THEN
      RAISE EXCEPTION 'Full name must be between 2 and 100 characters.';
    END IF;
    IF full_name_val ~ '[<>"\x00-\x1f]' THEN
      RAISE EXCEPTION 'Full name contains invalid characters.';
    END IF;
  END IF;

  -- Validate address_line1 (5-200 characters, no dangerous characters)
  IF address_line1_val IS NOT NULL THEN
    IF length(address_line1_val) < 5 OR length(address_line1_val) > 200 THEN
      RAISE EXCEPTION 'Address must be between 5 and 200 characters.';
    END IF;
    IF address_line1_val ~ '[<>"\x00-\x1f]' THEN
      RAISE EXCEPTION 'Address contains invalid characters.';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn2$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS validate_order_shipping_address_trigger ON public.orders;
CREATE TRIGGER validate_order_shipping_address_trigger
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_shipping_address();
