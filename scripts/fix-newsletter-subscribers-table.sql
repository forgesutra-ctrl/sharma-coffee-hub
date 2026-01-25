-- Fix newsletter_subscribers table if it exists without is_active column
-- Run this BEFORE running the main migration if you get the is_active error

-- Add is_active column if it doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'newsletter_subscribers'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'newsletter_subscribers' 
      AND column_name = 'is_active'
    ) THEN
      ALTER TABLE public.newsletter_subscribers 
      ADD COLUMN is_active BOOLEAN DEFAULT true;
      
      -- Update existing rows to be active
      UPDATE public.newsletter_subscribers 
      SET is_active = true 
      WHERE is_active IS NULL;
    END IF;
  END IF;
END $$;

-- Drop the index if it exists with wrong definition
DROP INDEX IF EXISTS public.idx_newsletter_subscribers_active;

-- Create the index correctly
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active 
ON public.newsletter_subscribers(is_active) 
WHERE is_active = true;
