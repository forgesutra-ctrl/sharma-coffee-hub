-- Add DTDC AWB number column to orders table
-- This allows storing the tracking number directly on the order

DO $$
BEGIN
  -- Add dtdc_awb_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'dtdc_awb_number'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN dtdc_awb_number TEXT;
    
    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_orders_dtdc_awb ON public.orders(dtdc_awb_number);
  END IF;

  -- Add shipment_created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'shipment_created_at'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN shipment_created_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;
