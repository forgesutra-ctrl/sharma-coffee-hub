-- RPC for admin to get user emails from auth.users (profiles may be empty)
-- Only staff/admin can call this
CREATE OR REPLACE FUNCTION public.get_user_emails_for_admin(user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id AS user_id, au.email::text
  FROM auth.users au
  WHERE au.id = ANY(user_ids)
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('super_admin', 'admin', 'staff')
  );
$$;
