import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const COMPANY_INFO = {
  name: "Sharma Coffee Works",
  founded: "1987",
  founder: "Sri Sridhar V.",
  current_owner: "Varun Sharma",
  retail_location: "Madikeri, Coorg",
  manufacturing: "Mysore, Karnataka",
  shipping: {
    free_over: 499,
    delivery_time: "3-5 business days",
    international_countries: "22+ countries",
  },
  return_policy: "7-day return policy",
  specialty: "South Indian filter coffee",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, conversationHistory } = await req.json();

    if (!message || typeof message !== "string") {
      throw new Error("Message is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, description, base_price, category_id, subscription_eligible")
      .eq("status", "active")
      .limit(20);

    if (productsError) {
      console.error("Error fetching products:", productsError);
    }

    const productInfo = products
      ? products.map((p) => `${p.name} - ₹${p.base_price} - ${p.description}`).join("\n")
      : "Product information temporarily unavailable";

    const systemPrompt = `You are a helpful assistant for ${COMPANY_INFO.name}, a premium coffee roaster and retailer established in ${COMPANY_INFO.founded} by ${COMPANY_INFO.founder}. The company is currently owned by ${COMPANY_INFO.current_owner}.

Company Information:
- Retail Location: ${COMPANY_INFO.retail_location}
- Manufacturing: ${COMPANY_INFO.manufacturing}
- Specialty: ${COMPANY_INFO.specialty}
- Free shipping on orders over ₹${COMPANY_INFO.shipping.free_over}
- Delivery time: ${COMPANY_INFO.shipping.delivery_time}
- International shipping to ${COMPANY_INFO.shipping.international_countries}
- ${COMPANY_INFO.return_policy}

Available Products:
${productInfo}

Your role:
- Help customers find the right coffee products
- Answer questions about coffee, brewing methods, and our products
- Provide information about orders, shipping, and policies
- Be friendly, knowledgeable, and concise
- If asked about order tracking, ask for the order number
- Recommend products based on customer preferences

User Question: ${message}

Provide a helpful, concise response (max 150 words):`;

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({
          response: `Thank you for your message! I'm currently in demo mode. Here's what I can help you with:

• Browse our premium coffee selection from Coorg, Karnataka
• Learn about our free shipping on orders over ₹${COMPANY_INFO.shipping.free_over}
• Get information about our ${COMPANY_INFO.return_policy}
• Discover our specialty in ${COMPANY_INFO.specialty}

For immediate assistance, please contact us directly or browse our shop!`,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: systemPrompt,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      throw new Error("Failed to get AI response");
    }

    const anthropicData = await anthropicResponse.json();
    const aiResponse = anthropicData.content[0].text;

    return new Response(
      JSON.stringify({
        response: aiResponse,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Chat assistant error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred",
        response: "I apologize, but I'm having trouble processing your request right now. Please try again or contact our support team directly.",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
