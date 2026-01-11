-- Create wholesale inquiries table for B2B leads
CREATE TABLE public.wholesale_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  business_type TEXT NOT NULL,
  products_interested TEXT[] DEFAULT '{}',
  estimated_volume TEXT,
  delivery_location TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wholesale_inquiries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit inquiries (public form)
CREATE POLICY "Anyone can submit wholesale inquiries"
ON public.wholesale_inquiries
FOR INSERT
WITH CHECK (true);

-- Only admins can view inquiries
CREATE POLICY "Admins can view wholesale inquiries"
ON public.wholesale_inquiries
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Only admins can update inquiries
CREATE POLICY "Admins can update wholesale inquiries"
ON public.wholesale_inquiries
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete inquiries
CREATE POLICY "Admins can delete wholesale inquiries"
ON public.wholesale_inquiries
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_wholesale_inquiries_updated_at
BEFORE UPDATE ON public.wholesale_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();