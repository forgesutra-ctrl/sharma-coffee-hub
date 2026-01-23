-- Fix Order Items RLS Policies
-- Ensure admins can view all order items

-- 1. Check current policies
SELECT 
  policyname,
  cmd as operation,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'order_items'
ORDER BY policyname;

-- 2. Ensure RLS is enabled
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 3. Drop and recreate policies to ensure they work correctly
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "Super admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;

-- Recreate user policy
CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Recreate super_admin policy
CREATE POLICY "Super admins can view all order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role::text = 'super_admin'
    )
  );

-- Recreate staff policy
CREATE POLICY "Staff can view order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
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
WHERE tablename = 'order_items'
ORDER BY policyname;
