-- Run this in Supabase Dashboard → SQL Editor (project cfuwclyvoemrutrcgxeq)
-- Creates shipments table and RLS policies. Safe to run (IF NOT EXISTS / DROP IF EXISTS).

-- Table
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  awb TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB,
  weight_kg NUMERIC NOT NULL DEFAULT 0.5,
  dimensions_cm JSONB,
  is_cod BOOLEAN DEFAULT false,
  cod_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'booked',
  tracking_status TEXT,
  last_tracking_update TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (from older or newer migrations)
DROP POLICY IF EXISTS "Admins can manage shipments" ON public.shipments;
DROP POLICY IF EXISTS "Users can view own shipments" ON public.shipments;
DROP POLICY IF EXISTS "Staff and admins can view shipments" ON public.shipments;
DROP POLICY IF EXISTS "Staff and admins can create shipments" ON public.shipments;
DROP POLICY IF EXISTS "Staff and admins can update shipments" ON public.shipments;
DROP POLICY IF EXISTS "Admins can delete shipments" ON public.shipments;

-- Policies (match 20260117084855 - use user_roles)
CREATE POLICY "Users can view own shipments"
  ON public.shipments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = shipments.order_id AND orders.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Staff and admins can view shipments"
  ON public.shipments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid()) AND role IN ('staff', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Staff and admins can create shipments"
  ON public.shipments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid()) AND role IN ('staff', 'admin', 'super_admin')
    )
  );

CREATE POLICY "Staff and admins can update shipments"
  ON public.shipments FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('staff', 'admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('staff', 'admin', 'super_admin'))
  );

CREATE POLICY "Admins can delete shipments"
  ON public.shipments FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin'))
  );

-- Trigger for updated_at (requires update_updated_at_column(); skip if you get "function does not exist")
DROP TRIGGER IF EXISTS update_shipments_updated_at ON public.shipments;
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_awb ON public.shipments(awb);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments(status);
