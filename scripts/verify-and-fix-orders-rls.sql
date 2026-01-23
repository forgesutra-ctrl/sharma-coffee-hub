-- Verify and Fix Orders RLS Policies
-- This ensures admins can view all orders

-- 1. Check current policies
SELECT 
  policyname,
  cmd as operation,
  roles,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- 2. Ensure RLS is enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 3. Drop conflicting policies and recreate them properly
-- Drop old policies that might conflict
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Super admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Super admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can view orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can update order status" ON public.orders;

-- Ensure super_admin SELECT policy exists and works
CREATE POLICY "Super admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role::text = 'super_admin'
    )
  );

-- Ensure super_admin UPDATE policy exists
CREATE POLICY "Super admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role::text = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role::text = 'super_admin'
    )
  );

-- Ensure staff SELECT policy exists and works
CREATE POLICY "Staff can view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role::text IN ('staff', 'admin', 'super_admin')
    )
  );

-- Ensure staff UPDATE policy exists
CREATE POLICY "Staff can update order status"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role::text IN ('staff', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role::text IN ('staff', 'admin', 'super_admin')
    )
  );

-- 4. Verify policies are created
SELECT 
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Has USING clause'
    ELSE '❌ Missing USING clause'
  END as status
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- 5. Test query - Check if super_admin role exists
SELECT 
  'Super Admin Role Check' as test_name,
  COUNT(*) as admin_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Super admin role found'
    ELSE '❌ No super admin role found'
  END as status
FROM public.user_roles
WHERE role::text = 'super_admin';

-- 6. Count total orders (this will respect RLS if run as authenticated user)
-- If run as service role, it will show all orders
SELECT 
  'Total Orders Count' as check_type,
  COUNT(*) as order_count
FROM public.orders;
