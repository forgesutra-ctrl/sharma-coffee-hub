/*
  # Optimize User-Facing RLS Policies - Part 1

  ## Overview
  Optimizes RLS policies for user-facing tables by wrapping auth.uid() in SELECT statements
  to prevent re-evaluation for each row.

  ## Tables Updated
  - profiles
  - user_roles
  - customer_addresses
  - customer_segments
  - subscriptions
  - user_subscriptions
  - promotion_usage
  - guest_sessions
*/

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- USER_ROLES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage roles" ON user_roles;
CREATE POLICY "Super admins can manage roles"
  ON user_roles FOR ALL
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

-- ============================================================================
-- CUSTOMER_ADDRESSES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own addresses" ON customer_addresses;
CREATE POLICY "Users can view own addresses"
  ON customer_addresses FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own addresses" ON customer_addresses;
CREATE POLICY "Users can insert own addresses"
  ON customer_addresses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own addresses" ON customer_addresses;
CREATE POLICY "Users can update own addresses"
  ON customer_addresses FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own addresses" ON customer_addresses;
CREATE POLICY "Users can delete own addresses"
  ON customer_addresses FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- CUSTOMER_SEGMENTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own segment" ON customer_segments;
CREATE POLICY "Users can view own segment"
  ON customer_segments FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage segments" ON customer_segments;
CREATE POLICY "Super admins can manage segments"
  ON customer_segments FOR ALL
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

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON subscriptions;
CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own subscriptions" ON subscriptions;
CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON subscriptions;
CREATE POLICY "Super admins can manage subscriptions"
  ON subscriptions FOR ALL
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

-- ============================================================================
-- USER_SUBSCRIPTIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can create own subscriptions"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can update own subscriptions"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Staff can view all subscriptions" ON user_subscriptions;
CREATE POLICY "Staff can view all subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

-- ============================================================================
-- PROMOTION_USAGE TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own promotion usage" ON promotion_usage;
CREATE POLICY "Users can view own promotion usage"
  ON promotion_usage FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own promotion usage" ON promotion_usage;
CREATE POLICY "Users can create own promotion usage"
  ON promotion_usage FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Staff can view all promotion usage" ON promotion_usage;
CREATE POLICY "Staff can view all promotion usage"
  ON promotion_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

-- ============================================================================
-- GUEST_SESSIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own claimed sessions" ON guest_sessions;
CREATE POLICY "Users can view own claimed sessions"
  ON guest_sessions FOR SELECT
  TO authenticated
  USING (claimed_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can claim unclaimed sessions" ON guest_sessions;
CREATE POLICY "Users can claim unclaimed sessions"
  ON guest_sessions FOR UPDATE
  TO authenticated
  USING (claimed_by IS NULL)
  WITH CHECK (claimed_by = (SELECT auth.uid()));
