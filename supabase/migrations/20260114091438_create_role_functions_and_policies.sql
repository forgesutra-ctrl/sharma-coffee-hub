/*
  # Role-Based Access Control Functions and Policies
  
  1. New Functions
    - is_super_admin: Check if user is super_admin or admin
    - is_staff: Check if user is staff or shop_staff
    - has_admin_access: Check if user has any admin privileges
  
  2. Updated RLS Policies
    - Super admins: Full access to everything
    - Staff: Access to orders and shipping only (read/update)
    - Regular users: Existing permissions maintained
  
  3. Security Model
    - Super admin can: Manage products, categories, reports, all orders, customers
    - Staff can: View and update orders (operations and shipping)
    - Users can: View own data only
*/

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = _user_id 
    AND user_roles.role IN ('super_admin'::app_role, 'admin'::app_role)
  );
$$;

-- Create function to check if user is staff
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = _user_id 
    AND user_roles.role IN ('staff'::app_role, 'shop_staff'::app_role)
  );
$$;

-- Create function to check if user has admin access
CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = _user_id 
    AND user_roles.role IN ('super_admin'::app_role, 'admin'::app_role)
  );
$$;

-- Update products policies
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Super admins can manage products" 
  ON public.products FOR ALL 
  USING (public.is_super_admin(auth.uid()));

-- Update product variants policies
DROP POLICY IF EXISTS "Admins can manage variants" ON public.product_variants;
CREATE POLICY "Super admins can manage variants" 
  ON public.product_variants FOR ALL 
  USING (public.is_super_admin(auth.uid()));

-- Update user roles policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles" 
  ON public.user_roles FOR ALL 
  USING (public.is_super_admin(auth.uid()));

-- Update orders policies to support both super admin and staff
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

CREATE POLICY "Super admins can view all orders" 
  ON public.orders FOR SELECT 
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update orders" 
  ON public.orders FOR UPDATE 
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Staff can view orders" 
  ON public.orders FOR SELECT 
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update order status" 
  ON public.orders FOR UPDATE 
  USING (public.is_staff(auth.uid()));

-- Update order items policies
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;

CREATE POLICY "Super admins can view all order items" 
  ON public.order_items FOR SELECT 
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Staff can view order items" 
  ON public.order_items FOR SELECT 
  USING (public.is_staff(auth.uid()));

-- Update customer segments policies
DROP POLICY IF EXISTS "Admins can manage segments" ON public.customer_segments;
CREATE POLICY "Super admins can manage segments" 
  ON public.customer_segments FOR ALL 
  USING (public.is_super_admin(auth.uid()));

-- Update subscriptions policies
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Super admins can manage subscriptions" 
  ON public.subscriptions FOR ALL 
  USING (public.is_super_admin(auth.uid()));
