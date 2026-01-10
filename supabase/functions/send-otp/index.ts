import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOtpRequest {
  email: string;
}

// Validate email format more strictly
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: SendOtpRequest = await req.json();

    // Validate email format
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check rate limiting - max 5 OTP requests per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("otp_verifications")
      .select("*", { count: "exact", head: true })
      .eq("phone", normalizedEmail) // Using phone column for email (legacy schema)
      .gte("created_at", oneHourAgo);

    if (count && count >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store OTP in database
    const { error: insertError } = await supabase.from("otp_verifications").insert({
      phone: normalizedEmail, // Using phone column for email (legacy schema)
      otp,
      expires_at: expiresAt,
      verification_type: "email_login",
      verified: false,
    });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Unable to process request. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send OTP via Resend API
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");

    if (!fromEmail) {
      console.error("RESEND_FROM_EMAIL is not set");
      return new Response(
        JSON.stringify({ error: "Email service not configured. Please contact support." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [normalizedEmail],
        subject: "Your Sharma Coffee Works login code",
        html: `
          <div style="font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #f5f5f5; padding: 40px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #C8A45C; font-size: 28px; margin: 0;">Sharma Coffee Works</h1>
              <p style="color: #888; font-size: 14px; margin-top: 5px;">Est. 1985 • Coorg, Karnataka</p>
            </div>
            
            <div style="background: #2a2a2a; border-radius: 12px; padding: 30px; text-align: center;">
              <p style="font-size: 16px; color: #ccc; margin-bottom: 20px;">Your one-time login code is:</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #C8A45C; background: #1a1a1a; padding: 20px; border-radius: 8px; display: inline-block;">
                ${otp}
              </div>
              <p style="font-size: 14px; color: #888; margin-top: 20px;">This code is valid for 5 minutes.</p>
            </div>
            
            <p style="font-size: 12px; color: #666; text-align: center; margin-top: 30px;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", JSON.stringify(errorData));
      return new Response(
        JSON.stringify({ error: "Unable to send verification email. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("OTP email sent successfully to:", normalizedEmail.replace(/(.{2}).*@/, "$1****@"));

    // Mask email for response
    const [localPart, domain] = normalizedEmail.split("@");
    const maskedEmail = localPart.charAt(0) + "****@" + domain;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification code sent",
        maskedEmail 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
