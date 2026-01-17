/*
  # Optimize Order-Related RLS Policies - Part 2

  ## Overview
  Optimizes RLS policies for order-related tables by wrapping auth.uid() in SELECT statements
  to prevent re-evaluation for each row.

  ## Tables Updated
  - orders
  - order_items
  - shipments
  - subscription_orders
*/

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all orders" ON orders;
CREATE POLICY "Super admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admins can update orders" ON orders;
CREATE POLICY "Super admins can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Staff can view orders" ON orders;
CREATE POLICY "Staff can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Staff can update order status" ON orders;
CREATE POLICY "Staff can update order status"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

-- ============================================================================
-- ORDER_ITEMS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;
CREATE POLICY "Users can insert own order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can view all order items" ON order_items;
CREATE POLICY "Super admins can view all order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Staff can view order items" ON order_items;
CREATE POLICY "Staff can view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

-- ============================================================================
-- SHIPMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own shipments" ON shipments;
CREATE POLICY "Users can view own shipments"
  ON shipments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = shipments.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff and admins can view shipments" ON shipments;
CREATE POLICY "Staff and admins can view shipments"
  ON shipments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Staff and admins can create shipments" ON shipments;
CREATE POLICY "Staff and admins can create shipments"
  ON shipments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Staff and admins can update shipments" ON shipments;
CREATE POLICY "Staff and admins can update shipments"
  ON shipments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete shipments" ON shipments;
CREATE POLICY "Admins can delete shipments"
  ON shipments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- SUBSCRIPTION_ORDERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own subscription orders" ON subscription_orders;
CREATE POLICY "Users can view own subscription orders"
  ON subscription_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_subscriptions.id = subscription_orders.subscription_id
      AND user_subscriptions.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create own subscription orders" ON subscription_orders;
CREATE POLICY "Users can create own subscription orders"
  ON subscription_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_subscriptions
      WHERE user_subscriptions.id = subscription_orders.subscription_id
      AND user_subscriptions.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff can view all subscription orders" ON subscription_orders;
CREATE POLICY "Staff can view all subscription orders"
  ON subscription_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );
