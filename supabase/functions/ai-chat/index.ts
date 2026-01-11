import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userContext } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch products from database for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: products } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        category,
        origin,
        roast_level,
        flavor_notes,
        intensity,
        is_active,
        product_variants (
          weight,
          price,
          compare_at_price,
          stock_quantity
        )
      `)
      .eq("is_active", true);

    // Build product catalog for AI context
    const productCatalog = products?.map(p => ({
      name: p.name,
      description: p.description,
      category: p.category,
      origin: p.origin,
      roastLevel: p.roast_level,
      flavorNotes: p.flavor_notes,
      intensity: p.intensity,
      variants: p.product_variants?.map((v: any) => ({
        weight: `${v.weight}g`,
        price: `₹${v.price}`,
        originalPrice: v.compare_at_price ? `₹${v.compare_at_price}` : null,
        inStock: (v.stock_quantity ?? 0) > 0
      }))
    })) || [];

    const systemPrompt = `You are the friendly customer support assistant for Sharma Coffee Works, a premium coffee roaster from Coorg, Karnataka, India, established in 1987.

## YOUR PERSONALITY
- Warm, helpful, and knowledgeable about coffee
- Traditional and trustworthy, like a knowledgeable store assistant
- Speak naturally but professionally
- Keep responses concise but informative
- Be enthusiastic about coffee without being pushy

## BRAND INFORMATION
- **Company**: Sharma Coffee Works
- **Tagline**: "The Taste of Coorg"
- **Founded**: 1987 by Sri Sridhar V.
- **Location**: Retail store in Madikeri (opposite KSRTC Bus Stand), Manufacturing in Mysore
- **Contact**: +91-8762988145, sharmacoffeeoffice@gmail.com
- **Hours**: Mon-Sat 8:30 AM - 8:00 PM, Sun 9:30 AM - 2:00 PM

## CURRENT PRODUCT CATALOG
${JSON.stringify(productCatalog, null, 2)}

## SHIPPING POLICIES
- Free shipping on orders above ₹499 within India
- Standard delivery: 3-5 business days
- Express delivery available in select cities
- We ship to 22 countries worldwide

## RETURN & REFUND POLICY
- 7-day return policy for unopened products
- Damaged items can be replaced immediately
- Refunds processed within 5-7 business days

## WHAT YOU CAN HELP WITH
1. **Product recommendations** - Help customers choose the right blend based on their taste preferences
2. **Product details** - Explain coffee blends, roast levels, chicory percentages
3. **Pricing information** - Share current prices and available weights
4. **Brewing guidance** - Explain how to brew South Indian filter coffee
5. **Order assistance** - Guide through cart and checkout process
6. **FAQs** - Shipping, returns, policies
7. **Store information** - Location, hours, contact details

## IMPORTANT RULES
- Only provide information about products that exist in the catalog above
- Never make up products or prices
- If asked about something you don't know, politely say you'll need to check and suggest contacting the store directly
- Don't discuss competitor products
- Keep responses under 150 words unless the user asks for detailed information
- Use ₹ for prices (Indian Rupees)

## RESPONSE FORMAT
- Use bullet points for lists
- Be direct and helpful
- End with a helpful follow-up question when appropriate

Current page context: ${userContext?.currentPage || 'browsing the website'}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "We're experiencing high demand. Please try again in a moment." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Unable to connect to assistant. Please try again." }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
