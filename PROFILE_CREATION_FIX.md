# Profile Creation Fix

## Issue
Many users who signed up recently have roles but are missing profiles. This prevents them from accessing certain features that require a profile.

## Root Cause
The `handle_new_user()` trigger function is creating user roles but failing to create profiles for some users. This could be due to:
1. Silent failures in the profile creation (ON CONFLICT DO NOTHING)
2. RLS policies blocking profile creation
3. Missing or null email values
4. Timing issues with the trigger execution

## Solution

### 1. Immediate Fix - Create Missing Profiles
Run the script `scripts/fix-missing-profiles.sql` in Supabase SQL Editor to create profiles for all users who are missing them.

This script will:
- Identify all users with roles but no profiles
- Create profiles for them using their email and metadata
- Use email prefix as fallback for full_name if not available

### 2. Long-term Fix - Improve Trigger Function
A new migration `supabase/migrations/20260123000000_fix_profile_creation_trigger.sql` has been created to:
- Improve error handling in the trigger
- Ensure profile creation happens before role creation
- Add better logging for debugging
- Handle edge cases (null email, missing metadata)
- Use ON CONFLICT DO UPDATE instead of DO NOTHING to ensure profiles are created

## Steps to Fix

### Step 1: Fix Existing Users
1. Open Supabase SQL Editor
2. Run `scripts/fix-missing-profiles.sql`
3. Verify that profiles were created by checking the output

### Step 2: Apply Migration (Optional but Recommended)
1. Apply the new migration `20260123000000_fix_profile_creation_trigger.sql`
2. This will improve the trigger for future signups

### Step 3: Verify
Run the diagnostic query from `scripts/diagnose-user-issues.sql` to verify all users now have profiles.

## Affected Users
Based on the diagnostic data, the following users need profiles created:
- iyerpriya1982@gmail.com
- preethisudhar@gmail.com
- sunnyjagnath@gmail.com
- kirthi.1985@gmail.com
- sourav.ghosh2006@gmail.com
- annageorge@baselius.ac.in
- varunsharmascw@gmail.com
- editzzzyogi@gmail.com
- kunalbellurr@gmail.com
- forgesutra@gmail.com
- appsforbuild@gmail.com

All these users have roles but are missing profiles.

## Testing
After running the fix script:
1. Check that all users in the list above now have profiles
2. Test that these users can access their account pages
3. Verify that new signups create both profiles and roles correctly
