-- TASK 2 Part 2: Create function to check shop_staff role
CREATE OR REPLACE FUNCTION public.is_shop_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = _user_id 
    AND user_roles.role = 'shop_staff'::app_role
  );
$$;