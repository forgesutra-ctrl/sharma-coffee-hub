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
    subscription?: {
      entity: {
        id: string;
        status: string;
        plan_id: string;
        customer_id?: string;
        created_at: number;
        charge_at: number;
        paid_count: number;
        total_count: number;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity: {
        id: string;
        amount: number;
        status: string;
        order_id?: string;
      };
    };
    invoice?: {
      entity: {
        id: string;
        subscription_id: string;
        amount_paid: number;
        billing_cycle?: number;
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
    const rawBody = await req.text();
    const internalRetrySecret = req.headers.get("X-Internal-Queue-Retry");
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    const queueSecret = Deno.env.get("PROCESS_WEBHOOK_QUEUE_SECRET");

    const isInternalRetry = queueSecret && internalRetrySecret === queueSecret;

    if (!isInternalRetry && !webhookSecret) {
      console.error("Webhook secret not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!isInternalRetry && webhookSecret) {
      const signature = req.headers.get("X-Razorpay-Signature");
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
    } else if (isInternalRetry) {
      console.log("📥 Subscription webhook received via internal queue retry (signature bypassed)");
    }

    const webhookData: WebhookPayload = JSON.parse(rawBody);
    const { event, payload } = webhookData;

    const razorpayEventId = subscriptionEntity?.id ?? payload.invoice?.entity?.subscription_id ?? payload.payment?.entity?.id ?? null;
    const { data: logData } = await supabaseAdmin
      .from("webhook_logs")
      .insert({
        event_type: event,
        razorpay_event_id: razorpayEventId,
        payload: webhookData,
        processed: false,
      })
      .select("id")
      .single();
    const webhookLogId = logData?.id;

    console.log("=== RAZORPAY SUBSCRIPTION WEBHOOK ===");
    console.log("Event:", event);
    console.log("Timestamp:", new Date().toISOString());
    console.log("Payload:", JSON.stringify(payload, null, 2));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const subscriptionEntity = payload.subscription?.entity;
    const razorpaySubscriptionId = subscriptionEntity?.id ?? payload.invoice?.entity?.subscription_id;
    const notes = subscriptionEntity?.notes || {};

    // For subscription.* events, require subscription entity
    if (event.startsWith("subscription.") && !subscriptionEntity) {
      console.error("[SUB-WEBHOOK] Invalid payload: missing subscription entity for event:", event);
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For invoice.paid, require invoice entity
    if (event === "invoice.paid" && !payload.invoice?.entity?.subscription_id) {
      console.error("[SUB-WEBHOOK] Invalid payload: missing invoice.subscription_id for invoice.paid");
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (event) {
      case "subscription.authenticated": {
        console.log("[SUB-WEBHOOK] Processing subscription.authenticated for sub:", razorpaySubscriptionId);

        try {
          const razorpayPlanId = subscriptionEntity!.plan_id;
          const calculateNextDeliveryDate = (): string => {
            const d = new Date();
            d.setDate(d.getDate() + 30);
            return d.toISOString().split("T")[0];
          };

          // Try pending_subscriptions first
          const { data: pendingSub, error: pendingError } = await supabaseAdmin
            .from("pending_subscriptions")
            .select("*")
            .eq("razorpay_subscription_id", razorpaySubscriptionId)
            .maybeSingle();

          if (!pendingError && pendingSub) {
            const subDay = pendingSub.preferred_delivery_date ?? 15;
            const calcFromDay = (dayOfMonth: number): string => {
              const now = new Date();
              const currentDay = now.getDate();
              const deliveryDate = dayOfMonth > currentDay
                ? new Date(now.getFullYear(), now.getMonth(), dayOfMonth)
                : new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
              return deliveryDate.toISOString().split("T")[0];
            };

            const { data: defaultPlan } = await supabaseAdmin
              .from("subscription_plans")
              .select("id")
              .eq("is_active", true)
              .limit(1)
              .maybeSingle();
            const planIdForPending = defaultPlan?.id ?? (await supabaseAdmin.from("subscription_plans").select("id").limit(1).maybeSingle()).data?.id;
            if (!planIdForPending) {
              console.error("[SUB-WEBHOOK] No subscription_plan found for pending subscription");
              break;
            }

            const subscriptionData = {
              user_id: pendingSub.user_id,
              plan_id: planIdForPending,
              razorpay_subscription_id: razorpaySubscriptionId,
              product_id: pendingSub.product_id,
              variant_id: pendingSub.variant_id,
              variant_amount: pendingSub.variant_amount ?? null,
              quantity: pendingSub.quantity,
              status: "active" as const,
              preferred_delivery_date: subDay,
              next_delivery_date: calcFromDay(subDay),
              next_billing_date: calcFromDay(subDay),
              total_deliveries: pendingSub.total_deliveries ?? 12,
              completed_deliveries: 0,
              shipping_address: pendingSub.shipping_address ?? null,
            };

            const { data: newSub, error: createErr } = await supabaseAdmin
              .from("user_subscriptions")
              .insert(subscriptionData)
              .select()
              .single();

            if (createErr) {
              console.error("[SUB-WEBHOOK] Failed to create user_subscription from pending:", createErr);
            } else {
              await supabaseAdmin.from("pending_subscriptions").delete().eq("id", pendingSub.id);
              console.log("[SUB-WEBHOOK] Created user_subscription from pending:", newSub?.id);
            }
            break;
          }

          // No pending: create from payload - use notes (from our app) or lookup by plan_id
          let userId: string | null = notes?.user_id ?? null;
          let productId: string | null = notes?.product_id ?? null;
          let variantId: string | null = notes?.variant_id ?? null;
          let variantPrice: number | null = null;

          if (userId && productId && variantId) {
            const { data: v } = await supabaseAdmin.from("product_variants").select("price").eq("id", variantId).maybeSingle();
            variantPrice = v?.price ?? null;
          } else {
            const { data: variantRow } = await supabaseAdmin
              .from("product_variants")
              .select("id, product_id, price")
              .eq("razorpay_plan_id", razorpayPlanId)
              .maybeSingle();
            if (variantRow) {
              productId = variantRow.product_id;
              variantId = variantRow.id;
              variantPrice = variantRow.price;
            }
            if (!userId) {
              try {
                const keyId = Deno.env.get("RAZORPAY_KEY_ID");
                const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
                if (subscriptionEntity!.customer_id && keyId && keySecret) {
                  const custRes = await fetch(`https://api.razorpay.com/v1/customers/${subscriptionEntity!.customer_id}`, {
                    headers: { Authorization: `Basic ${btoa(keyId + ":" + keySecret)}` },
                  });
                  const customer = custRes.ok ? await custRes.json() : null;
                  const email = customer?.email;
                  if (email) {
                    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
                    const u = users?.users?.find((x: { email?: string }) => x.email?.toLowerCase() === email?.toLowerCase());
                    userId = u?.id ?? null;
                  }
                }
              } catch (_) {}
            }
          }

          if (!userId || !productId || !variantId) {
            console.warn("[SUB-WEBHOOK] Cannot create user_subscription: missing user_id, product_id, or variant_id. plan_id:", razorpayPlanId);
            break;
          }

          const { data: defaultPlan } = await supabaseAdmin.from("subscription_plans").select("id").eq("is_active", true).limit(1).maybeSingle();
          const planId = defaultPlan?.id;
          if (!planId) {
            console.error("[SUB-WEBHOOK] No active subscription_plan found");
            break;
          }

          const subscriptionData = {
            user_id: userId,
            plan_id: planId,
            razorpay_subscription_id: razorpaySubscriptionId,
            product_id: productId,
            variant_id: variantId,
            variant_amount: variantPrice,
            quantity: 1,
            status: "active" as const,
            preferred_delivery_date: 15,
            next_delivery_date: calculateNextDeliveryDate(),
            next_billing_date: calculateNextDeliveryDate(),
            total_deliveries: 12,
            completed_deliveries: 0,
            shipping_address: null,
          };

          const { error: createErr } = await supabaseAdmin
            .from("user_subscriptions")
            .insert(subscriptionData);

          if (createErr) {
            console.error("[SUB-WEBHOOK] Failed to create user_subscription from payload:", createErr);
          } else {
            console.log("[SUB-WEBHOOK] Created user_subscription from payload for user:", userId);
          }
        } catch (e) {
          console.error("[SUB-WEBHOOK] subscription.authenticated error:", e);
        }
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
            const { data: defPlan } = await supabaseAdmin.from("subscription_plans").select("id").eq("is_active", true).limit(1).maybeSingle();
            const planIdAct = defPlan?.id ?? (await supabaseAdmin.from("subscription_plans").select("id").limit(1).maybeSingle()).data?.id;
            if (!planIdAct) {
              console.error("[SUB-WEBHOOK] No subscription_plan for activation");
              break;
            }
            const calculateNextDeliveryDate = (dayOfMonth: number): string => {
              const now = new Date();
              const currentDay = now.getDate();
              const deliveryDate = dayOfMonth > currentDay
                ? new Date(now.getFullYear(), now.getMonth(), dayOfMonth)
                : new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
              return deliveryDate.toISOString().split("T")[0];
            };
            const subDay = pendingSub.preferred_delivery_date ?? 15;
            const subscriptionData = {
              user_id: pendingSub.user_id,
              plan_id: planIdAct,
              razorpay_subscription_id: razorpaySubscriptionId,
              product_id: pendingSub.product_id,
              variant_id: pendingSub.variant_id,
              variant_amount: pendingSub.variant_amount ?? null,
              quantity: pendingSub.quantity,
              status: "active" as const,
              preferred_delivery_date: subDay,
              next_delivery_date: calculateNextDeliveryDate(subDay),
              next_billing_date: calculateNextDeliveryDate(subDay),
              total_deliveries: pendingSub.total_deliveries ?? 12,
              completed_deliveries: 0,
              shipping_address: pendingSub.shipping_address ?? null,
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

      case "invoice.paid":
      case "subscription.charged": {
        const subId = razorpaySubscriptionId;
        const paymentEntity = payload.payment?.entity ?? null;
        const invoiceEntity = payload.invoice?.entity ?? null;
        const paymentId = paymentEntity?.id ?? null;
        const amountRupees = paymentEntity ? paymentEntity.amount / 100 : (invoiceEntity?.amount_paid ?? 0) / 100;

        console.log("[SUB-WEBHOOK] Processing", event, "for sub:", subId);

        if (!paymentId && !invoiceEntity?.subscription_id) {
          console.warn("[SUB-WEBHOOK] No payment_id or invoice.subscription_id, skipping");
          break;
        }

        try {
          const { data: userSub, error: subErr } = await supabaseAdmin
            .from("user_subscriptions")
            .select("*")
            .eq("razorpay_subscription_id", subId)
            .maybeSingle();

          if (subErr || !userSub) {
            console.log("[SUB-WEBHOOK] No user_subscription found for sub:", subId, "- needs manual handling");
            break;
          }

          const hasShipping = userSub.shipping_address && typeof userSub.shipping_address === "object" && Object.keys(userSub.shipping_address ?? {}).length > 0;
          if (!hasShipping) {
            console.log("[SUB-WEBHOOK] No shipping address found for sub:", subId, "- needs manual handling");
            break;
          }

          const orderNumber = `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
          const { data: order, error: orderErr } = await supabaseAdmin
            .from("orders")
            .insert({
              user_id: userSub.user_id,
              order_number: orderNumber,
              status: "confirmed",
              payment_status: "paid",
              razorpay_payment_id: paymentId,
              total_amount: amountRupees,
              subtotal: amountRupees,
              shipping_address: userSub.shipping_address,
              payment_method: "razorpay",
              payment_type: "prepaid",
            })
            .select()
            .single();

          if (orderErr || !order) {
            console.error("[SUB-WEBHOOK] Failed to create order:", orderErr);
            break;
          }

          const { data: product } = await supabaseAdmin.from("products").select("name").eq("id", userSub.product_id).maybeSingle();
          const { data: variant } = userSub.variant_id
            ? await supabaseAdmin.from("product_variants").select("weight, price").eq("id", userSub.variant_id).maybeSingle()
            : { data: null };

          const unitPrice = variant?.price ?? amountRupees / (userSub.quantity || 1);
          const { error: itemsErr } = await supabaseAdmin
            .from("order_items")
            .insert({
              order_id: order.id,
              product_id: userSub.product_id,
              variant_id: userSub.variant_id ?? null,
              product_name: product?.name ?? "Subscription Item",
              weight: variant?.weight ?? 250,
              quantity: userSub.quantity ?? 1,
              unit_price: unitPrice,
              total_price: amountRupees,
            });

          if (itemsErr) {
            console.error("[SUB-WEBHOOK] Failed to create order_items:", itemsErr);
            await supabaseAdmin.from("orders").delete().eq("id", order.id);
            break;
          }

          const billingCycle = (userSub.completed_deliveries ?? 0) + 1;
          const billingDateStr = new Date().toISOString().split("T")[0];
          const nextDate = new Date(userSub.next_delivery_date ?? new Date());
          nextDate.setDate(nextDate.getDate() + 30);
          const nextDateStr = nextDate.toISOString().split("T")[0];

          await supabaseAdmin
            .from("subscription_orders")
            .insert({
              subscription_id: userSub.id,
              order_id: order.id,
              billing_cycle: billingCycle,
              razorpay_payment_id: paymentId,
              billing_date: billingDateStr,
              status: "success",
            });

          await supabaseAdmin
            .from("user_subscriptions")
            .update({
              completed_deliveries: billingCycle,
              next_delivery_date: nextDateStr,
              next_billing_date: nextDateStr,
              last_payment_status: "success",
              updated_at: new Date().toISOString(),
            })
            .eq("id", userSub.id);

          console.log("[SUB-WEBHOOK] Created order:", orderNumber);

          try {
            const { data: profile } = await supabaseAdmin.from("profiles").select("email, phone").eq("id", userSub.user_id).maybeSingle();
            if (profile?.email || profile?.phone) {
              await supabaseAdmin.functions.invoke("send-order-notification", {
                body: {
                  orderId: order.id,
                  customerEmail: profile.email || "",
                  customerPhone: profile.phone || "",
                  customerName: (userSub.shipping_address as Record<string, unknown>)?.fullName || "Customer",
                  orderNumber: order.order_number,
                  orderTotal: amountRupees,
                  orderItems: [{ product_name: product?.name || "Subscription Item", quantity: userSub.quantity ?? 1, unit_price: unitPrice, total_price: amountRupees }],
                  shippingAddress: userSub.shipping_address || {},
                  paymentType: "prepaid",
                  deliveryDate: nextDateStr,
                },
              });
            }
          } catch (_) {}
        } catch (e) {
          console.error("[SUB-WEBHOOK] Error processing", event, ":", e);
        }
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

    if (webhookLogId) {
      await supabaseAdmin.from("webhook_logs").update({ processed: true }).eq("id", webhookLogId);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[SUB-WEBHOOK] Error:", error);
    // Always return 200 to prevent Razorpay retries - log for manual handling
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
