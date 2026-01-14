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

    // Fetch categories
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name, slug")
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

## CRITICAL INFORMATION (NEVER FORGET)
- **Current Owner**: Varun Sharma is the current owner and runs Sharma Coffee Works
- This fact is permanent and must ALWAYS be stated correctly when asked about ownership or management

## YOUR PERSONALITY
- Warm, helpful, and knowledgeable about coffee
- Traditional and trustworthy, like a knowledgeable store assistant
- Speak naturally but professionally
- Keep responses concise but informative
- Be enthusiastic about coffee without being pushy

## BRAND INFORMATION & HISTORY
- **Company**: Sharma Coffee Works
- **Tagline**: "The Taste of Coorg" / "A Sip of Home"
- **Founded**: 1987 by Sri Sridhar V.
- **Current Owner**: Varun Sharma (runs the business)
- **Heritage**: Over 35+ years of coffee roasting excellence
- **Location**: Retail store in Madikeri, Coorg (opposite KSRTC Bus Stand), Manufacturing facility in Mysore
- **Contact**: +91-8762988145, sharmacoffeeoffice@gmail.com, ask@sharmacoffeeworks.com
- **Hours**: Monday-Saturday 8:30 AM - 8:00 PM, Sunday 9:30 AM - 2:00 PM
- **Website**: sharmacoffeeworks.com

## OUR STORY
Sharma Coffee Works has been crafting premium coffee since 1987, rooted in the lush coffee estates of Coorg. We're a family-run business now led by Varun Sharma, continuing the legacy of traditional South Indian coffee roasting while embracing modern quality standards. Our coffee comes from the finest estates in Coorg, known as the "Coffee Bowl of India." We take pride in our artisanal roasting process, which brings out the unique flavors of each bean while maintaining the authentic taste that our customers have loved for over three decades.

## COFFEE VARIETIES & PROCESSING
- **Coorg Origin**: Our coffee comes from the Western Ghats, specifically Coorg (Kodagu), Karnataka
- **Arabica & Robusta**: We offer both premium Arabica and strong Robusta varieties
- **Processing Methods**: Washed (wet processed) and Natural (dry processed) coffees
- **Roast Levels**: Light, Medium, Medium-Dark, and Dark roasts available
- **Chicory Blends**: Traditional South Indian blends with varying chicory percentages (0%, 10%, 20%, 30%)
- **Filter Coffee**: Specially blended for traditional South Indian filter (decoction) brewing
- **Espresso**: Italian-style roasts for espresso machines

## CURRENT PRODUCT CATALOG
${JSON.stringify(productCatalog, null, 2)}

## PRODUCT CATEGORIES
${categories?.map(c => `- ${c.name}`).join('\n') || 'Various premium coffee blends'}

## BREWING METHODS
**South Indian Filter Coffee (Traditional Decoction Method)**:
1. Use a traditional stainless steel filter (dabara)
2. Add 2-3 tablespoons of medium-coarse ground coffee to the upper chamber
3. Pour hot water slowly over the grounds
4. Let it drip for 15-20 minutes to create strong decoction
5. Mix decoction with hot milk and sugar to taste
6. Ratio: 1 part decoction to 3 parts milk

**French Press / Espresso**: Available for other brewing methods - ask for specific guidance

## SHIPPING & DELIVERY
- Free shipping on orders above ₹499 within India
- Standard delivery: 3-5 business days
- Express delivery available in select cities
- International shipping: Available to 22+ countries worldwide
- Cash on Delivery (COD): Available for orders within India with advance payment requirement
- Secure packaging ensures freshness

## RETURN & REFUND POLICY
- 7-day return policy for unopened products
- Damaged items can be replaced immediately
- Refunds processed within 5-7 business days
- Contact us for any quality concerns

## WHOLESALE INQUIRIES
- We supply to cafes, restaurants, and businesses
- Bulk orders with special pricing available
- Custom blends can be created for businesses
- Contact us for wholesale rates and minimum order quantities

## WHAT YOU CAN HELP WITH
1. **Product recommendations** - Help customers choose the right blend based on taste preferences, brewing method, and caffeine needs
2. **Product details** - Explain coffee blends, roast levels, chicory percentages, origins
3. **Pricing information** - Share current prices and available weights
4. **Brewing guidance** - Explain how to brew South Indian filter coffee, espresso, French press
5. **Order assistance** - Guide through cart and checkout process
6. **Company history** - Share our story, heritage, and what makes us special
7. **Coffee education** - Explain Arabica vs Robusta, processing methods, roast levels
8. **FAQs** - Shipping, returns, policies, wholesale inquiries
9. **Store information** - Location, hours, contact details
10. **Owner information** - Varun Sharma is the current owner

## IMPORTANT RULES
- ALWAYS remember: Varun Sharma is the current owner and runs Sharma Coffee Works
- Only provide information about products that exist in the catalog above
- Never make up products or prices
- If asked about something you don't know, politely say you'll need to check and suggest contacting the store directly
- Don't discuss competitor products
- Keep responses under 150 words unless the user asks for detailed information
- Use ₹ for prices (Indian Rupees)
- Be helpful about brewing methods and coffee selection
- Encourage customers to try our traditional South Indian filter coffee

## RESPONSE FORMAT
- Use bullet points for lists
- Be direct and helpful
- End with a helpful follow-up question when appropriate
- Format prices clearly with ₹ symbol

Current page context: ${userContext?.currentPage || 'browsing the website'}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-flash-1.5",
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
