-- Add pending_payment to order_status enum for "store order before payment" pattern
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pending_payment'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE public.order_status ADD VALUE 'pending_payment';
  END IF;
END
$$;
