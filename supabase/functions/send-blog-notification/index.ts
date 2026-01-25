import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { blog_id } = await req.json();

    if (!blog_id) {
      return new Response(
        JSON.stringify({ error: "blog_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@sharmacoffee.com";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch blog details
    const { data: blog, error: blogError } = await supabaseAdmin
      .from("blogs")
      .select("*")
      .eq("id", blog_id)
      .eq("status", "published")
      .single();

    if (blogError || !blog) {
      return new Response(
        JSON.stringify({ error: "Blog not found or not published" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch active newsletter subscribers
    const { data: subscribers, error: subscribersError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("email, name")
      .eq("is_active", true)
      .is("unsubscribed_at", null);

    if (subscribersError) {
      console.error("Error fetching subscribers:", subscribersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscribers" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No active subscribers found",
          sent: 0 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Blog URL
    const blogUrl = `${Deno.env.get("SITE_URL") || "https://sharmacoffee.com"}/blog/${blog.slug}`;

    // Prepare email content
    const emailSubject = `New Blog Post: ${blog.title}`;
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8B4513 0%, #654321 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #fff; margin: 0; font-size: 28px;">Sharma Coffee</h1>
          </div>
          
          <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #8B4513; margin-top: 0; font-size: 24px;">${blog.title}</h2>
            
            ${blog.excerpt ? `<p style="font-size: 16px; color: #666; margin: 20px 0;">${blog.excerpt}</p>` : ''}
            
            ${blog.featured_image_url ? `
              <div style="margin: 30px 0;">
                <img src="${blog.featured_image_url}" alt="${blog.title}" style="width: 100%; border-radius: 8px;" />
              </div>
            ` : ''}
            
            <p style="font-size: 16px; margin: 30px 0;">
              We've just published a new blog post that we think you'll enjoy!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${blogUrl}" 
                 style="display: inline-block; background: #8B4513; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Read Full Article
              </a>
            </div>
            
            <p style="font-size: 14px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              You're receiving this email because you subscribed to our newsletter.
              <br>
              <a href="${Deno.env.get("SITE_URL") || "https://sharmacoffee.com"}/unsubscribe" style="color: #8B4513;">Unsubscribe</a>
            </p>
          </div>
        </body>
      </html>
    `;

    const emailText = `
New Blog Post: ${blog.title}

${blog.excerpt || ''}

Read the full article: ${blogUrl}

---
You're receiving this email because you subscribed to our newsletter.
Unsubscribe: ${Deno.env.get("SITE_URL") || "https://sharmacoffee.com"}/unsubscribe
    `.trim();

    // Send emails via Resend API
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Resend allows batch sending, but we'll send individually for better error handling
    for (const subscriber of subscribers) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: subscriber.email,
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          console.error(`Failed to send email to ${subscriber.email}:`, errorData);
          errorCount++;
          errors.push(`${subscriber.email}: ${errorData}`);
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`Error sending email to ${subscriber.email}:`, err);
        errorCount++;
        errors.push(`${subscriber.email}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.log(`✅ Blog notification sent: ${successCount} successful, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        blog_id: blog.id,
        blog_title: blog.title,
        total_subscribers: subscribers.length,
        sent: successCount,
        failed: errorCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending blog notification:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send blog notification",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
