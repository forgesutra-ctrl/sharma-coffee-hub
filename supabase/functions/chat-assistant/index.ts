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
  current_owner: "Varun Sharma (son of founder Sri Sridhar V.)",
  retail_location: "Madikeri, Coorg, Karnataka",
  manufacturing: "Mysore, Karnataka",
  contact: {
    phone: "+91-XXX-XXX-XXXX",
    email: "ask@sharmacoffeeworks.com",
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
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      throw new Error("Message is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: products } = await supabase
      .supabase
      .from("products")
      .select(`
        id,
        name,
        price,
        image,
        description,
        subscription_eligible,
        razorpay_plan_id
      `);
    

    const productInfo = products
      ? products.map((p) => `${p.name} - ₹${p.base_price} - ${p.description || 'Premium coffee blend'}`).join("\n")
      : "Product information temporarily unavailable";

    const systemPrompt = `You are a friendly and professional customer service agent for ${COMPANY_INFO.name}, India's premium coffee roaster since ${COMPANY_INFO.founded}.

COMPANY HISTORY:
- Founded in ${COMPANY_INFO.founded} by ${COMPANY_INFO.founder}
- Now run by ${COMPANY_INFO.current_owner}
- A family legacy of coffee excellence spanning generations

COMPANY DETAILS:
- Retail Store: ${COMPANY_INFO.retail_location}
- Manufacturing: ${COMPANY_INFO.manufacturing}
- Specialty: ${COMPANY_INFO.specialty}
- Contact: ${COMPANY_INFO.contact.email}

SHIPPING & DELIVERY:
- FREE shipping on orders over ₹${COMPANY_INFO.shipping.free_over}
- Delivery: ${COMPANY_INFO.shipping.delivery_time} (India)
- International: ${COMPANY_INFO.shipping.international_countries}
- Domestic charge: ${COMPANY_INFO.shipping.domestic_charge}
- Courier: DTDC services

PAYMENT OPTIONS:
- ${COMPANY_INFO.payment_methods}
- 100% secure payment gateway

POLICIES:
- Returns: ${COMPANY_INFO.policies.return}
- Refunds: ${COMPANY_INFO.policies.refund}
- Cancellations: ${COMPANY_INFO.policies.cancellation}

AVAILABLE PRODUCTS:
${productInfo}

SPECIAL FEATURES:
- Monthly subscriptions with 10% discount
- Wholesale inquiries welcome
- Fresh roasting on demand
- Premium gift packaging

Your role as customer service agent:
- Be warm, friendly, and professional
- Provide accurate information about products, shipping, and policies
- Ask for order details when helping with tracking
- Recommend products based on customer preferences
- Mention subscriptions for regular coffee drinkers
- Direct complex issues to support team
- Be enthusiastic about our coffee heritage and quality`;

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      const lowerMessage = message.toLowerCase();
      let demoResponse = '';

      if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery')) {
        demoResponse = `Great question! We offer FREE shipping on all orders over ₹${COMPANY_INFO.shipping.free_over}. For orders below that, shipping is just ₹50. Delivery typically takes ${COMPANY_INFO.shipping.delivery_time} within India, and we also ship internationally to ${COMPANY_INFO.shipping.international_countries}!\n\nWould you like to know more about our products or subscriptions?`;
      } else if (lowerMessage.includes('return') || lowerMessage.includes('refund')) {
        demoResponse = `We have a ${COMPANY_INFO.policies.return}. If you're not satisfied, you can return the product and we'll process your refund within 5-7 business days. Your satisfaction is our priority!\n\nIs there anything else I can help you with?`;
      } else if (lowerMessage.includes('subscribe') || lowerMessage.includes('subscription')) {
        demoResponse = `Our coffee subscription is perfect for regular coffee lovers! Get your favorite coffee delivered monthly with a 10% discount. You can pause, skip, or cancel anytime - no commitments!\n\nWould you like to explore our subscription options?`;
      } else if (lowerMessage.includes('product') || lowerMessage.includes('coffee') || lowerMessage.includes('blend')) {
        demoResponse = `We offer a variety of premium coffee blends sourced from Coorg, Karnataka! Our range includes different roast levels and blends to suit every taste.\n\nWhat kind of coffee do you prefer - strong, medium, or light? Do you like chicory in your coffee?`;
      } else if (lowerMessage.includes('payment') || lowerMessage.includes('cod') || lowerMessage.includes('pay')) {
        demoResponse = `We accept all major payment methods: Credit/Debit Cards, UPI, Net Banking, and Cash on Delivery. For COD orders, we collect ₹99 as advance payment online, and you pay the remaining amount on delivery.\n\nAll payments are 100% secure!`;
      } else if (lowerMessage.includes('track') || lowerMessage.includes('order')) {
        demoResponse = `I'd be happy to help you track your order! Could you please provide your order number or the email address you used for the order?\n\nYou can also check your order status by logging into your account.`;
      } else if (lowerMessage.includes('varun') || lowerMessage.includes('owner') || lowerMessage.includes('founder')) {
        demoResponse = `Sharma Coffee Works was founded in 1987 by Sri Sridhar V. Today, the business is run by his son, Varun Sharma, who continues the family tradition of crafting premium South Indian filter coffee. It's a beautiful legacy spanning generations!\n\nHow can I help you today?`;
      } else {
        demoResponse = `Hello! Welcome to Sharma Coffee Works - a family legacy since 1987!\n\nFounded by Sri Sridhar V. and now run by his son Varun Sharma, we specialize in premium South Indian filter coffee.\n\nI'm here to help you with:\n• Product recommendations\n• Shipping & delivery information\n• Subscriptions (save 10% monthly!)\n• Order tracking\n• Returns & refunds\n\nHow can I assist you today?`;
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

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error("Failed to get AI response");
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
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
        response: "I apologize for the inconvenience! I'm having trouble processing your request right now. Please try again in a moment, or contact our support team at ask@sharmacoffeeworks.com.",
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
