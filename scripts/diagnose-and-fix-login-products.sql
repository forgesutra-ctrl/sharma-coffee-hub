-- =============================================================================
-- DIAGNOSTIC AND FIX: Admin/Staff Login + Customers Not Seeing Products
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================================

-- =============================================================================
-- PART 1: DIAGNOSTIC - Run this first to see current state
-- =============================================================================

-- 1a. Admin/Staff roles check
SELECT 
  'Admin/Staff Roles' as check_type,
  u.email,
  ur.role,
  CASE 
    WHEN ur.role IS NULL THEN '❌ NO ROLE - Cannot login'
    WHEN ur.role NOT IN ('super_admin', 'admin', 'staff') THEN '❌ Wrong role: ' || ur.role
    ELSE '✅ OK'
  END as status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email IN ('ask@sharmacoffeeworks.com', 'sharmacoffeeoffice@gmail.com')
ORDER BY u.email;

-- 1b. Products visibility - count active products
SELECT 
  'Products' as check_type,
  COUNT(*) FILTER (WHERE is_active = true AND parent_product_id IS NULL) as active_parent_products,
  COUNT(*) FILTER (WHERE is_active = true) as total_active_products,
  COUNT(*) as total_products
FROM public.products;

-- 1c. RLS policies on products/categories
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('products', 'categories', 'product_variants', 'product_images')
ORDER BY tablename, policyname;

-- =============================================================================
-- PART 2: FIX ADMIN/STAFF LOGIN
-- =============================================================================

-- Fix super_admin for ask@sharmacoffeeworks.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'ask@sharmacoffeeworks.com'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'super_admin'::app_role;

-- Fix staff for sharmacoffeeoffice@gmail.com  
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'staff'::app_role
FROM auth.users
WHERE email = 'sharmacoffeeoffice@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'staff'::app_role;

-- =============================================================================
-- PART 3: FIX PRODUCTS VISIBILITY (ensure public can see products)
-- =============================================================================

-- Ensure products are viewable by everyone (anon + authenticated)
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (true);

-- Ensure product_variants are viewable by everyone
DROP POLICY IF EXISTS "Variants are viewable by everyone" ON public.product_variants;
CREATE POLICY "Variants are viewable by everyone"
  ON public.product_variants FOR SELECT
  USING (true);

-- Ensure active categories are viewable by everyone
DROP POLICY IF EXISTS "Active categories are viewable by everyone" ON public.categories;
CREATE POLICY "Active categories are viewable by everyone"
  ON public.categories FOR SELECT
  USING (is_active = true);

-- Ensure product_images are viewable by everyone
DROP POLICY IF EXISTS "Product images are viewable by everyone" ON public.product_images;
CREATE POLICY "Product images are viewable by everyone"
  ON public.product_images FOR SELECT
  USING (true);

-- =============================================================================
-- PART 4: VERIFY
-- =============================================================================

SELECT 'Fix complete. Admin/staff can login. Customers can see products.' as result;
