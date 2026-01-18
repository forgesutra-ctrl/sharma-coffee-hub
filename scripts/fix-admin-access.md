# Fix Super Admin Access

This guide will help you fix super admin access for `ask@sharmacoffeeworks.com`.

## Option 1: Use Supabase Function (Recommended)

Call the `create-admin-user` Supabase function:

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/create-admin-user \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ask@sharmacoffeeworks.com",
    "password": "ScW@1987",
    "role": "super_admin"
  }'
```

Or use the Supabase Dashboard:
1. Go to Functions → `create-admin-user`
2. Click "Invoke"
3. Use this payload:
```json
{
  "email": "ask@sharmacoffeeworks.com",
  "password": "ScW@1987",
  "role": "super_admin"
}
```

## Option 2: Run SQL Directly in Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL:

```sql
-- First, check if user exists and get their ID
SELECT id, email FROM auth.users WHERE email = 'ask@sharmacoffeeworks.com';

-- If user exists, assign super_admin role
-- Replace USER_ID with the actual ID from above query
INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'super_admin')
ON CONFLICT (user_id) 
DO UPDATE SET role = 'super_admin';

-- If user doesn't exist, you need to create them first via Supabase Auth
-- Then run the INSERT above with their user ID
```

## Option 3: Use the Script

1. Set environment variables:
```bash
export SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

2. Run the script:
```bash
deno run --allow-net --allow-env scripts/fix-admin-access.ts
```

## Verify Access

After fixing, try logging in at `/admin/login` with:
- Email: `ask@sharmacoffeeworks.com`
- Password: `ScW@1987`

## Troubleshooting

If login still fails:
1. Check browser console for errors
2. Verify the user exists in Supabase Auth (Dashboard → Authentication → Users)
3. Verify the role exists in `user_roles` table (Dashboard → Table Editor → user_roles)
4. Check that the role is exactly `super_admin` (case-sensitive)
