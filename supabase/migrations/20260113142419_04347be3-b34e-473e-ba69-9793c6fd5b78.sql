-- Add COD eligibility to product_variants
ALTER TABLE public.product_variants
ADD COLUMN IF NOT EXISTS cod_enabled boolean DEFAULT true;

-- Add shipping and COD fields to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS pincode text,
ADD COLUMN IF NOT EXISTS shipping_region text,
ADD COLUMN IF NOT EXISTS shipping_charge numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'prepaid',
ADD COLUMN IF NOT EXISTS cod_advance_paid numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cod_handling_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cod_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS razorpay_order_id text,
ADD COLUMN IF NOT EXISTS razorpay_payment_id text;

-- Add variant_id to order_items if not exists (for variant-level tracking)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'variant_id') THEN
    ALTER TABLE public.order_items ADD COLUMN variant_id uuid REFERENCES public.product_variants(id);
  END IF;
END $$;

-- Create index for Razorpay order lookup
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON public.orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_pincode ON public.orders(pincode);