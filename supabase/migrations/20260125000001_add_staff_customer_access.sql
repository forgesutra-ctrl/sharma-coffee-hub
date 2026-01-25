-- ============================================================================
-- ADD STAFF ACCESS TO CUSTOMER DATA
-- ============================================================================
-- This migration adds RLS policies to allow staff to view customer profiles
-- and customer addresses, matching admin permissions for orders and customers
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE - Allow staff to view all profiles
-- ============================================================================

-- Staff can view all profiles (same as admin)
CREATE POLICY "Staff can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

-- Staff can update profiles (for customer service purposes)
CREATE POLICY "Staff can update profiles"
  ON profiles FOR UPDATE
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
-- CUSTOMER_ADDRESSES TABLE - Allow staff to view all addresses
-- ============================================================================

-- Staff can view all customer addresses
CREATE POLICY "Staff can view all customer addresses"
  ON customer_addresses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

-- Staff can update customer addresses (for order fulfillment)
CREATE POLICY "Staff can update customer addresses"
  ON customer_addresses FOR UPDATE
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
-- CUSTOMER_SEGMENTS TABLE - Allow staff to view segments
-- ============================================================================

-- Staff can view customer segments
CREATE POLICY "Staff can view customer segments"
  ON customer_segments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );
