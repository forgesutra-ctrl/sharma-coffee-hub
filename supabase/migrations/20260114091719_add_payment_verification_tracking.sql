/*
  # Add Payment Verification Tracking
  
  1. New Fields
    - payment_verified: Boolean to track if payment was successfully verified
    - payment_verified_at: Timestamp when payment was verified
  
  2. Purpose
    - Ensure we can track which orders have verified payments
    - Add idempotency check using razorpay_order_id
    - Better audit trail for payment processing
*/

-- Add payment verification tracking fields
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;

-- Create unique index on razorpay_order_id to prevent duplicate orders
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id_unique 
ON public.orders(razorpay_order_id) 
WHERE razorpay_order_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.payment_verified IS 'Indicates if the payment has been verified via Razorpay signature check';
COMMENT ON COLUMN public.orders.payment_verified_at IS 'Timestamp when payment was verified';
