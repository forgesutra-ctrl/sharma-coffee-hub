/**
 * Script to fix super admin access for ask@sharmacoffeeworks.com
 * 
 * This script will:
 * 1. Check if the user exists in Supabase auth
 * 2. Create the user if they don't exist
 * 3. Assign/update the super_admin role
 * 
 * Run this using: deno run --allow-net --allow-env scripts/fix-admin-access.ts
 * Or call the create-admin-user Supabase function directly
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const ADMIN_EMAIL = "ask@sharmacoffeeworks.com";
const ADMIN_PASSWORD = "ScW@1987";
const ADMIN_ROLE = "super_admin";

async function fixAdminAccess() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
    console.log("Please set these environment variables before running the script");
    return;
  }

  const supabaseAdmin = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log(`🔍 Checking for user: ${ADMIN_EMAIL}`);

  try {
    // Check if user exists
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("❌ Error listing users:", listError);
      return;
    }

    const existingUser = users?.users?.find(u => u.email === ADMIN_EMAIL);

    if (existingUser) {
      console.log(`✅ User found: ${existingUser.id}`);
      
      // Check current role
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (roleError) {
        console.error("❌ Error checking role:", roleError);
        return;
      }

      if (roleData?.role === ADMIN_ROLE) {
        console.log(`✅ User already has ${ADMIN_ROLE} role`);
        console.log("✅ Admin access is correctly configured!");
        return;
      }

      // Update role to super_admin
      console.log(`🔄 Updating role to ${ADMIN_ROLE}...`);
      const { error: updateError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: existingUser.id, role: ADMIN_ROLE }, { onConflict: 'user_id' });

      if (updateError) {
        console.error("❌ Error updating role:", updateError);
        return;
      }

      console.log(`✅ Role updated to ${ADMIN_ROLE} successfully!`);
      console.log("✅ Admin access fixed!");
    } else {
      console.log(`📝 User not found. Creating new user...`);
      
      // Create the user
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });

      if (createError) {
        console.error("❌ Error creating user:", createError);
        return;
      }

      if (!userData?.user?.id) {
        console.error("❌ Failed to create user");
        return;
      }

      console.log(`✅ User created: ${userData.user.id}`);

      // Assign super_admin role
      console.log(`🔄 Assigning ${ADMIN_ROLE} role...`);
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userData.user.id, role: ADMIN_ROLE }, { onConflict: 'user_id' });

      if (roleError) {
        console.error("❌ Error assigning role:", roleError);
        return;
      }

      console.log(`✅ Role assigned successfully!`);
      console.log("✅ Admin access configured!");
    }

    console.log("\n📋 Summary:");
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Role: ${ADMIN_ROLE}`);
    console.log("\n✅ You can now log in at /admin/login");

  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

// Run the script
fixAdminAccess();
