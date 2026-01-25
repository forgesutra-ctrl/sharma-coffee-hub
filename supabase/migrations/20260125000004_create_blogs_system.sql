-- ============================================================================
-- CREATE BLOGS SYSTEM
-- ============================================================================
-- This migration creates:
-- 1. blogs table for storing blog posts
-- 2. newsletter_subscribers table for storing email subscribers
-- 3. Trigger to send email notifications when blog is published
-- ============================================================================

-- ============================================================================
-- 1. CREATE BLOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  meta_title TEXT,
  meta_description TEXT,
  tags TEXT[],
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. CREATE NEWSLETTER SUBSCRIBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'website', -- 'website', 'admin', 'api'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add is_active column if table exists but column doesn't (for existing tables)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'newsletter_subscribers') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'newsletter_subscribers' 
      AND column_name = 'is_active'
    ) THEN
      ALTER TABLE public.newsletter_subscribers ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_blogs_slug ON public.blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON public.blogs(status);
CREATE INDEX IF NOT EXISTS idx_blogs_published_at ON public.blogs(published_at);
CREATE INDEX IF NOT EXISTS idx_blogs_author_id ON public.blogs(author_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);

-- Create partial index for active subscribers
-- This will only work if is_active column exists (which it should after table creation)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'newsletter_subscribers' 
    AND column_name = 'is_active'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'newsletter_subscribers' 
      AND indexname = 'idx_newsletter_subscribers_active'
    ) THEN
      CREATE INDEX idx_newsletter_subscribers_active 
      ON public.newsletter_subscribers(is_active) 
      WHERE is_active = true;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 4. ENABLE RLS
-- ============================================================================

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS POLICIES FOR BLOGS
-- ============================================================================

-- Everyone can view published blogs
CREATE POLICY "Published blogs are viewable by everyone"
  ON public.blogs FOR SELECT
  USING (status = 'published');

-- Admins can view all blogs
CREATE POLICY "Admins can view all blogs"
  ON public.blogs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can manage blogs
CREATE POLICY "Admins can manage blogs"
  ON public.blogs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================================================
-- 6. RLS POLICIES FOR NEWSLETTER SUBSCRIBERS
-- ============================================================================

-- Users can subscribe themselves
CREATE POLICY "Users can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- Admins can view all subscribers
CREATE POLICY "Admins can view all subscribers"
  ON public.newsletter_subscribers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Admins can manage subscribers
CREATE POLICY "Admins can manage subscribers"
  ON public.newsletter_subscribers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE TRIGGER update_blogs_updated_at
  BEFORE UPDATE ON public.blogs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_newsletter_subscribers_updated_at
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-set published_at when status changes to published
CREATE OR REPLACE FUNCTION public.set_blog_published_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn1$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    IF NEW.published_at IS NULL THEN
      NEW.published_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$fn1$;

CREATE TRIGGER set_blog_published_at_trigger
  BEFORE UPDATE ON public.blogs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_blog_published_at();

-- ============================================================================
-- 8. FUNCTION TO INCREMENT BLOG VIEW COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_blog_views(blog_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn3$
BEGIN
  UPDATE public.blogs
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = blog_id;
END;
$fn3$;

-- ============================================================================
-- 9. FUNCTION TO GENERATE SLUG FROM TITLE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_blog_slug(title_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $fn2$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug
  base_slug := lower(regexp_replace(title_text, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '^-|-$', '', 'g');
  
  -- Check if slug exists
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.blogs WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$fn2$;
