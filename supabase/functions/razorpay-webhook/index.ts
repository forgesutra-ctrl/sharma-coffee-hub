import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Razorpay-Signature, X-Internal-Queue-Retry",
};

interface WebhookPayload {
  event: string;
  payload: {
    order?: {
      entity: {
        id: string;
        amount: number;
        status: string;
        receipt: string;
        notes?: Record<string, any>;
      };
    };
    payment?: {
      entity: {
        id: string;
        amount: number;
        status: string;
        order_id: string;
        method: string;
      };
    };
    invoice?: {
      entity: {
        id: string;
        status: string;
        subscription_id: string | null;
        amount_paid: number;
        period_start: number;
        period_end: number;
        billing_cycle: number | null;
        notes?: Record<string, any>;
      };
    };
    subscription?: {
      entity: {
        id: string;
        status: string;
        plan_id: string;
        created_at: number;
        charge_at: number;
        paid_count: number;
        total_count: number;
        notes?: Record<string, any>;
      };
    };
  };
}

// Verify webhook signature
async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) {
    return false;
  }

  // Razorpay uses HMAC SHA256
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(rawBody);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === expectedSignature;
}

// Calculate next retry time with exponential backoff
function calculateNextRetry(retryCount: number): Date {
  const baseDelay = 60; // 1 minute
  const delaySeconds = baseDelay * Math.pow(2, retryCount);
  return new Date(Date.now() + delaySeconds * 1000);
}

// Process webhook event
async function processWebhookEvent(
  event: string,
  payload: WebhookPayload["payload"],
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (event) {
      case "payment.captured": {
        /*
         * RAZORPAY WEBHOOK PAYLOAD STRUCTURE - payment.captured
         *
         * Razorpay sends ONLY the payment entity, NOT the order entity.
         * The payload structure is:
         * {
         *   event: "payment.captured",
         *   payload: {
         *     payment: { entity: { id, amount, order_id, email, ... } }
         *     // NOTE: payload.order is NOT present
         *   }
         * }
         *
         * ALWAYS use paymentEntity.order_id to get the order ID.
         * NEVER require payload.order?.entity to be present.
         *
         * Removing this fix will cause ALL orders to fail silently.
         */
        const paymentEntity = payload.payment?.entity;
        if (!paymentEntity) {
          return { success: false, error: "Missing payment entity" };
        }
        const razorpayOrderId = paymentEntity.order_id || payload.order?.entity?.id;
        if (!razorpayOrderId) {
          return { success: false, error: "Missing order ID in payment entity" };
        }

        console.log("💰 Processing payment.captured:", {
          payment_id: paymentEntity.id,
          order_id: razorpayOrderId,
          amount: paymentEntity.amount / 100,
        });

        // NEW FLOW: Look up order in orders table (store-before-payment pattern)
        const { data: existingOrder, error: orderLookupError } = await supabaseAdmin
          .from("orders")
          .select("id, order_number, status, payment_status")
          .eq("razorpay_order_id", razorpayOrderId)
          .maybeSingle();

        if (orderLookupError) {
          console.error("❌ Error fetching order by razorpay_order_id:", orderLookupError);
          return { success: false, error: orderLookupError.message };
        }

        if (existingOrder && existingOrder.status === "pending_payment") {
          // Order was created before payment - just update it
          const paymentStatus = existingOrder.payment_status === "pending" ? "paid" : existingOrder.payment_status;
          const { error: updateError } = await supabaseAdmin
            .from("orders")
            .update({
              status: "confirmed",
              payment_status: paymentStatus,
              razorpay_payment_id: paymentEntity.id,
              payment_verified: true,
              payment_verified_at: new Date().toISOString(),
            })
            .eq("id", existingOrder.id);

          if (updateError) {
            console.error("❌ Failed to update order:", updateError);
            return { success: false, error: updateError.message };
          }

          console.log("✅ Order updated successfully (store-before-payment):", existingOrder.id);

          // Fire-and-forget: create shipment (in case verify-razorpay-payment wasn't called - e.g. user closed tab)
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const dtdcInternalJwt = Deno.env.get("DTDC_LEGACY_SERVICE_ROLE_JWT");
          if (supabaseUrl && dtdcInternalJwt) {
            // `existingOrder` above was selected with only 4 columns (id,
            // order_number, status, payment_status). dtdc-create-shipment needs
            // shipping_address, total_amount, payment_type, cod_balance plus
            // order_items — so re-fetch inline before firing the call.
            (async () => {
              const { data: fullOrder, error: orderFetchErr } = await supabaseAdmin
                .from("orders")
                .select("*")
                .eq("id", existingOrder.id)
                .maybeSingle();
              if (orderFetchErr || !fullOrder) {
                console.warn(
                  "[Webhook] DTDC push skipped: failed to load order:",
                  orderFetchErr?.message ?? "order not found",
                );
                return;
              }

              const addr = (fullOrder.shipping_address ?? {}) as Record<string, any>;
              const hasName = !!(addr.fullName || addr.full_name);
              const hasPhone = !!addr.phone;
              const hasPincode = !!addr.pincode;
              if (!hasName || !hasPhone || !hasPincode) {
                console.warn(
                  "[Webhook] DTDC push skipped: shipping_address incomplete for order:",
                  existingOrder.id,
                );
                return;
              }

              const { data: items, error: itemsFetchErr } = await supabaseAdmin
                .from("order_items")
                .select("*")
                .eq("order_id", existingOrder.id);
              if (itemsFetchErr) {
                console.warn(
                  "[Webhook] DTDC push skipped: failed to load order_items:",
                  itemsFetchErr.message,
                );
                return;
              }

              const itemsArr = (items ?? []) as Array<Record<string, any>>;
              const totalGrams = itemsArr.length === 0
                ? 500
                : itemsArr.reduce((sum, it) => {
                    const w = typeof it.weight === "number" && it.weight > 0 ? it.weight : 250;
                    return sum + w * (it.quantity || 1);
                  }, 0);
              const shipmentWeightGrams = Math.max(500, Math.min(50000, Math.round(totalGrams)));

              const dtdcPayload = {
                orderId: existingOrder.id,
                totalAmount: Number(fullOrder.total_amount) || 0,
                paymentType: fullOrder.payment_type ?? "prepaid",
                codBalance: fullOrder.payment_type === "cod" ? (Number(fullOrder.cod_balance) || 0) : undefined,
                customerEmail: addr.email || "",
                address: {
                  fullName: addr.fullName || addr.full_name || "Customer",
                  addressLine1: addr.addressLine1 || addr.address_line1 || "",
                  addressLine2: addr.addressLine2 || addr.address_line2 || "",
                  city: addr.city || "",
                  state: addr.state || "",
                  pincode: addr.pincode || "",
                  phone: addr.phone || "",
                  email: addr.email || "",
                },
                items: itemsArr.map((it) => ({
                  product_name: it.product_name || "",
                  quantity: it.quantity || 0,
                  weight: typeof it.weight === "number" && it.weight > 0 ? it.weight : 250,
                  unit_price: it.unit_price || 0,
                })),
                shipmentWeightGrams,
              };

              const response = await fetch(`${supabaseUrl}/functions/v1/dtdc-create-shipment`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${dtdcInternalJwt}` },
                body: JSON.stringify(dtdcPayload),
              });
              if (!response.ok) {
                console.warn("[Webhook] DTDC push failed:", response.status);
              }
            })().catch((e) => console.warn("[Webhook] DTDC push error:", e));
          }

          return { success: true };
        }

        if (existingOrder && existingOrder.status !== "pending_payment") {
          // Order already processed (e.g. via verify-razorpay-payment)
          console.log("ℹ️ Order already processed:", existingOrder.id);
          return { success: true };
        }

        // FALLBACK: Find pending order (legacy flow)
        const { data: pendingOrder, error: pendingError } = await supabaseAdmin
          .from("pending_orders")
          .select("*")
          .eq("razorpay_order_id", razorpayOrderId)
          .maybeSingle();

        if (pendingError) {
          console.error("❌ Error fetching pending order:", pendingError);
          return { success: false, error: pendingError.message };
        }

        if (!pendingOrder) {
          console.warn("⚠️ Pending order not found, may have already been processed");
          return { success: true }; // Idempotent - already processed
        }

        // Normalize phone number in shipping_address (remove +91, spaces, etc.)
        const normalizedShippingAddress = pendingOrder.shipping_address ? { ...pendingOrder.shipping_address } : null;
        if (normalizedShippingAddress && normalizedShippingAddress.phone) {
          // Remove all non-digit characters
          const phoneDigits = String(normalizedShippingAddress.phone).replace(/\D/g, '');
          // If it starts with 91 and is 12 digits, remove the 91 prefix
          if (phoneDigits.length === 12 && phoneDigits.startsWith('91')) {
            normalizedShippingAddress.phone = phoneDigits.substring(2);
          } else if (phoneDigits.length === 10) {
            normalizedShippingAddress.phone = phoneDigits;
          } else {
            console.warn("⚠️ Phone number format unexpected in webhook:", normalizedShippingAddress.phone);
          }
        }

        // Create order in orders table
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const orderData = {
          user_id: pendingOrder.user_id,
          order_number: orderNumber,
          status: "confirmed",
          total_amount: pendingOrder.total_amount,
          subtotal: pendingOrder.total_amount - pendingOrder.shipping_charge,
          shipping_address: normalizedShippingAddress,
          payment_method: "razorpay",
          payment_status: "paid",
          payment_type: pendingOrder.payment_type,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: paymentEntity.id,
        };

        const { data: order, error: orderError } = await supabaseAdmin
          .from("orders")
          .insert(orderData)
          .select()
          .single();

        if (orderError) {
          console.error("❌ Failed to create order:", orderError);
          return { success: false, error: orderError.message };
        }

        // Create order items from cart_data
        const cartItems = pendingOrder.cart_data as Array<{
          product_id: string;
          variant_id: string;
          quantity: number;
          price: number;
        }>;

        // Create order items - this must succeed or rollback the order
        const orderItemsErrors: any[] = [];
        for (const item of cartItems) {
          // Get product and variant details
          const { data: product } = await supabaseAdmin
            .from("products")
            .select("name")
            .eq("id", item.product_id)
            .single();

          const { data: variant } = await supabaseAdmin
            .from("product_variants")
            .select("weight, price")
            .eq("id", item.variant_id)
            .single();

          if (product) {
            const { error: itemError } = await supabaseAdmin.from("order_items").insert({
              order_id: order.id,
              product_id: item.product_id,
              variant_id: item.variant_id,
              product_name: product.name,
              weight: variant?.weight || 0,
              quantity: item.quantity,
              unit_price: item.price,
              total_price: item.price * item.quantity,
            });

            if (itemError) {
              console.error("❌ Failed to create order item:", itemError);
              orderItemsErrors.push(itemError);
            }
          } else {
            console.error("❌ Product not found for order item:", item.product_id);
            orderItemsErrors.push(new Error(`Product not found: ${item.product_id}`));
          }
        }

        // If any order items failed, rollback the order
        if (orderItemsErrors.length > 0) {
          console.error("❌ CRITICAL: Failed to create order items, rolling back order");
          await supabaseAdmin.from("orders").delete().eq("id", order.id);
          return { 
            success: false, 
            error: `Failed to create order items: ${orderItemsErrors.map(e => e.message).join(', ')}. Order was rolled back.` 
          };
        }

        console.log(`✅ Created ${cartItems.length} order items successfully`);

        // Delete pending order
        await supabaseAdmin.from("pending_orders").delete().eq("id", pendingOrder.id);

        console.log("✅ Order created successfully:", order.id);
        return { success: true };
      }

      case "invoice.paid": {
        // A billing cycle has been successfully paid.
        // Billing is handled by Razorpay; we create or ensure a delivery
        // record exists for this cycle in subscription_deliveries.
        const invoiceEntity = payload.invoice?.entity;

        if (!invoiceEntity || !invoiceEntity.subscription_id) {
          return { success: false, error: "Missing invoice or subscription_id" };
        }

        console.log("📄 Processing invoice.paid:", {
          invoice_id: invoiceEntity.id,
          subscription_id: invoiceEntity.subscription_id,
          amount_paid: invoiceEntity.amount_paid / 100,
          billing_cycle: invoiceEntity.billing_cycle,
        });

        // Find our internal subscription (pending_subscriptions is our source of truth)
        const { data: pendingSub, error: pendingError } = await supabaseAdmin
          .from("pending_subscriptions")
          .select("id")
          .eq("razorpay_subscription_id", invoiceEntity.subscription_id)
          .maybeSingle();

        if (pendingError) {
          console.error("❌ Error fetching pending subscription for invoice.paid:", pendingError);
          return { success: false, error: pendingError.message };
        }

        if (!pendingSub) {
          console.warn("⚠️ No pending subscription found for invoice.paid, treating as idempotent");
          return { success: true };
        }

        // Determine cycle number:
        // Prefer billing_cycle from invoice if present, otherwise
        // use count(subscription_deliveries) + 1 to stay consistent.
        let cycleNumber = invoiceEntity.billing_cycle ?? null;

        if (!cycleNumber) {
          const { data: existingDeliveries, error: deliveriesError } = await supabaseAdmin
            .from("subscription_deliveries")
            .select("id", { count: "exact", head: true })
            .eq("subscription_id", pendingSub.id);

          if (deliveriesError) {
            console.error("❌ Error counting deliveries for invoice.paid:", deliveriesError);
            return { success: false, error: deliveriesError.message };
          }

          // existingDeliveries?.length is not available with head:true; use count
          const count = (existingDeliveries as any)?.length ?? 0;
          cycleNumber = (count || 0) + 1;
        }

        // Ensure we don't create duplicate delivery for the same cycle
        const { data: existingDelivery, error: existingDeliveryError } = await supabaseAdmin
          .from("subscription_deliveries")
          .select("id")
          .eq("subscription_id", pendingSub.id)
          .eq("cycle_number", cycleNumber)
          .maybeSingle();

        if (existingDeliveryError) {
          console.error("❌ Error checking existing delivery for invoice.paid:", existingDeliveryError);
          return { success: false, error: existingDeliveryError.message };
        }

        if (existingDelivery) {
          console.log("ℹ️ Delivery already exists for this cycle; skipping creation", {
            subscription_id: pendingSub.id,
            cycle_number: cycleNumber,
          });
          return { success: true };
        }

        const defaultDeliveryDate = new Date();
        defaultDeliveryDate.setDate(defaultDeliveryDate.getDate() + 1); // today + 1

        const deliveryPayload = {
          subscription_id: pendingSub.id,
          cycle_number: cycleNumber,
          delivery_date: defaultDeliveryDate.toISOString().slice(0, 10),
          status: "scheduled",
        };

        const { error: insertError } = await supabaseAdmin
          .from("subscription_deliveries")
          .insert(deliveryPayload);

        if (insertError) {
          console.error("❌ Failed to create delivery for invoice.paid:", insertError);
          return { success: false, error: insertError.message };
        }

        console.log("✅ Delivery scheduled for paid invoice:", {
          subscription_id: pendingSub.id,
          cycle_number: cycleNumber,
          delivery_date: deliveryPayload.delivery_date,
        });

        return { success: true };
      }

      case "invoice.failed": {
        const invoiceEntity = payload.invoice?.entity;
        console.log("⚠️ invoice.failed received:", {
          invoice_id: invoiceEntity?.id,
          subscription_id: invoiceEntity?.subscription_id,
          status: invoiceEntity?.status,
        });
        // We intentionally do not create or alter deliveries on failed invoices.
        return { success: true };
      }

      case "payment.failed": {
        // Delete pending order/subscription on payment failure
        const paymentEntity = payload.payment?.entity;
        if (!paymentEntity) {
          return { success: false, error: "Missing payment entity" };
        }

        // Try to find pending order
        const { data: pendingOrder } = await supabaseAdmin
          .from("pending_orders")
          .select("id")
          .eq("razorpay_order_id", paymentEntity.order_id)
          .maybeSingle();

        if (pendingOrder) {
          await supabaseAdmin.from("pending_orders").delete().eq("id", pendingOrder.id);
          console.log("✅ Deleted pending order after payment failure");
        }

        return { success: true };
      }

      default:
        // Subscription events are handled by razorpay-subscription-webhook.
        // Return success to avoid Razorpay retries if misconfigured.
        if (event.startsWith("subscription.")) {
          console.log("ℹ️ Ignoring subscription event (handled by razorpay-subscription-webhook):", event);
        } else {
          console.log("⚠️ Unhandled event:", event);
        }
        return { success: true };
    }
  } catch (error) {
    console.error("❌ Error processing webhook event:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Get webhook secret
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("❌ Webhook secret not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawBody = await req.text();
    const internalRetrySecret = req.headers.get("X-Internal-Queue-Retry");
    const queueSecret = Deno.env.get("PROCESS_WEBHOOK_QUEUE_SECRET");

    // Skip signature verification for internal retries from process-webhook-queue
    const isInternalRetry = queueSecret && internalRetrySecret === queueSecret;

    if (!isInternalRetry) {
      const signature = req.headers.get("X-Razorpay-Signature");
      const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("❌ Invalid webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.log("📥 Webhook received via internal queue retry (signature bypassed)");
    }

    // Parse webhook data
    const webhookData: WebhookPayload = JSON.parse(rawBody);
    const { event, payload } = webhookData;

    console.log("📥 Webhook received:", event);

    // Log webhook event
    const { data: logData } = await supabaseAdmin
      .from("webhook_logs")
      .insert({
        event_type: event,
        razorpay_event_id: payload.subscription?.entity?.id || payload.order?.entity?.id || payload.payment?.entity?.id || null,
        payload: webhookData,
        processed: false,
      })
      .select("id")
      .single();

    const webhookLogId = logData?.id;

    // Process webhook event
    const result = await processWebhookEvent(event, payload, supabaseAdmin);

    if (result.success && webhookLogId) {
      // Mark as processed (only on success - failed webhooks stay processed: false for debugging)
      await supabaseAdmin
        .from("webhook_logs")
        .update({ processed: true })
        .eq("id", webhookLogId);

      console.log("✅ Webhook processed successfully");
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Queue for retry
      console.error("❌ Webhook processing failed, queuing for retry:", result.error);

      await supabaseAdmin.from("webhook_queue").insert({
        event_type: event,
        payload: webhookData,
        retry_count: 0,
        max_retries: 5,
        next_retry_at: calculateNextRetry(0).toISOString(),
        last_error: result.error,
      });

      // Return 500 so Razorpay retries
      return new Response(
        JSON.stringify({ error: "Processing failed, queued for retry" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("❌ Error in razorpay-webhook:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
