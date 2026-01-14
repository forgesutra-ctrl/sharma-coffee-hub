/*
  # Fix Staff Access to Shipping and Operations

  1. Changes
    - Update shipments table policies to allow staff access
    - Update shipping_escalation_notes table policies to allow staff access
    - Update stock_change_logs table policies to allow staff access
    
  2. Security
    - Staff can view, create, and update shipments
    - Staff can add and view escalation notes
    - Staff can create stock change logs (for inventory adjustments)
    - All policies use is_staff() function to verify staff role
*/

-- Drop existing admin-only policies for shipments
DROP POLICY IF EXISTS "Admins can manage shipments" ON shipments;

-- Create new policies for shipments (staff + admin + super_admin)
CREATE POLICY "Staff and admins can view shipments"
  ON shipments FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Staff and admins can create shipments"
  ON shipments FOR INSERT
  TO authenticated
  WITH CHECK (is_staff(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Staff and admins can update shipments"
  ON shipments FOR UPDATE
  TO authenticated
  USING (is_staff(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (is_staff(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can delete shipments"
  ON shipments FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Drop existing admin-only policies for shipping_escalation_notes
DROP POLICY IF EXISTS "Admins can manage escalation notes" ON shipping_escalation_notes;

-- Create new policies for shipping_escalation_notes (staff + admin + super_admin)
CREATE POLICY "Staff and admins can view escalation notes"
  ON shipping_escalation_notes FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Staff and admins can create escalation notes"
  ON shipping_escalation_notes FOR INSERT
  TO authenticated
  WITH CHECK (is_staff(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can delete escalation notes"
  ON shipping_escalation_notes FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Drop existing admin-only policies for stock_change_logs
DROP POLICY IF EXISTS "Admins can manage stock logs" ON stock_change_logs;

-- Create new policies for stock_change_logs (staff + admin + super_admin)
CREATE POLICY "Staff and admins can view stock logs"
  ON stock_change_logs FOR SELECT
  TO authenticated
  USING (is_staff(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Staff and admins can create stock logs"
  ON stock_change_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_staff(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Admins can delete stock logs"
  ON stock_change_logs FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));
