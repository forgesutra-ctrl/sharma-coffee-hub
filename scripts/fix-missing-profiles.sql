-- Fix Missing Profiles for Users
-- This script creates missing profiles for users who have roles but no profiles

-- First, show which users are missing profiles
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as signup_time,
  ur.role,
  ur.created_at as role_created_at,
  p.id as profile_id,
  CASE 
    WHEN p.id IS NULL THEN '❌ Profile Missing'
    ELSE '✅ Has Profile'
  END as status
FROM auth.users u
INNER JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- Create missing profiles for all users who have roles but no profiles
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(u.email, ''),
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    SPLIT_PART(COALESCE(u.email, ''), '@', 1), -- Use email prefix as fallback
    'User'
  ),
  COALESCE(u.created_at, NOW()),
  NOW()
FROM auth.users u
INNER JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = COALESCE(EXCLUDED.email, profiles.email),
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
  updated_at = NOW();

-- Verify the fix
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as signup_time,
  ur.role,
  ur.created_at as role_created_at,
  p.id as profile_id,
  p.full_name,
  CASE 
    WHEN p.id IS NULL THEN '❌ Profile Missing'
    ELSE '✅ Has Profile'
  END as status
FROM auth.users u
INNER JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.created_at > NOW() - INTERVAL '30 days'
ORDER BY u.created_at DESC;
