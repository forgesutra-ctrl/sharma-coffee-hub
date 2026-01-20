import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Razorpay-Signature",
};

interface WebhookPayload {
  event: string;
  payload: {
    subscription: {
      entity: {
        id: string;
        status: string;
        plan_id: string;
        customer_id: string;
        created_at: number;
        charge_at: number;
        paid_count: number;
        total_count: number;
        notes: {
          user_id?: string;
          product_id?: string;
          variant_id?: string;
          delivery_date?: string;
        };
      };
    };
    payment?: {
      entity: {
        id: string;
        amount: number;
        status: string;
        order_id: string;
      };
    };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const signature = req.headers.get("X-Razorpay-Signature");
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("Webhook secret not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const rawBody = await req.text();

    if (signature && webhookSecret) {
      const expectedSignature = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(rawBody + webhookSecret)
      );
      const expectedSignatureHex = Array.from(new Uint8Array(expectedSignature))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      if (signature !== expectedSignatureHex) {
        console.error("Invalid webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const webhookData: WebhookPayload = JSON.parse(rawBody);
    const { event, payload } = webhookData;

    console.log("=== RAZORPAY SUBSCRIPTION WEBHOOK ===");
    console.log("Event:", event);
    console.log("Timestamp:", new Date().toISOString());
    console.log("Payload:", JSON.stringify(payload, null, 2));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const subscriptionEntity = payload.subscription?.entity;
    if (!subscriptionEntity) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const razorpaySubscriptionId = subscriptionEntity.id;
    const notes = subscriptionEntity.notes || {};

    switch (event) {
      case "subscription.authenticated": {
        // ✅ Payment authenticated - move from pending_subscriptions to user_subscriptions
        console.log("🔔 Subscription authenticated (payment confirmed):", razorpaySubscriptionId);
        
        // Find pending subscription
        const { data: pendingSub, error: pendingError } = await supabaseAdmin
          .from("pending_subscriptions")
          .select("*")
          .eq("razorpay_subscription_id", razorpaySubscriptionId)
          .maybeSingle();

        if (pendingError) {
          console.error("❌ Error fetching pending subscription:", pendingError);
          break;
        }

        if (!pendingSub) {
          console.warn("⚠️ No pending subscription found for:", razorpaySubscriptionId);
          console.warn("   Subscription may have already been processed or expired");
          break;
        }

        // Calculate delivery dates
        const calculateNextDeliveryDate = (dayOfMonth: number): string => {
          const now = new Date();
          const currentDay = now.getDate();
          let deliveryDate: Date;

          if (dayOfMonth > currentDay) {
            deliveryDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
          } else {
            deliveryDate = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
          }

          return deliveryDate.toISOString().split("T")[0];
        };

        // Create subscription in user_subscriptions
        const subscriptionData = {
          user_id: pendingSub.user_id,
          plan_id: pendingSub.plan_id,
          razorpay_subscription_id: razorpaySubscriptionId,
          product_id: pendingSub.product_id,
          variant_id: pendingSub.variant_id,
          variant_amount: pendingSub.variant_amount,
          quantity: pendingSub.quantity,
          status: "active" as const,
          preferred_delivery_date: pendingSub.preferred_delivery_date,
          next_delivery_date: calculateNextDeliveryDate(pendingSub.preferred_delivery_date),
          next_billing_date: calculateNextDeliveryDate(pendingSub.preferred_delivery_date),
          total_deliveries: pendingSub.total_deliveries,
          completed_deliveries: 0,
          shipping_address: pendingSub.shipping_address,
        };

        const { data: newSubscription, error: createError } = await supabaseAdmin
          .from("user_subscriptions")
          .insert(subscriptionData)
          .select()
          .single();

        if (createError) {
          console.error("❌ Failed to create subscription in user_subscriptions:", createError);
          break;
        }

        // Delete from pending_subscriptions
        const { error: deleteError } = await supabaseAdmin
          .from("pending_subscriptions")
          .delete()
          .eq("id", pendingSub.id);

        if (deleteError) {
          console.error("⚠️ Failed to delete pending subscription:", deleteError);
        } else {
          console.log("✅ Deleted pending subscription:", pendingSub.id);
        }

        console.log("✅ Subscription created in database after payment confirmation:");
        console.log("   Subscription ID:", newSubscription.id);
        console.log("   Razorpay Subscription ID:", razorpaySubscriptionId);
        console.log("   User ID:", newSubscription.user_id);
        console.log("   Status: active");
        break;
      }

      case "subscription.activated": {
        // Update existing subscription status (if it already exists)
        const { data: existingSub } = await supabaseAdmin
          .from("user_subscriptions")
          .select("id")
          .eq("razorpay_subscription_id", razorpaySubscriptionId)
          .maybeSingle();

        if (existingSub) {
          await supabaseAdmin
            .from("user_subscriptions")
            .update({
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("razorpay_subscription_id", razorpaySubscriptionId);

          console.log("✅ Subscription activated:", razorpaySubscriptionId);
        } else {
          // If subscription doesn't exist, try to create from pending
          console.log("⚠️ Subscription not found, checking pending_subscriptions...");
          
          const { data: pendingSub } = await supabaseAdmin
            .from("pending_subscriptions")
            .select("*")
            .eq("razorpay_subscription_id", razorpaySubscriptionId)
            .maybeSingle();

          if (pendingSub) {
            // Same logic as subscription.authenticated
            const calculateNextDeliveryDate = (dayOfMonth: number): string => {
              const now = new Date();
              const currentDay = now.getDate();
              let deliveryDate: Date;

              if (dayOfMonth > currentDay) {
                deliveryDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
              } else {
                deliveryDate = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
              }

              return deliveryDate.toISOString().split("T")[0];
            };

            const subscriptionData = {
              user_id: pendingSub.user_id,
              plan_id: pendingSub.plan_id,
              razorpay_subscription_id: razorpaySubscriptionId,
              product_id: pendingSub.product_id,
              variant_id: pendingSub.variant_id,
              variant_amount: pendingSub.variant_amount,
              quantity: pendingSub.quantity,
              status: "active" as const,
              preferred_delivery_date: pendingSub.preferred_delivery_date,
              next_delivery_date: calculateNextDeliveryDate(pendingSub.preferred_delivery_date),
              next_billing_date: calculateNextDeliveryDate(pendingSub.preferred_delivery_date),
              total_deliveries: pendingSub.total_deliveries,
              completed_deliveries: 0,
              shipping_address: pendingSub.shipping_address,
            };

            const { data: newSubscription, error: createError } = await supabaseAdmin
              .from("user_subscriptions")
              .insert(subscriptionData)
              .select()
              .single();

            if (!createError && newSubscription) {
              await supabaseAdmin
                .from("pending_subscriptions")
                .delete()
                .eq("id", pendingSub.id);

              console.log("✅ Subscription created from pending on activation:", razorpaySubscriptionId);
            }
          }
        }
        break;
      }

      case "subscription.charged": {
        const paymentEntity = payload.payment?.entity;
        if (!paymentEntity) break;

        const { data: subscription } = await supabaseAdmin
          .from("user_subscriptions")
          .select("*")
          .eq("razorpay_subscription_id", razorpaySubscriptionId)
          .maybeSingle();

        if (!subscription) {
          console.error("Subscription not found:", razorpaySubscriptionId);
          break;
        }

        const billingCycle = (subscription.completed_deliveries || 0) + 1;

        const { data: order, error: orderError } = await supabaseAdmin
          .from("orders")
          .insert({
            user_id: subscription.user_id,
            order_number: `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            status: "confirmed",
            total_amount: paymentEntity.amount / 100,
            subtotal: paymentEntity.amount / 100,
            shipping_address: subscription.shipping_address,
            payment_method: "razorpay",
            payment_status: "paid",
            payment_type: "prepaid",
            razorpay_payment_id: paymentEntity.id,
          })
          .select()
          .single();

        if (orderError || !order) {
          console.error("Failed to create order:", orderError);
          break;
        }

        // Get product and variant details for order items
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("name")
          .eq("id", subscription.product_id)
          .maybeSingle();

        const { data: variant } = subscription.variant_id
          ? await supabaseAdmin
              .from("product_variants")
              .select("weight, price")
              .eq("id", subscription.variant_id)
              .maybeSingle()
          : { data: null };

        // Create order items
        if (product) {
          const unitPrice = variant?.price || (paymentEntity.amount / 100 / subscription.quantity);
          await supabaseAdmin
            .from("order_items")
            .insert({
              order_id: order.id,
              product_id: subscription.product_id,
              variant_id: subscription.variant_id || null,
              product_name: product.name,
              weight: variant?.weight || 0,
              grind_type: "Whole Bean", // Default, can be updated if needed
              quantity: subscription.quantity,
              unit_price: unitPrice,
              total_price: paymentEntity.amount / 100,
              is_subscription: true,
            });
        }

        await supabaseAdmin
          .from("subscription_orders")
          .insert({
            subscription_id: subscription.id,
            order_id: order.id,
            billing_cycle: billingCycle,
            razorpay_payment_id: paymentEntity.id,
            status: "success",
          });

        const nextDeliveryDate = new Date(subscription.next_delivery_date);
        nextDeliveryDate.setMonth(nextDeliveryDate.getMonth() + 1);

        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            completed_deliveries: billingCycle,
            next_delivery_date: nextDeliveryDate.toISOString().split("T")[0],
            next_billing_date: nextDeliveryDate.toISOString().split("T")[0],
            last_payment_status: "success",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        // Get product details for notification
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("name")
          .eq("id", subscription.product_id)
          .maybeSingle();

        // Get user email and phone for notification
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email, phone")
          .eq("id", subscription.user_id)
          .maybeSingle();

        // Send notification about successful charge
        if (profile?.email || profile?.phone) {
          try {
            await supabaseAdmin.functions.invoke("send-order-notification", {
              body: {
                orderId: order.id,
                customerEmail: profile.email || "",
                customerPhone: profile.phone || "",
                customerName: subscription.shipping_address?.fullName || "Customer",
                orderNumber: order.order_number,
                orderTotal: paymentEntity.amount / 100,
                orderItems: [{
                  product_name: product?.name || "Subscription Item",
                  quantity: subscription.quantity,
                  unit_price: paymentEntity.amount / 100 / subscription.quantity,
                  total_price: paymentEntity.amount / 100,
                }],
                shippingAddress: subscription.shipping_address || {},
                paymentType: "prepaid",
                deliveryDate: nextDeliveryDate.toISOString().split("T")[0],
              },
            });
          } catch (notifError) {
            console.error("Failed to send subscription charge notification:", notifError);
          }
        }

        console.log("Subscription charged successfully:", {
          razorpaySubscriptionId,
          orderId: order.id,
          billingCycle,
          nextDeliveryDate: nextDeliveryDate.toISOString().split("T")[0],
        });
        break;
      }

      case "subscription.pending": {
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            last_payment_status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_subscription_id", razorpaySubscriptionId);

        console.log("Subscription payment pending:", razorpaySubscriptionId);
        break;
      }

      case "subscription.cancelled": {
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_subscription_id", razorpaySubscriptionId);

        console.log("Subscription cancelled:", razorpaySubscriptionId);
        break;
      }

      case "subscription.paused": {
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "paused",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_subscription_id", razorpaySubscriptionId);

        console.log("Subscription paused:", razorpaySubscriptionId);
        break;
      }

      case "subscription.resumed": {
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_subscription_id", razorpaySubscriptionId);

        console.log("Subscription resumed:", razorpaySubscriptionId);
        break;
      }

      case "subscription.completed": {
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_subscription_id", razorpaySubscriptionId);

        console.log("Subscription completed:", razorpaySubscriptionId);
        break;
      }

      case "subscription.payment_failed": {
        const paymentEntity = payload.payment?.entity;
        if (!paymentEntity) break;

        const { data: subscription } = await supabaseAdmin
          .from("user_subscriptions")
          .select("*")
          .eq("razorpay_subscription_id", razorpaySubscriptionId)
          .maybeSingle();

        if (!subscription) {
          console.error("Subscription not found for failed payment:", razorpaySubscriptionId);
          break;
        }

        // Update subscription with failed payment status
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            last_payment_status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        // Get user email and phone for notification
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email, phone")
          .eq("id", subscription.user_id)
          .maybeSingle();

        // Send notification about failed payment
        if (profile?.email || profile?.phone) {
          try {
            await supabaseAdmin.functions.invoke("send-order-notification", {
              body: {
                orderId: null,
                customerEmail: profile.email || "",
                customerPhone: profile.phone || "",
                customerName: subscription.shipping_address?.fullName || "Customer",
                orderNumber: `SUB-${subscription.id.substring(0, 8)}`,
                orderTotal: paymentEntity.amount / 100,
                orderItems: [{
                  product_name: "Subscription Payment Failed",
                  quantity: 1,
                  unit_price: paymentEntity.amount / 100,
                  total_price: paymentEntity.amount / 100,
                }],
                shippingAddress: subscription.shipping_address || {},
                paymentType: "prepaid",
                isPaymentFailed: true,
                failureReason: "Payment failed. Please update your payment method.",
              },
            });
          } catch (notifError) {
            console.error("Failed to send payment failure notification:", notifError);
          }
        }

        console.log("Subscription payment failed:", razorpaySubscriptionId);
        break;
      }

      default:
        console.log("Unhandled event:", event);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in razorpay-subscription-webhook:", error);

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
