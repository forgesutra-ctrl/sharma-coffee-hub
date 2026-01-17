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

    console.log("Received webhook event:", event, payload);

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

    switch (event) {
      case "subscription.activated": {
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_subscription_id", razorpaySubscriptionId);

        console.log("Subscription activated:", razorpaySubscriptionId);
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

        console.log("Subscription charged successfully:", razorpaySubscriptionId);
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
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_subscription_id", razorpaySubscriptionId);

        console.log("Subscription completed:", razorpaySubscriptionId);
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
