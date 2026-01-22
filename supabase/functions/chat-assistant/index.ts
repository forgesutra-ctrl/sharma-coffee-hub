import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Access-Control-Max-Age": "86400",
};

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

// Build comprehensive product context from database
async function buildProductContext(supabase: any): Promise<string> {
  try {
    // Fetch both parent products and child products (like "Gold Blend 1", "Premium Blend 1")
    const { data: products, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        description,
        category,
        origin,
        roast_level,
        flavor_notes,
        intensity,
        is_featured,
        subscription_eligible,
        subscription_discount_percentage,
        razorpay_plan_id,
        parent_product_id,
        categories (
          id,
          name,
          slug
        ),
        product_variants (
          id,
          weight,
          price,
          compare_at_price,
          stock_quantity,
          cod_enabled,
          razorpay_plan_id
        )
      `)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching products:", error);
      return "Product information temporarily unavailable.";
    }

    if (!products || products.length === 0) {
      return "No products currently available.";
    }

    let context = "PRODUCT CATALOG:\n\n";
    
    // Group products by parent
    const parentProducts = products.filter(p => !p.parent_product_id);
    const childProducts = products.filter(p => p.parent_product_id);
    
    for (const product of parentProducts) {
      context += `Product: ${product.name}\n`;
      context += `- Slug/URL: /product/${product.slug}\n`;
      if (product.description) {
        context += `- Description: ${product.description}\n`;
      }
      if (product.category) {
        context += `- Category: ${product.category}\n`;
      }
      if (product.origin) {
        context += `- Origin: ${product.origin}\n`;
      }
      if (product.roast_level) {
        context += `- Roast Level: ${product.roast_level}\n`;
      }
      if (product.flavor_notes && Array.isArray(product.flavor_notes) && product.flavor_notes.length > 0) {
        context += `- Flavor Notes: ${product.flavor_notes.join(", ")}\n`;
      }
      if (product.intensity !== null && product.intensity !== undefined) {
        context += `- Intensity: ${product.intensity}/5\n`;
      }
      context += `- Featured: ${product.is_featured ? "Yes" : "No"}\n`;
      context += `- Subscription Eligible: ${product.subscription_eligible ? "Yes" : "No"}\n`;
      
      // Find child products for this parent
      const children = childProducts.filter(cp => cp.parent_product_id === product.id);
      if (children.length > 0) {
        context += `- Sub-variants/Blends:\n`;
        context += `  NOTE: Users may refer to these as "${product.name} 1", "${product.name} 2", "${product.name} 3" - these refer to the sub-variants listed below in order.\n`;
        let childIndex = 1;
        for (const child of children) {
          // Include both the full name and a numbered reference for easier matching
          context += `  * ${child.name}`;
          // Add numbered alias for matching
          const productNameShort = product.name.replace(/\s+Blend.*$/i, "").trim();
          context += ` (also searchable as "${productNameShort} Blend ${childIndex}" or "${product.name} ${childIndex}")`;
          if (child.description) {
            context += `\n    Description: ${child.description}`;
          }
          if (child.flavor_notes && Array.isArray(child.flavor_notes) && child.flavor_notes.length > 0) {
            context += `\n    Flavor Notes: ${child.flavor_notes.join(", ")}`;
          }
          if (child.intensity !== null && child.intensity !== undefined) {
            context += `\n    Intensity: ${child.intensity}/5`;
          }
          context += `\n`;
          
          // Include child product variants
          if (child.product_variants && child.product_variants.length > 0) {
            context += `    Available sizes:\n`;
            for (const variant of child.product_variants) {
              context += `      - ${variant.weight}g: ₹${variant.price}`;
              if (variant.compare_at_price && variant.compare_at_price > variant.price) {
                context += ` (was ₹${variant.compare_at_price})`;
              }
              context += `\n`;
            }
          }
          childIndex++;
        }
      }

      // Include parent product variants if it has any (for standalone products without children)
      if (children.length === 0 && product.product_variants && product.product_variants.length > 0) {
        context += `- Weight Variants:\n`;
        for (const variant of product.product_variants) {
          context += `  * ${variant.weight}g - ₹${variant.price}`;
          if (variant.compare_at_price && variant.compare_at_price > variant.price) {
            context += ` (was ₹${variant.compare_at_price}, save ₹${variant.compare_at_price - variant.price})`;
          }
          context += ` - Stock: ${variant.stock_quantity > 0 ? "In Stock" : "Out of Stock"}`;
          context += ` - COD: ${variant.cod_enabled ? "Available" : "Not Available"}`;
          if (variant.razorpay_plan_id) {
            context += ` - Subscription Plan Available`;
          }
          context += `\n`;
        }
      }
      
      context += `\n`;
    }
    
    // Also include standalone child products (if any exist without a parent in the list)
    const orphanChildren = childProducts.filter(cp => !parentProducts.find(p => p.id === cp.parent_product_id));
    if (orphanChildren.length > 0) {
      context += `\nSTANDALONE PRODUCT VARIANTS:\n\n`;
      for (const child of orphanChildren) {
        context += `Product: ${child.name}\n`;
        context += `- Slug/URL: /product/${child.slug}\n`;
        if (child.description) {
          context += `- Description: ${child.description}\n`;
        }
        if (child.flavor_notes && Array.isArray(child.flavor_notes) && child.flavor_notes.length > 0) {
          context += `- Flavor Notes: ${child.flavor_notes.join(", ")}\n`;
        }
        if (child.intensity !== null && child.intensity !== undefined) {
          context += `- Intensity: ${child.intensity}/5\n`;
        }
        if (child.product_variants && child.product_variants.length > 0) {
          context += `- Weight Variants:\n`;
          for (const variant of child.product_variants) {
            context += `  * ${variant.weight}g: ₹${variant.price}\n`;
          }
        }
        context += `\n`;
      }
    }

    return context;
  } catch (error) {
    console.error("Error building product context:", error);
    return "Product information temporarily unavailable.";
  }
}

// Build subscription context
async function buildSubscriptionContext(supabase: any): Promise<string> {
  try {
    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching subscription plans:", error);
      return "";
    }

    if (!plans || plans.length === 0) {
      return "SUBSCRIPTION PLANS:\nNo active subscription plans available.\n\n";
    }

    let context = "SUBSCRIPTION PLANS:\n\n";
    for (const plan of plans) {
      context += `Plan: ${plan.name}\n`;
      if (plan.description) {
        context += `- Description: ${plan.description}\n`;
      }
      context += `- Billing Cycle: ${plan.billing_cycle}\n`;
      context += `- Discount: ${plan.discount_percentage}% off\n`;
      context += `\n`;
    }

    context += "SUBSCRIPTION BENEFITS:\n";
    context += "- Free shipping on all subscription deliveries (no shipping charges)\n";
    context += "- Early access to new products and limited editions\n";
    context += "- Flexible: pause, skip, or cancel anytime\n";
    context += "- No minimum commitment or cancellation fees\n";
    context += "- Choose delivery frequency: weekly, bi-weekly, or monthly\n";
    context += "- Manage everything from your account dashboard\n";
    context += "- CRITICAL: Subscriptions pay THE EXACT SAME PRICE as one-time purchases - NO DISCOUNT WHATSOEVER\n";
    context += "- The ONLY benefit is free shipping - there is NO price reduction\n\n";

    context += "SUBSCRIPTION VS ONE-TIME PURCHASE:\n";
    context += "- Subscriptions: EXACT SAME PRICE as one-time purchase + FREE shipping + automatic delivery\n";
    context += "- One-time: Same price + shipping charges (weight-based: ₹50-100/kg depending on location)\n";
    context += "- Subscriptions can be paused/cancelled anytime\n";
    context += "- One-time purchases are single transactions\n";
    context += "- ABSOLUTELY NO DISCOUNT on subscription prices - the price is identical\n";
    context += "- The ONLY difference is: subscriptions get free shipping, one-time purchases pay shipping\n";
    context += "- NEVER mention any discount percentage (10%, 15%, or any number) - there is NO discount\n\n";

    return context;
  } catch (error) {
    console.error("Error building subscription context:", error);
    return "";
  }
}

// Build FAQ and policy context
function buildPolicyContext(): string {
  return `POLICIES & INFORMATION:

SHIPPING & DELIVERY:
- Free shipping: Subscription members only
- Weight-based shipping for non-subscribers:
  * Karnataka: ₹50/kg
  * South India: ₹60/kg
  * Rest of India: ₹100/kg
  * Orders over 1kg charged at tiered rates (2kg = 2× rate, etc.)
- Delivery times:
  * Metro cities: 2-4 business days
  * Tier 2 cities: 4-6 business days
  * Remote areas: 7-10 business days
  * North-East/J&K: 10-14 business days
- Processing: 1-2 business days before dispatch
- Tracking: SMS and email with tracking details after dispatch
- Delivery attempts: Up to 3 attempts by courier partner

PAYMENT METHODS:
- UPI (GPay, PhonePe, Paytm)
- Credit/Debit Cards
- Net Banking
- Cash on Delivery (COD) - ₹30 charge per order
- COD requires ₹99 advance payment for order confirmation
- All payments processed securely through Razorpay

RETURNS & REFUNDS:
- Returns accepted for: damaged, defective, or wrong products only
- Contact within 48 hours of delivery with photos
- Change-of-mind returns NOT accepted for food products
- Refund processing:
  * UPI/Wallet: 1-3 business days
  * Cards/Net Banking: 5-7 business days
  * COD refunds: 7-10 business days via bank transfer

ORDER MODIFICATIONS:
- Can modify or cancel before dispatch
- Contact immediately to modify/cancel
- Once shipped, orders cannot be cancelled
- Check email for dispatch confirmation

CONTACT INFORMATION:
- Email: ask@sharmacoffeeworks.com
- Phone: +91 8762 988 145
- WhatsApp: +91 8762 988 145
- Address: Sharma Coffee Estate, Madikeri, Coorg, Karnataka 571201
- Support hours: 9 AM - 6 PM IST (Monday - Saturday)

`;
}

// Build company and brand context
function buildCompanyContext(): string {
  return `COMPANY INFORMATION:

BRAND:
- Name: Sharma Coffee Works
- Founded: 1987
- Founder: Sri Sridhar V.
- Current Owner: Varun Sharma (son of founder)
- Legacy: Family business spanning generations
- Specialty: Premium South Indian filter coffee

LOCATIONS:
- Retail Store: Madikeri, Coorg, Karnataka
- Manufacturing: Mysore, Karnataka
- Estate: Sharma Coffee Estate, Madikeri, Coorg, Karnataka 571201

BRAND POSITIONING:
- Tagline: "A SIP OF HOME - Crafted with Tradition Since 1987"
- Value Proposition: Authentic South Indian filter coffee with 40+ years of tradition
- Quality: 100% natural, no artificial additives
- Sourcing: Direct from estates in Coorg, Karnataka
- Roasting: Handcrafted using Bharat Roasters
- Rating: 4.8-star customer rating

HERITAGE:
- 1600 AD: Coffee seeds brought to Chandragiri hills by Sufi saint Bababudan
- 19th Century: British establish large-scale coffee plantations in Coorg
- 1987: Sri Sridhar V. establishes Sharma Coffee in Madikeri
- 2020: Varun Sharma joins, expanding into new products
- Today: Serving customers across 22 countries

VALUES:
- Authentic Tradition: Preserving time-honored South Indian coffee culture
- Sustainable Sourcing: Direct partnerships with Coorg farmers
- Handcrafted Quality: Every batch carefully roasted
- Excellence: Committed to finest coffee experience

`;
}

// Build homepage and navigation context
function buildNavigationContext(): string {
  return `WEBSITE NAVIGATION & PAGES:

HOMEPAGE (/):
- Hero message: "A SIP OF HOME - Crafted with Tradition Since 1987"
- Features: Free Shipping (subscription members), Easy Returns (7-day), Premium Quality (Since 1987)
- Sections: Best Sellers, Categories, Our Story, Instagram Feed

SHOP (/shop):
- Browse all products by category
- Filter by category, price, roast level
- View product details and variants

PRODUCT PAGES (/product/[slug]):
- Detailed product information
- All available variants (weights, prices)
- Subscription eligibility and pricing
- Add to cart or subscribe options

SUBSCRIPTIONS (/subscriptions):
- Subscription benefits overview
- How it works guide
- Link to manage subscriptions

ABOUT (/about):
- Company story and heritage
- Founder and current owner information
- Values and mission
- Timeline of coffee history

CONTACT (/contact):
- Contact form
- Phone, email, WhatsApp details
- Physical address

POLICY PAGES:
- Privacy Policy (/privacy-policy)
- Terms of Service (/terms-of-service)
- Refund Policy (/refund-policy)
- Shipping Policy (/shipping-policy)
- FAQ (/faq)

ACCOUNT PAGES (requires login):
- Dashboard (/account)
- Orders (/account/orders)
- Addresses (/account/addresses)
- Subscriptions (/account/subscriptions)

`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, conversationHistory = [] }: ChatRequest = await req.json();

    if (!message || typeof message !== "string") {
      throw new Error("Message is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build comprehensive context
    const [productContext, subscriptionContext] = await Promise.all([
      buildProductContext(supabase),
      buildSubscriptionContext(supabase),
    ]);

    const companyContext = buildCompanyContext();
    const policyContext = buildPolicyContext();
    const navigationContext = buildNavigationContext();

    // Build comprehensive system prompt
    const systemPrompt = `You are a deeply knowledgeable and helpful customer service assistant for Sharma Coffee Works, a premium coffee roaster in India since 1987.

${companyContext}

${productContext}

${subscriptionContext}

${policyContext}

${navigationContext}

CRITICAL RULES - YOU MUST FOLLOW THESE STRICTLY:

1. ACCURACY & GROUNDING:
   - ONLY use information provided in the context above
   - NEVER invent products, prices, features, or policies
   - If information is not in the context, say: "I don't see that information listed on our website. Let me help you find what you need, or you can contact our support team at ask@sharmacoffeeworks.com"
   - When discussing products, ALWAYS mention specific variants (weight, price) when relevant
   - Distinguish clearly between subscription-eligible and non-eligible products

2. PRODUCT VARIANT CLARITY:
   - When a user asks about a product, mention ALL available variants (weights and prices)
   - Highlight differences between variants (e.g., "250g costs ₹X, 500g costs ₹Y")
   - If a user asks for "Gold Blend 1", "Premium Blend 1", etc., match to the first sub-variant listed under that parent product in the context
   - The context includes numbered aliases (e.g., "Gold Blend 1", "Gold Blend 2") - use these to match user queries
   - When a product has sub-variants (like "Gold Blend – Balanced Strong"), list ALL sub-variants with their full names
   - If a product has multiple variants, list them all clearly
   - NEVER mention discounts - subscriptions only provide free shipping (NO price reduction)

3. SUBSCRIPTION VS ONE-TIME - CRITICAL RULES:
   - ABSOLUTELY NO DISCOUNTS: Subscriptions pay the EXACT SAME PRICE as one-time purchases
   - The ONLY benefit of subscriptions is FREE shipping (no shipping charges)
   - One-time purchases pay regular price + shipping charges (weight-based: ₹50-100/kg)
   - NEVER say "discount", "save", "off", "percentage", "15%", "10%", or any price reduction for subscriptions
   - NEVER say "discounted price" or "subscription price" - there is only ONE price
   - When mentioning subscriptions, ONLY say: "Free shipping on subscription orders" or "No shipping charges for subscribers"
   - If you mention subscription benefits, ONLY list: free shipping, automatic delivery, flexibility (pause/skip/cancel)
   - Mention which products are subscription-eligible
   - Explain subscription benefits: pause, skip, cancel anytime, no commitment
   - Direct users to /subscriptions page for more details

4. NAVIGATION & PAGES:
   - When relevant, mention which page contains specific information
   - Guide users to appropriate pages (e.g., "You can browse all products at /shop" or "Check your subscriptions at /account/subscriptions")
   - Reference specific URLs when helpful

5. TONE & STYLE:
   - Be warm, friendly, and conversational
   - Sound like a knowledgeable in-house product expert
   - Never be salesy or exaggerated
   - Be helpful and clear
   - Show enthusiasm about the coffee heritage when appropriate

6. WHAT YOU CANNOT DO:
   - NEVER modify or execute payments
   - NEVER quote internal APIs, secrets, or technical implementation details
   - NEVER invent features, products, or policies not in the context
   - NEVER make promises about delivery times or policies not listed above

7. HANDLING UNKNOWN QUESTIONS:
   - If you don't have the information, be honest: "I don't see that listed on our website"
   - Offer to help find related information
   - Suggest contacting support: ask@sharmacoffeeworks.com or +91 8762 988 145
   - Ask clarifying questions when multiple products/variants might apply

8. PRODUCT RECOMMENDATIONS:
   - Ask about preferences (roast level, intensity, flavor notes)
   - Reference specific products from the catalog
   - When users ask for "Gold Blend 1", "Premium Blend 1", etc., match to the first sub-variant listed under that parent
   - Mention subscription benefits when relevant (ONLY free shipping, NO discounts)
   - Guide users to product pages for full details

9. SUBSCRIPTION PRICING - ABSOLUTE RULE:
   - NEVER mention any discount percentage (10%, 15%, or any number)
   - NEVER say "save money" or "discounted price" for subscriptions
   - ONLY say: "Subscriptions offer free shipping - the price is the same as one-time purchases"
   - If you catch yourself about to mention a discount, STOP and only mention free shipping
   - Example CORRECT response: "Subscriptions are available for this product. You'll pay the same price but get free shipping on all deliveries."
   - Example WRONG response: "Subscriptions get 15% off" - THIS IS FORBIDDEN

Remember: You are representing a family business with 40+ years of tradition. Be respectful, knowledgeable, and helpful. Always ground your responses in the actual data provided above. NEVER invent discounts or savings.

EXAMPLES OF CORRECT SUBSCRIPTION RESPONSES:
✅ CORRECT: "Subscriptions are available for this product. You'll pay the same price (₹X) but get free shipping on all deliveries."
✅ CORRECT: "This product is subscription-eligible. Subscribers pay the regular price but enjoy free shipping."
✅ CORRECT: "Subscriptions offer free shipping - the price remains the same as one-time purchases."

❌ WRONG: "Subscriptions get 15% off" - FORBIDDEN
❌ WRONG: "Save 10% with subscriptions" - FORBIDDEN
❌ WRONG: "Discounted price for subscribers" - FORBIDDEN
❌ WRONG: "Subscription discount available" - FORBIDDEN

If you find yourself about to write any percentage, discount, or savings amount for subscriptions, STOP and rewrite to only mention free shipping.`;

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiApiKey) {
      // Fallback demo mode
      const lowerMessage = message.toLowerCase();
      let demoResponse = '';

      if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery')) {
        demoResponse = `Great question! We offer FREE shipping on all subscription orders. For one-time purchases, shipping is weight-based: Karnataka (₹50/kg), South India (₹60/kg), Rest of India (₹100/kg). Delivery typically takes 2-4 business days for metro cities, 4-6 days for tier 2 cities.\n\nWould you like to know more about our products or subscriptions?`;
      } else if (lowerMessage.includes('subscribe') || lowerMessage.includes('subscription')) {
        demoResponse = `Our coffee subscription is perfect for regular coffee lovers! Get free shipping on all subscription orders (no shipping charges), and your favorite coffee delivered automatically. You can pause, skip, or cancel anytime - no commitments!\n\nNote: Subscription prices are the same as one-time purchases - the benefit is free shipping.\n\nWould you like to explore our subscription options?`;
      } else if (lowerMessage.includes('product') || lowerMessage.includes('coffee')) {
        demoResponse = `We offer a variety of premium coffee powders sourced from Coorg, Karnataka! Each product has multiple weight variants with different prices. Some products are also available for subscription with additional discounts.\n\nWhat kind of coffee do you prefer - strong, medium, or light? I can help you find the perfect match!`;
      } else {
        demoResponse = `Hello! Welcome to Sharma Coffee Works - a family legacy since 1987!\n\nI'm here to help you with:\n• Product recommendations and details\n• Shipping & delivery information\n• Subscriptions (free shipping on all orders!)\n• Order tracking\n• Returns & refunds\n\nHow can I assist you today?`;
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

    // Build messages array with conversation history
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // Add conversation history (last 6 messages to stay within token limits)
    const recentHistory = conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current message
    messages.push({
      role: "user",
      content: message,
    });

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
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
  } catch (error: any) {
    console.error("Chat assistant error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred",
        response: "I apologize for the inconvenience! I'm having trouble processing your request right now. Please try again in a moment, or contact our support team at ask@sharmacoffeeworks.com or +91 8762 988 145.",
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
