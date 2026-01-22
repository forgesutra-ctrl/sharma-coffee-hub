# Fix User Signup 500 Error

## Problem
Users are getting a 500 Internal Server Error when trying to create new accounts. The error occurs during the signup process when the database trigger tries to create a profile and user role.

## Solution
Run the migration SQL in the Supabase Dashboard to fix the trigger function.

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/cfuwclyvoemrutrcgxeq
   - Go to **SQL Editor**

2. **Run the Migration**
   - Copy the contents of `supabase/migrations/20260122000000_fix_user_signup_trigger.sql`
   - Paste into the SQL Editor
   - Click **Run**

3. **Verify the Fix**
   - Try creating a new account
   - The signup should now work without errors

## What the Fix Does

1. **Updates the trigger function** (`handle_new_user`) to:
   - Use `SECURITY DEFINER` properly (bypasses RLS)
   - Add better error handling with `ON CONFLICT DO NOTHING`
   - Ensure the function doesn't fail user creation even if profile/role creation has issues

2. **Ensures the trigger exists** and is properly configured

## Technical Details

The issue was that the trigger function might have been failing due to:
- RLS policies blocking inserts (even though SECURITY DEFINER should bypass them)
- Constraint violations
- Missing error handling

The fix ensures:
- SECURITY DEFINER is properly set
- Conflicts are handled gracefully
- User creation succeeds even if profile/role creation has minor issues
