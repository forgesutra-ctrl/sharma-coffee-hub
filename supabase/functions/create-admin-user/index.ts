import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const { email, password, role } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role - default to 'user' if not specified
    const validRoles = ['super_admin', 'staff', 'admin', 'user', 'shop_staff'];
    const userRole = role && validRoles.includes(role) ? role : 'user';

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create the user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      // If user already exists, try to get them
      if (createError.message.includes("already been registered")) {
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);
        
        if (existingUser) {
          // Check if role already exists
          const { data: existingRole } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", existingUser.id)
            .maybeSingle();

          if (existingRole && existingRole.role === userRole) {
            return new Response(
              JSON.stringify({ message: `User already exists with ${userRole} role`, userId: existingUser.id }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Update role if different
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: existingUser.id, role: userRole }, { onConflict: 'user_id' });

          if (roleError) {
            return new Response(
              JSON.stringify({ error: `Failed to assign ${userRole} role: ${roleError.message}` }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({ message: `${userRole} role assigned to existing user`, userId: existingUser.id }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user?.id;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The handle_new_user trigger creates a default 'user' role
    // Update it to the specified role
    const { error: updateRoleError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: userRole })
      .eq("user_id", userId);

    if (updateRoleError) {
      // If update fails, try upsert
      const { error: upsertRoleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: userRole }, { onConflict: 'user_id' });

      if (upsertRoleError) {
        return new Response(
          JSON.stringify({ error: `User created but failed to assign ${userRole} role: ${upsertRoleError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ message: `User created successfully with ${userRole} role`, userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
