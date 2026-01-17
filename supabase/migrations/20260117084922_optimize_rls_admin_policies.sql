/*
  # Optimize Admin-Related RLS Policies - Part 3

  ## Overview
  Optimizes RLS policies for admin and product tables by wrapping auth.uid() in SELECT statements
  to prevent re-evaluation for each row.

  ## Tables Updated
  - wholesale_inquiries
  - chat_feedback
  - products
  - product_variants
  - categories
  - product_images
  - stock_change_logs
  - shipping_escalation_notes
  - subscription_plans
  - promotions
*/

-- ============================================================================
-- WHOLESALE_INQUIRIES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view wholesale inquiries" ON wholesale_inquiries;
CREATE POLICY "Admins can view wholesale inquiries"
  ON wholesale_inquiries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update wholesale inquiries" ON wholesale_inquiries;
CREATE POLICY "Admins can update wholesale inquiries"
  ON wholesale_inquiries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete wholesale inquiries" ON wholesale_inquiries;
CREATE POLICY "Admins can delete wholesale inquiries"
  ON wholesale_inquiries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- CHAT_FEEDBACK TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view chat feedback" ON chat_feedback;
CREATE POLICY "Admins can view chat feedback"
  ON chat_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete chat feedback" ON chat_feedback;
CREATE POLICY "Admins can delete chat feedback"
  ON chat_feedback FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can manage products" ON products;
CREATE POLICY "Super admins can manage products"
  ON products FOR ALL
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
-- PRODUCT_VARIANTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can manage variants" ON product_variants;
CREATE POLICY "Super admins can manage variants"
  ON product_variants FOR ALL
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
-- CATEGORIES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can view all categories" ON categories;
CREATE POLICY "Super admins can view all categories"
  ON categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Super admins can manage categories" ON categories;
CREATE POLICY "Super admins can manage categories"
  ON categories FOR ALL
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
-- PRODUCT_IMAGES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can manage product images" ON product_images;
CREATE POLICY "Super admins can manage product images"
  ON product_images FOR ALL
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
-- STOCK_CHANGE_LOGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Staff and admins can view stock logs" ON stock_change_logs;
CREATE POLICY "Staff and admins can view stock logs"
  ON stock_change_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Staff and admins can create stock logs" ON stock_change_logs;
CREATE POLICY "Staff and admins can create stock logs"
  ON stock_change_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete stock logs" ON stock_change_logs;
CREATE POLICY "Admins can delete stock logs"
  ON stock_change_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- SHIPPING_ESCALATION_NOTES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Staff and admins can view escalation notes" ON shipping_escalation_notes;
CREATE POLICY "Staff and admins can view escalation notes"
  ON shipping_escalation_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Staff and admins can create escalation notes" ON shipping_escalation_notes;
CREATE POLICY "Staff and admins can create escalation notes"
  ON shipping_escalation_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('staff', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete escalation notes" ON shipping_escalation_notes;
CREATE POLICY "Admins can delete escalation notes"
  ON shipping_escalation_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- SUBSCRIPTION_PLANS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can manage subscription plans" ON subscription_plans;
CREATE POLICY "Super admins can manage subscription plans"
  ON subscription_plans FOR ALL
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

DROP POLICY IF EXISTS "Admins can manage all subscription plans" ON subscription_plans;
CREATE POLICY "Admins can manage all subscription plans"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- PROMOTIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can manage promotions" ON promotions;
CREATE POLICY "Super admins can manage promotions"
  ON promotions FOR ALL
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
