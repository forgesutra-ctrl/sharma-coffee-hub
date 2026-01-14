/*
  # Fix Categories RLS Policies
  
  1. Updates
    - Update categories RLS policies to use new is_super_admin() function
    - Remove old policies that use has_role with 'admin'
    - Add new policies that work with super_admin and admin roles
  
  2. Security
    - Super admins can view and manage all categories
    - Public can view active categories
    - Staff cannot manage categories
*/

-- Drop old policies
DROP POLICY IF EXISTS "Admins can view all categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

-- Create new policies using is_super_admin function
CREATE POLICY "Super admins can view all categories"
ON public.categories
FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage categories"
ON public.categories
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Update product_images policies as well
DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;

CREATE POLICY "Super admins can manage product images"
ON public.product_images
FOR ALL
USING (public.is_super_admin(auth.uid()));
