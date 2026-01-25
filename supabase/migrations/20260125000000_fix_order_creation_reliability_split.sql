-- ============================================================================
-- FIX ORDER CREATION RELIABILITY (SPLIT VERSION)
-- ============================================================================
-- Run each section separately if the combined version fails
-- ============================================================================

-- ============================================================================
-- SECTION 1: Improve generate_order_number function
-- ============================================================================
-- Run this first
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $generate_order_number$
DECLARE
  new_order_number text;
  retry_count int := 0;
  max_retries int := 5;
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    LOOP
      new_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = new_order_number) THEN
        NEW.order_number := new_order_number;
        EXIT;
      END IF;
      retry_count := retry_count + 1;
      IF retry_count >= max_retries THEN
        new_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        NEW.order_number := new_order_number;
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$generate_order_number$;

-- ============================================================================
-- SECTION 2: Recreate trigger for order number
-- ============================================================================
-- Run this second
DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- ============================================================================
-- SECTION 3: Improve validate_order_shipping_address function
-- ============================================================================
-- Run this third
CREATE OR REPLACE FUNCTION public.validate_order_shipping_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $validate_address$
DECLARE
  phone_val text;
  pincode_val text;
  full_name_val text;
  address_line1_val text;
  normalized_phone text;
BEGIN
  IF NEW.shipping_address IS NULL THEN
    RETURN NEW;
  END IF;
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
  IF phone_val IS NOT NULL THEN
    normalized_phone := regexp_replace(phone_val, '[^0-9]', '', 'g');
    IF length(normalized_phone) = 12 AND normalized_phone LIKE '91%' THEN
      normalized_phone := substring(normalized_phone from 3);
    END IF;
    NEW.shipping_address := jsonb_set(
      NEW.shipping_address,
      '{phone}',
      to_jsonb(normalized_phone)
    );
    IF normalized_phone !~ '^[6-9][0-9]{9}$' THEN
      RAISE EXCEPTION 'Invalid phone number format. Must be a valid 10-digit Indian mobile number. Received: %', phone_val;
    END IF;
  END IF;
  IF pincode_val IS NOT NULL AND pincode_val !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'Invalid pincode format. Must be a valid 6-digit Indian pincode.';
  END IF;
  IF full_name_val IS NOT NULL THEN
    IF length(full_name_val) < 2 OR length(full_name_val) > 100 THEN
      RAISE EXCEPTION 'Full name must be between 2 and 100 characters.';
    END IF;
    IF full_name_val ~ '[<>"\x00-\x1f]' THEN
      RAISE EXCEPTION 'Full name contains invalid characters.';
    END IF;
  END IF;
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
$validate_address$;

-- ============================================================================
-- SECTION 4: Recreate trigger for address validation
-- ============================================================================
-- Run this fourth
DROP TRIGGER IF EXISTS validate_order_shipping_address_trigger ON public.orders;
CREATE TRIGGER validate_order_shipping_address_trigger
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_shipping_address();
