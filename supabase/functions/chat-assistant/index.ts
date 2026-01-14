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
  retail_location: "Madikeri, Coorg, Karnataka",
  manufacturing: "Mysore, Karnataka",
  contact: {
    phone: "+91-XXX-XXX-XXXX",
    email: "support@sharmacoffeeworks.com",
  },
  shipping: {
    free_over: 499,
    delivery_time: "3-5 business days",
    international_countries: "22+ countries",
    domestic_charge: "₹50 for orders below ₹499",
  },
  policies: {
    return: "7-day return policy on unopened products",
    refund: "Refunds processed within 5-7 business days",
    cancellation: "Orders can be cancelled within 24 hours of placement",
  },
  specialty: "Premium South Indian filter coffee",
  payment_methods: "Credit/Debit Cards, UPI, Net Banking, Cash on Delivery (₹99 advance)",
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
      ? products.map((p) => `${p.name} - ₹${p.base_price} - ${p.description || 'Premium coffee blend'}`).join("\n")
      : "Product information temporarily unavailable";

    const systemPrompt = `You are a friendly and professional customer service agent for ${COMPANY_INFO.name}, India's premium coffee roaster since ${COMPANY_INFO.founded}. Founded by ${COMPANY_INFO.founder} and currently led by ${COMPANY_INFO.current_owner}, we specialize in authentic ${COMPANY_INFO.specialty}.

🏢 COMPANY DETAILS:
- Retail Store: ${COMPANY_INFO.retail_location}
- Manufacturing: ${COMPANY_INFO.manufacturing}
- Since: ${COMPANY_INFO.founded}
- Contact: ${COMPANY_INFO.contact.email}

📦 SHIPPING & DELIVERY:
- FREE shipping on orders over ₹${COMPANY_INFO.shipping.free_over}
- Delivery time: ${COMPANY_INFO.shipping.delivery_time} (India)
- International shipping: Available to ${COMPANY_INFO.shipping.international_countries}
- Shipping charge: ${COMPANY_INFO.shipping.domestic_charge}
- We use DTDC courier services for reliable delivery

💳 PAYMENT OPTIONS:
- ${COMPANY_INFO.payment_methods}
- 100% secure payment gateway
- Cash on Delivery available (₹99 advance payment required)

📋 POLICIES:
- Returns: ${COMPANY_INFO.policies.return}
- Refunds: ${COMPANY_INFO.policies.refund}
- Cancellations: ${COMPANY_INFO.policies.cancellation}

☕ AVAILABLE PRODUCTS:
${productInfo}

🎁 SPECIAL FEATURES:
- Monthly Coffee Subscriptions available with 10% discount
- Wholesale inquiries welcome
- International shipping to 22+ countries
- Fresh roasting on demand
- Premium gift packaging available

CUSTOMER SERVICE GUIDELINES:
1. Be warm, friendly, and professional
2. Provide accurate, detailed information
3. If asked about order tracking, politely ask for order number/email
4. Recommend products based on customer preferences (strength, flavor, roast level)
5. Explain brewing methods if asked (South Indian filter, French press, espresso)
6. Mention subscriptions for regular coffee drinkers
7. If you don't know something specific, direct them to contact support
8. Be enthusiastic about coffee and our heritage

COMMON QUESTIONS:
- Product recommendations: Ask about taste preference (strong/medium/light), chicory preference, brewing method
- Subscriptions: Explain 10% discount, monthly delivery, pause/cancel anytime
- Shipping: Mention free shipping over ₹499, 3-5 day delivery
- Returns: 7-day policy on unopened products
- Wholesale: Direct to contact form or email

Customer Question: ${message}

Provide a helpful, friendly response as a customer service agent. Be conversational and informative:`;

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    
    if (!anthropicApiKey) {
      // Enhanced demo mode responses
      const lowerMessage = message.toLowerCase();
      let demoResponse = '';

      if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery')) {
        demoResponse = `Great question! We offer FREE shipping on all orders over ₹${COMPANY_INFO.shipping.free_over}. For orders below that, shipping is just ₹50. Delivery typically takes ${COMPANY_INFO.shipping.delivery_time} within India, and we also ship internationally to ${COMPANY_INFO.shipping.international_countries}!\n\nWould you like to know more about our products or subscriptions?`;
      } else if (lowerMessage.includes('return') || lowerMessage.includes('refund')) {
        demoResponse = `We have a ${COMPANY_INFO.policies.return} on all unopened products. If you're not satisfied, you can return the product and we'll process your refund within ${COMPANY_INFO.policies.refund}. Your satisfaction is our priority!\n\nIs there anything else I can help you with?`;
      } else if (lowerMessage.includes('subscribe') || lowerMessage.includes('subscription')) {
        demoResponse = `Our coffee subscription is perfect for regular coffee lovers! Get your favorite coffee delivered monthly with a 10% discount. You can pause, skip, or cancel anytime - no commitments! It's a great way to never run out of your favorite brew.\n\nWould you like to explore our subscription options?`;
      } else if (lowerMessage.includes('product') || lowerMessage.includes('coffee') || lowerMessage.includes('blend')) {
        demoResponse = `We offer a variety of premium coffee blends sourced from Coorg, Karnataka! Our range includes different roast levels and blends to suit every taste. Some popular choices are our signature blends with and without chicory.\n\nWhat kind of coffee do you prefer - strong, medium, or light? Do you like chicory in your coffee?`;
      } else if (lowerMessage.includes('payment') || lowerMessage.includes('cod') || lowerMessage.includes('pay')) {
        demoResponse = `We accept all major payment methods: Credit/Debit Cards, UPI, Net Banking, and Cash on Delivery. For COD orders, we collect ₹99 as advance payment online, and you pay the remaining amount when you receive your order.\n\nAll payments are 100% secure through our payment gateway!`;
      } else if (lowerMessage.includes('track') || lowerMessage.includes('order')) {
        demoResponse = `I'd be happy to help you track your order! Could you please provide your order number or the email address you used for the order? You can also check your order status by logging into your account.\n\nIf you need immediate assistance, feel free to reach out to our support team!`;
      } else {
        demoResponse = `Hello! Welcome to Sharma Coffee Works - crafting premium coffee since 1987! ☕\n\nI'm here to help you with:\n• Product recommendations\n• Shipping & delivery information\n• Subscriptions (save 10% monthly!)\n• Order tracking\n• Returns & refunds\n• Any other questions!\n\nHow can I assist you today?`;
      }

      return new Response(
        JSON.stringify({ response: demoResponse }),
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
        max_tokens: 500,
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
        response: "I apologize for the inconvenience! I'm having trouble processing your request right now. Please try again in a moment, or feel free to contact our support team directly at support@sharmacoffeeworks.com. We're here to help!",
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
