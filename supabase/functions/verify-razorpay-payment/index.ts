import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

interface VerifyPaymentRequest {
  // For order-based flows (legacy), all fields are present.
  // For payment-first flows, only razorpayPaymentId and checkoutData are required.
  razorpayOrderId?: string | null;
  razorpayPaymentId: string;
  razorpaySignature?: string | null;
  checkoutData: string;
}

interface CheckoutData {
  user_id: string;
  subtotal: number;
  total_amount: number;
  shipping_address: Record<string, string>;
  pincode: string;
  shipping_region: string;
  shipping_charge: number;
  payment_type: "prepaid" | "cod";
  cod_advance_paid?: number;
  cod_handling_fee?: number;
  cod_balance?: number;
  cod_upfront_amount?: number; // Total upfront payment (advance + handling fee)
  promotion_id?: string;
  discount_amount?: number;
  items: Array<{
    product_name: string;
    product_id?: string;
    weight: number;
    grind_type?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    variant_id?: string;
  }>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight - must be first and return immediately
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body safely
    let requestBody: VerifyPaymentRequest;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          verified: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      checkoutData,
    } = requestBody;

    if (!razorpayPaymentId) {
      return new Response(
        JSON.stringify({
          error: "Missing required field: razorpayPaymentId",
          verified: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!checkoutData) {
      return new Response(
        JSON.stringify({
          error: "Missing checkout data",
          verified: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");

    if (!razorpayKeySecret || !razorpayKeyId) {
      console.error("Razorpay credentials not configured");
      throw new Error("Payment gateway not configured");
    }

    const checkout: CheckoutData = JSON.parse(checkoutData);

    // Validate user_id is present
    if (!checkout.user_id || checkout.user_id.trim() === '') {
      console.error("❌ Missing or empty user_id in checkout data");
      return new Response(
        JSON.stringify({
          error: "User ID is required to create an order",
          verified: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine expected amount (in paise) for verification
    // For COD: Customer pays ₹150 upfront (₹100 advance + ₹50 handling fee)
    const expectedAmountRupees =
      checkout.payment_type === "cod" 
        ? (checkout.cod_upfront_amount || (checkout.cod_advance_paid || 0) + (checkout.cod_handling_fee || 0))
        : checkout.total_amount;
    const expectedAmountPaise = Math.round((expectedAmountRupees || 0) * 100);

    if (!Number.isFinite(expectedAmountPaise) || expectedAmountPaise < 100) {
      console.error("❌ Invalid expected amount in checkout data:", {
        expectedAmountRupees,
        expectedAmountPaise,
      });
      return new Response(
        JSON.stringify({
          error: "Invalid expected amount for verification",
          verified: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (razorpayOrderId && razorpaySignature) {
      // Legacy order-first verification using HMAC over order_id|payment_id.
      console.log("🔐 Verifying payment using order_id + signature (order-first flow)", {
        razorpayOrderId,
        razorpayPaymentId,
      });

      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const encoder = new TextEncoder();
      const keyData = encoder.encode(razorpayKeySecret);
      const messageData = encoder.encode(body);

      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signature = await crypto.subtle.sign("HMAC", key, messageData);
      const expectedSignature = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (expectedSignature !== razorpaySignature) {
        console.error("Payment signature verification failed");
        return new Response(
          JSON.stringify({
            error: "Invalid payment signature",
            verified: false,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("✅ Payment signature verified successfully (order-first flow)");
    } else {
      // Payment-first verification using Razorpay Payments API.
      console.log("🔐 Verifying payment via Razorpay Payments API (payment-first flow)", {
        razorpayPaymentId,
      });

      const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}`, {
        method: "GET",
        headers: {
          Authorization: `Basic ${authString}`,
        },
      });

      const paymentText = await paymentRes.text();
      if (!paymentRes.ok) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(paymentText);
        } catch {
          // ignore parse error; log raw text
        }

        console.error("❌ Failed to fetch payment for verification:", {
          statusCode: paymentRes.status,
          message: parsed?.error?.description || paymentText,
        });

        return new Response(
          JSON.stringify({
            error: "Failed to verify payment with gateway",
            verified: false,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let payment: any;
      try {
        payment = JSON.parse(paymentText);
      } catch {
        console.error("❌ Unable to parse payment verification response:", paymentText);
        return new Response(
          JSON.stringify({
            error: "Invalid payment verification response from gateway",
            verified: false,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (payment.status !== "captured") {
        console.error("❌ Payment not captured:", {
          status: payment.status,
          id: payment.id,
        });
        return new Response(
          JSON.stringify({
            error: "Payment not captured",
            status: payment.status,
            verified: false,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (payment.amount !== expectedAmountPaise || payment.currency !== "INR") {
        console.error("❌ Payment amount or currency mismatch:", {
          expectedAmountPaise,
          receivedAmount: payment.amount,
          currency: payment.currency,
        });
        return new Response(
          JSON.stringify({
            error: "Payment amount or currency mismatch",
            verified: false,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("✅ Payment verified via Payments API (payment-first flow)", {
        payment_id: payment.id,
        amount: payment.amount / 100,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use the authenticated user from the JWT as order owner so the order always appears in "My Orders" for the payer
    let orderUserId = checkout.user_id;
    const authHeader = req.headers.get("Authorization");
    const hasBearer = authHeader?.startsWith("Bearer ");
    if (hasBearer) {
      const token = authHeader!.replace("Bearer ", "").trim();
      // Try getUser() when anon key is available (verifies JWT)
      if (supabaseAnonKey) {
        try {
          const authClient = createClient(supabaseUrl, supabaseAnonKey);
          const { data: { user }, error } = await authClient.auth.getUser(token);
          if (!error && user?.id) {
            orderUserId = user.id;
            console.log("[verify-payment] order owner from JWT getUser:", orderUserId, "checkout.user_id:", checkout.user_id);
          }
        } catch (e) {
          console.warn("[verify-payment] JWT getUser failed, trying payload decode:", e);
        }
      }
      // Fallback: decode JWT payload for "sub" (works without SUPABASE_ANON_KEY in env)
      if (orderUserId === checkout.user_id) {
        try {
          const parts = token.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
            const sub = payload?.sub as string | undefined;
            if (sub && /^[0-9a-f-]{36}$/i.test(sub)) {
              orderUserId = sub;
              console.log("[verify-payment] order owner from JWT payload sub:", orderUserId, "checkout.user_id:", checkout.user_id);
            }
          }
        } catch (e) {
          console.warn("[verify-payment] JWT payload decode failed:", e);
        }
      }
    } else {
      console.log("[verify-payment] no Bearer header, using checkout.user_id:", orderUserId);
    }

    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id, order_number, payment_status")
      .eq("razorpay_payment_id", razorpayPaymentId)
      .maybeSingle();

    if (existingOrder) {
      console.log("Order already exists:", existingOrder.id);
      return new Response(
        JSON.stringify({
          verified: true,
          message: "Payment already processed",
          orderId: existingOrder.id,
          orderNumber: existingOrder.order_number,
          paymentStatus: existingOrder.payment_status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const paymentStatus = checkout.payment_type === "cod" ? "advance_paid" : "paid";

    // Normalize phone number in shipping_address (remove +91, spaces, etc.)
    const normalizedShippingAddress = { ...checkout.shipping_address };
    if (normalizedShippingAddress.phone) {
      // Remove all non-digit characters
      const phoneDigits = normalizedShippingAddress.phone.replace(/\D/g, '');
      // If it starts with 91 and is 12 digits, remove the 91 prefix
      if (phoneDigits.length === 12 && phoneDigits.startsWith('91')) {
        normalizedShippingAddress.phone = phoneDigits.substring(2);
      } else if (phoneDigits.length === 10) {
        normalizedShippingAddress.phone = phoneDigits;
      } else {
        // Keep original if it doesn't match expected patterns
        console.warn("⚠️ Phone number format unexpected:", normalizedShippingAddress.phone);
      }
    }

    // Generate order number explicitly (don't rely on trigger)
    const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: orderUserId,
        order_number: orderNumber,
        subtotal: checkout.subtotal,
        total_amount: checkout.total_amount,
        shipping_address: normalizedShippingAddress,
        pincode: checkout.pincode,
        shipping_region: checkout.shipping_region,
        shipping_amount: checkout.shipping_charge,
        shipping_charge: checkout.shipping_charge,
        payment_type: checkout.payment_type,
        payment_method:
          checkout.payment_type === "cod" ? "Cash on Delivery" : "Online Payment",
        cod_advance_paid: checkout.cod_advance_paid || 0,
        cod_handling_fee: checkout.cod_handling_fee || 0,
        cod_balance: checkout.cod_balance || 0,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        payment_status: paymentStatus,
        payment_verified: true,
        payment_verified_at: new Date().toISOString(),
        status: "confirmed",
        promotion_id: checkout.promotion_id || null,
        discount_amount: checkout.discount_amount || 0,
      })
      .select()
      .single();

    if (orderError) {
      console.error("❌ Order creation error:", orderError);
      console.error("❌ Order creation error details:", {
        message: orderError.message,
        details: orderError.details,
        hint: orderError.hint,
        code: orderError.code,
      });
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    if (!order) {
      console.error("❌ Order creation returned no data");
      throw new Error("Failed to create order: No order data returned");
    }

    console.log("✅ Order created successfully:", {
      order_id: order.id,
      order_number: order.order_number,
      razorpay_payment_id: razorpayPaymentId,
    });

    // CRITICAL: Create order items - this must succeed or rollback the order
    if (checkout.items && checkout.items.length > 0) {
      const orderItems = checkout.items.map((item) => ({
        order_id: order.id,
        product_name: item.product_name,
        product_id: item.product_id || null,
        weight: item.weight,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        variant_id: item.variant_id || null,
      }));

      const { error: itemsError, data: insertedItems } = await supabase
        .from("order_items")
        .insert(orderItems)
        .select();

      if (itemsError) {
        console.error("❌ CRITICAL: Order items creation failed:", itemsError);
        console.error("❌ Order items error details:", {
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code,
        });
        
        // Delete the order if items cannot be created
        await supabase
          .from("orders")
          .delete()
          .eq("id", order.id);
        
        throw new Error(`Failed to create order items: ${itemsError.message}. Order was rolled back.`);
      }

      if (!insertedItems || insertedItems.length === 0) {
        console.error("❌ CRITICAL: Order items creation returned no data");
        // Delete the order if items were not created
        await supabase
          .from("orders")
          .delete()
          .eq("id", order.id);
        
        throw new Error("Failed to create order items: No items were inserted. Order was rolled back.");
      }

      console.log(`✅ Created ${insertedItems.length} order items successfully`);
    } else {
      console.warn("⚠️ No items in checkout data - order created without items");
    }

    if (checkout.promotion_id) {
      const { error: promoError } = await supabase.rpc(
        "increment_promotion_usage",
        { promotion_id: checkout.promotion_id }
      );

      if (promoError) {
        console.error("Failed to increment promotion usage:", promoError);
      }
    }

    // Fetch order items for notifications and shipment
    const { data: orderItemsData } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    // Calculate total weight for shipment (250g per item, minimum 0.5kg)
    const calculateTotalWeight = () => {
      if (!orderItemsData || orderItemsData.length === 0) return 0.5;
      const totalItems = orderItemsData.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const weightKg = Math.max(0.5, (totalItems * 0.25)); // 250g per item, min 0.5kg
      return Math.min(weightKg, 50); // Max 50kg
    };

    // Create DTDC shipment (fire and forget - don't block response)
    const createShipment = async () => {
      try {
        console.log(`[Payment] Creating DTDC shipment for order: ${order.id}`);
        
        const shipmentPayload = {
          orderId: order.id,
          customerName: checkout.shipping_address.fullName || "Customer",
          customerPhone: checkout.shipping_address.phone || "",
          customerEmail: checkout.shipping_address.email || "",
          shippingAddress: checkout.shipping_address,
          orderItems: (orderItemsData || checkout.items || []).map((item: any) => ({
            product_name: item.product_name || "",
            quantity: item.quantity || 0,
            unit_price: item.unit_price || 0,
            total_price: item.total_price || 0,
            weight: item.weight || null,
          })),
          totalWeight: calculateTotalWeight(),
          orderAmount: checkout.total_amount,
          paymentType: checkout.payment_type,
          codAmount: checkout.payment_type === "cod" ? (checkout.cod_balance || 0) : undefined,
        };

        // Call shipment creation function via HTTP
        const functionUrl = `${supabaseUrl}/functions/v1/create-dtdc-shipment`;
        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(shipmentPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Payment] Failed to create shipment:", errorText);
          return null;
        }

        const shipmentResult = await response.json();
        if (shipmentResult.success && shipmentResult.awbNumber) {
          console.log(`[Payment] Shipment created successfully. AWB: ${shipmentResult.awbNumber}`);
          return shipmentResult.awbNumber;
        } else {
          console.warn("[Payment] Shipment creation returned no AWB:", shipmentResult);
          return null;
        }
      } catch (error) {
        console.error("[Payment] Error creating shipment:", error);
        // Don't throw - shipment creation is non-critical for order completion
        return null;
      }
    };

    // Send email and WhatsApp notifications (fire and forget - don't block response)
    const sendNotifications = async (awbNumber: string | null) => {
      try {
        const notificationPayload = {
          orderId: order.id,
          customerEmail: checkout.shipping_address.email || "",
          customerPhone: checkout.shipping_address.phone || "",
          customerName: checkout.shipping_address.fullName || "Customer",
          orderNumber: order.order_number || order.id.substring(0, 8).toUpperCase(),
          orderTotal: checkout.total_amount,
          orderItems: (orderItemsData || checkout.items || []).map((item: any) => ({
            product_name: item.product_name || "",
            quantity: item.quantity || 0,
            unit_price: item.unit_price || 0,
            total_price: item.total_price || 0,
            weight: item.weight || null,
            grind_type: item.grind_type || null,
          })),
          shippingAddress: checkout.shipping_address,
          paymentType: checkout.payment_type,
          trackingNumber: awbNumber, // Include AWB if available
        };

        // Call notification function via HTTP
        const functionUrl = `${supabaseUrl}/functions/v1/send-order-notification`;
        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(notificationPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to send notifications:", errorText);
        } else {
          console.log("Order notifications sent successfully");
        }
      } catch (error) {
        console.error("Error sending notifications:", error);
        // Don't throw - notifications are non-critical
      }
    };

    // Create shipment first, then send notifications with AWB
    createShipment()
      .then((awbNumber) => {
        // Send notifications with AWB number
        sendNotifications(awbNumber).catch((err) => {
          console.error("Notification error:", err);
        });
      })
      .catch((err) => {
        console.error("Shipment creation error:", err);
        // Still send notifications without AWB
        sendNotifications(null).catch((notifyErr) => {
          console.error("Notification error:", notifyErr);
        });
      });

    return new Response(
      JSON.stringify({
        verified: true,
        message: "Payment verified and order created successfully",
        orderId: order.id,
        orderNumber: order.order_number,
        paymentStatus: paymentStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in verify-razorpay-payment:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        verified: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
