-- Diagnostic Script for User Issues
-- Run this to check for common issues with users, orders, and roles

-- 1. Check for users without roles (should not happen after signup)
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  ur.role,
  ur.created_at as role_created_at,
  CASE 
    WHEN ur.role IS NULL THEN '❌ Missing Role'
    ELSE '✅ Has Role'
  END as status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role IS NULL
ORDER BY u.created_at DESC
LIMIT 20;

-- 2. Check for orders without user_id or with invalid user_id
SELECT 
  o.id as order_id,
  o.order_number,
  o.user_id,
  o.created_at as order_created_at,
  u.email as user_email,
  CASE 
    WHEN o.user_id IS NULL THEN '❌ Missing user_id'
    WHEN u.id IS NULL THEN '❌ Invalid user_id (user not found)'
    ELSE '✅ Valid user_id'
  END as status
FROM public.orders o
LEFT JOIN auth.users u ON o.user_id = u.id
WHERE o.user_id IS NULL OR u.id IS NULL
ORDER BY o.created_at DESC
LIMIT 20;

-- 3. Check for orders that customers can't see (user_id exists but might have RLS issues)
SELECT 
  o.id as order_id,
  o.order_number,
  o.user_id,
  o.status,
  o.total_amount,
  o.created_at as order_created_at,
  u.email as user_email,
  ur.role as user_role
FROM public.orders o
LEFT JOIN auth.users u ON o.user_id = u.id
LEFT JOIN public.user_roles ur ON o.user_id = ur.user_id
WHERE o.created_at > NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC
LIMIT 20;

-- 4. Check recent signups and their role creation status
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as signup_time,
  u.email_confirmed_at,
  ur.role,
  ur.created_at as role_created_at,
  p.id as profile_id,
  CASE 
    WHEN ur.role IS NULL THEN '❌ Role Missing'
    WHEN p.id IS NULL THEN '❌ Profile Missing'
    WHEN u.email_confirmed_at IS NULL THEN '⚠️ Email Not Confirmed'
    ELSE '✅ All Good'
  END as status
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.created_at > NOW() - INTERVAL '7 days'
ORDER BY u.created_at DESC
LIMIT 20;
