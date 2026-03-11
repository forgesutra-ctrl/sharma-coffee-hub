-- Allow staff and admins to read webhook_logs for subscription admin page
CREATE POLICY "Staff can view webhook logs"
ON webhook_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = (SELECT auth.uid())
    AND role IN ('super_admin', 'admin', 'staff')
  )
);
