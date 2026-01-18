# Fix Admin Role via Supabase API (Bypasses RLS)

If SQL doesn't work, use the Supabase Management API with service role key.

## Option 1: Use Supabase Dashboard

1. Go to **Supabase Dashboard → Table Editor → user_roles**
2. Find the row for `ask@sharmacoffeeworks.com` user
3. Click **Edit** (or delete and recreate)
4. Set `role` to `super_admin`
5. Save

## Option 2: Use create-admin-user Function

The function should handle existing users. Try calling it:

1. **Supabase Dashboard → Functions → create-admin-user**
2. **Invoke** with:
```json
{
  "email": "ask@sharmacoffeeworks.com",
  "password": "ScW@1987",
  "role": "super_admin"
}
```

## Option 3: Direct Database Update (Service Role)

If you have database access:

1. Connect to your Supabase database with **service_role** credentials
2. Run:
```sql
UPDATE user_roles
SET role = 'super_admin'
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ask@sharmacoffeeworks.com'
);
```

## Option 4: Check for Multiple Entries

Sometimes there are duplicate entries. Check:

```sql
SELECT 
  ur.id,
  ur.user_id,
  u.email,
  ur.role,
  ur.created_at
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'ask@sharmacoffeeworks.com';
```

If you see multiple rows, delete all and recreate:
```sql
DELETE FROM user_roles 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'ask@sharmacoffeeworks.com'
);

INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users
WHERE email = 'ask@sharmacoffeeworks.com';
```
