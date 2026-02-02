-- Replace DTDC with Nimbuspost: add Nimbuspost columns, migrate AWB if present, drop DTDC column

-- Add Nimbuspost columns (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'nimbuspost_awb_number'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN nimbuspost_awb_number TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'nimbuspost_courier_name'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN nimbuspost_courier_name TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'nimbuspost_tracking_url'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN nimbuspost_tracking_url TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_status'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN shipping_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Migrate existing DTDC AWB to Nimbuspost column only if dtdc_awb_number exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'dtdc_awb_number'
  ) THEN
    UPDATE public.orders
    SET nimbuspost_awb_number = dtdc_awb_number,
        nimbuspost_tracking_url = 'https://sharmacoffeeworks.odrtrk.live/' || dtdc_awb_number
    WHERE dtdc_awb_number IS NOT NULL AND (nimbuspost_awb_number IS NULL OR nimbuspost_awb_number = '');
    ALTER TABLE public.orders DROP COLUMN dtdc_awb_number;
  END IF;
END $$;

-- Indexes for Nimbuspost
CREATE INDEX IF NOT EXISTS idx_orders_nimbuspost_awb ON public.orders(nimbuspost_awb_number);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON public.orders(shipping_status);

-- Drop old DTDC index if it was created with different name
DROP INDEX IF EXISTS idx_orders_dtdc_awb;
