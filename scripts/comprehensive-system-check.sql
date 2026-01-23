-- Comprehensive System Check
-- Verifies all critical flows: admin login, customer signup, order visibility, RLS policies

-- ============================================================================
-- 1. CHECK USER ROLES AND PROFILES
-- ============================================================================
SELECT 
  'User Roles & Profiles Check' as check_type,
  COUNT(DISTINCT ur.user_id) as total_users_with_roles,
  COUNT(DISTINCT p.id) as total_profiles,
  COUNT(DISTINCT CASE WHEN ur.role::text IN ('super_admin', 'admin', 'staff') THEN ur.user_id END) as admin_staff_count,
  COUNT(DISTINCT CASE WHEN ur.role::text = 'customer' THEN ur.user_id END) as customer_count
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id;

-- Check for users with roles but missing profiles
SELECT 
  'Users Missing Profiles' as check_type,
  ur.user_id,
  ur.email,
  ur.role::text as role,
  CASE WHEN p.id IS NULL THEN '❌ Profile Missing' ELSE '✅ Profile Exists' END as status
FROM (
  SELECT ur.user_id, ur.role, au.email
  FROM public.user_roles ur
  LEFT JOIN auth.users au ON au.id = ur.user_id
) ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE p.id IS NULL
ORDER BY ur.role, ur.email;

-- ============================================================================
-- 2. CHECK RLS POLICIES FOR ORDERS
-- ============================================================================
SELECT 
  'Orders RLS Policies' as check_type,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Has USING clause'
    ELSE '❌ Missing USING clause'
  END as status
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- ============================================================================
-- 3. CHECK RLS POLICIES FOR ORDER_ITEMS
-- ============================================================================
SELECT 
  'Order Items RLS Policies' as check_type,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Has USING clause'
    ELSE '❌ Missing USING clause'
  END as status
FROM pg_policies
WHERE tablename = 'order_items'
ORDER BY policyname;

-- ============================================================================
-- 4. CHECK ORDERS AND ORDER ITEMS
-- ============================================================================
-- Total orders
SELECT 
  'Total Orders' as check_type,
  COUNT(*) as order_count,
  COUNT(DISTINCT user_id) as unique_customers,
  COUNT(CASE WHEN payment_type = 'cod' THEN 1 END) as cod_orders,
  COUNT(CASE WHEN payment_type = 'prepaid' THEN 1 END) as prepaid_orders
FROM public.orders;

-- Orders with items
SELECT 
  'Orders with Items' as check_type,
  COUNT(DISTINCT o.id) as orders_with_items
FROM public.orders o
INNER JOIN public.order_items oi ON oi.order_id = o.id;

-- Orders without items (potential issue)
SELECT 
  'Orders without Items' as check_type,
  COUNT(*) as order_count
FROM public.orders o
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id
);

-- ============================================================================
-- 5. CHECK ADMIN/STAFF ROLES
-- ============================================================================
SELECT 
  'Admin/Staff Role Check' as check_type,
  ur.user_id,
  au.email,
  ur.role::text as role,
  ur.created_at as role_created_at,
  CASE 
    WHEN ur.role::text IN ('super_admin', 'admin', 'staff') THEN '✅ Correct Role'
    ELSE '❌ Wrong Role: ' || ur.role::text
  END as status
FROM public.user_roles ur
LEFT JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role::text IN ('super_admin', 'admin', 'staff')
ORDER BY ur.role, au.email;

-- ============================================================================
-- 6. CHECK RECENT ORDERS (Last 10)
-- ============================================================================
SELECT 
  'Recent Orders' as check_type,
  o.id,
  o.order_number,
  o.user_id,
  o.payment_type,
  o.total_amount,
  o.created_at,
  COUNT(oi.id) as item_count,
  CASE 
    WHEN COUNT(oi.id) > 0 THEN '✅ Has Items'
    ELSE '❌ No Items'
  END as status
FROM public.orders o
LEFT JOIN public.order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.order_number, o.user_id, o.payment_type, o.total_amount, o.created_at
ORDER BY o.created_at DESC
LIMIT 10;

-- ============================================================================
-- 7. CHECK PROFILE CREATION TRIGGER
-- ============================================================================
SELECT 
  'Profile Creation Trigger' as check_type,
  tgname as trigger_name,
  tgtype::text as trigger_type,
  CASE 
    WHEN tgname = 'on_auth_user_created' THEN '✅ Trigger Exists'
    ELSE '❌ Trigger Missing'
  END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created'
  AND tgrelid = 'auth.users'::regclass;

-- Check if handle_new_user function exists
SELECT 
  'Profile Creation Function' as check_type,
  proname as function_name,
  CASE 
    WHEN proname = 'handle_new_user' THEN '✅ Function Exists'
    ELSE '❌ Function Missing'
  END as status
FROM pg_proc
WHERE proname = 'handle_new_user'
  AND pronamespace = 'public'::regnamespace;

-- ============================================================================
-- 8. SUMMARY
-- ============================================================================
SELECT 
  'System Health Summary' as check_type,
  (SELECT COUNT(*) FROM public.user_roles WHERE role::text IN ('super_admin', 'admin', 'staff')) as admin_staff_count,
  (SELECT COUNT(*) FROM public.user_roles WHERE role::text = 'customer') as customer_count,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.orders) as total_orders,
  (SELECT COUNT(*) FROM public.order_items) as total_order_items,
  (SELECT COUNT(*) FROM public.orders o WHERE NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id)) as orders_without_items;
