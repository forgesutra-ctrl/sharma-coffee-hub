-- Create stock_change_logs table for inventory management
CREATE TABLE public.stock_change_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  change_amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  changed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_change_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can manage stock logs
CREATE POLICY "Admins can manage stock logs"
ON public.stock_change_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create shipping_escalation_notes table
CREATE TABLE public.shipping_escalation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipping_escalation_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage escalation notes
CREATE POLICY "Admins can manage escalation notes"
ON public.shipping_escalation_notes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for faster queries
CREATE INDEX idx_stock_logs_variant ON public.stock_change_logs(variant_id);
CREATE INDEX idx_stock_logs_created ON public.stock_change_logs(created_at DESC);
CREATE INDEX idx_escalation_notes_shipment ON public.shipping_escalation_notes(shipment_id);