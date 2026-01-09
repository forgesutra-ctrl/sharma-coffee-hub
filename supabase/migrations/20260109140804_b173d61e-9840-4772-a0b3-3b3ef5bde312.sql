-- Create shipments table to store DTDC consignment data
CREATE TABLE public.shipments (
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

-- Enable RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "Admins can manage shipments"
  ON public.shipments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Users can view their own order shipments
CREATE POLICY "Users can view own shipments"
  ON public.shipments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = shipments.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX idx_shipments_awb ON public.shipments(awb);
CREATE INDEX idx_shipments_status ON public.shipments(status);