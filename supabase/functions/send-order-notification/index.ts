import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationRequest {
  orderId: string;
  customerEmail: string;
  customerPhone: string; // Format: +91XXXXXXXXXX (with country code)
  customerName: string;
  orderNumber: string;
  orderTotal: number;
  orderItems: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    weight?: number;
    grind_type?: string;
  }>;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    phone: string;
  };
  paymentType: "prepaid" | "cod";
  deliveryDate?: string;
  trackingNumber?: string;
}

// Email template using Resend
async function sendEmailNotification(data: NotificationRequest): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not configured, skipping email notification");
    return { success: false, error: "Email service not configured" };
  }

  try {
    // Format order items for email
    const itemsHtml = data.orderItems.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name}${item.grind_type ? ` (${item.grind_type})` : ''}${item.weight ? ` - ${item.weight}g` : ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.unit_price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.total_price.toFixed(2)}</td>
      </tr>
    `).join('');

    const codInfo = data.paymentType === "cod" ? `
      <p style="margin: 16px 0; padding: 12px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
        <strong>Cash on Delivery:</strong> You've paid ₹${(data.orderTotal * 0.1).toFixed(2)} as advance. 
        Please keep ₹${(data.orderTotal * 0.9).toFixed(2)} ready for delivery.
      </p>
    ` : '';

    const trackingInfo = data.trackingNumber ? `
      <p style="margin: 16px 0; padding: 12px; background-color: #d1ecf1; border-left: 4px solid #0dcaf0; border-radius: 4px;">
        <strong>Tracking Number:</strong> ${data.trackingNumber}<br>
        Track your order: <a href="https://www.dtdc.in/tracking/tracking_results.asp?strCnno=${data.trackingNumber}" style="color: #0dcaf0;">Click here to track</a>
      </p>
    ` : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ${data.orderNumber}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #C8A97E 0%, #8B6F47 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Order Confirmed!</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Thank you for your order</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${data.customerName},</p>
          
          <p style="font-size: 16px;">We're excited to confirm your order <strong>#${data.orderNumber}</strong> has been received and is being processed!</p>
          
          ${codInfo}
          ${trackingInfo}
          
          <h2 style="color: #C8A97E; border-bottom: 2px solid #C8A97E; padding-bottom: 10px; margin-top: 30px;">Order Details</h2>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold; border-top: 2px solid #ddd;">Total Amount:</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #C8A97E; border-top: 2px solid #ddd;">₹${data.orderTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <h2 style="color: #C8A97E; border-bottom: 2px solid #C8A97E; padding-bottom: 10px; margin-top: 30px;">Shipping Address</h2>
          <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>${data.shippingAddress.fullName}</strong></p>
            <p style="margin: 5px 0;">${data.shippingAddress.addressLine1}</p>
            ${data.shippingAddress.addressLine2 ? `<p style="margin: 5px 0;">${data.shippingAddress.addressLine2}</p>` : ''}
            <p style="margin: 5px 0;">${data.shippingAddress.city}, ${data.shippingAddress.state} - ${data.shippingAddress.pincode}</p>
            ${data.shippingAddress.landmark ? `<p style="margin: 5px 0;">Landmark: ${data.shippingAddress.landmark}</p>` : ''}
            <p style="margin: 5px 0;">Phone: ${data.shippingAddress.phone}</p>
          </div>
          
          ${data.deliveryDate ? `
            <p style="margin: 20px 0; padding: 12px; background-color: #e7f3ff; border-left: 4px solid #0d6efd; border-radius: 4px;">
              <strong>Expected Delivery:</strong> ${new Date(data.deliveryDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          ` : ''}
          
          <div class="section" style="background: #f0fdf4; padding: 15px; border-left: 4px solid #22c55e; margin-top: 20px;">
            <div class="section-title" style="color: #16a34a; font-size: 18px; font-weight: bold; margin-bottom: 10px;">📞 NEED HELP?</div>
            <p style="margin: 10px 0;">We're here to assist you anytime!</p>
            <p style="margin: 10px 0;">
              <strong>🔴 PRIMARY (WhatsApp Enabled):</strong><br/>
              <a href="tel:+918762988145" class="contact-link" style="font-size: 16px; font-weight: bold; color: #16a34a; text-decoration: none;">
                +91 8762 988 145
              </a>
            </p>
            <p style="margin: 10px 0;">
              <strong>🟡 SECONDARY:</strong><br/>
              <a href="tel:+916363235357" class="contact-link" style="color: #2563eb; text-decoration: none;">
                +91 6363 235 357
              </a>
            </p>
            <p style="margin: 10px 0;">
              <strong>🟠 STAFF:</strong><br/>
              <a href="tel:+918431891360" class="contact-link" style="color: #2563eb; text-decoration: none;">
                +91 84318 91360
              </a>
            </p>
            <p style="margin: 15px 0; border-top: 1px solid #86efac; padding-top: 10px;">
              <strong style="color: #16a34a;">💬 BEST OPTION:</strong><br/>
              <a href="https://wa.me/918762988145" class="contact-link" style="color: #22c55e; font-weight: bold; font-size: 14px; text-decoration: none;">
                Chat with us on WhatsApp
              </a>
            </p>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Available: 9 AM - 6 PM IST (Monday - Saturday)
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
            <p style="color: #666; font-size: 14px;">Need help? Contact us at <a href="mailto:ask@sharmacoffeeworks.com" style="color: #C8A97E;">ask@sharmacoffeeworks.com</a></p>
            <p style="color: #666; font-size: 14px; margin-top: 10px;">Thank you for choosing Sharma Coffee Works!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Sharma Coffee Works <orders@sharmacoffeeworks.com>", // Update with your verified domain
        to: data.customerEmail,
        subject: `Order Confirmed - #${data.orderNumber}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Resend API error:", errorData);
      return { success: false, error: `Email send failed: ${response.status}` };
    }

    console.log("Email notification sent successfully");
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// WhatsApp notification using Twilio API
async function sendWhatsAppNotification(data: NotificationRequest): Promise<{ success: boolean; error?: string }> {
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioWhatsAppFrom = Deno.env.get("TWILIO_WHATSAPP_FROM"); // Format: whatsapp:+14155238886

  if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppFrom) {
    console.warn("Twilio credentials not configured, skipping WhatsApp notification");
    return { success: false, error: "WhatsApp service not configured" };
  }

  try {
    // Format phone number (ensure it starts with +)
    let phoneNumber = data.customerPhone.trim();
    if (!phoneNumber.startsWith('+')) {
      // If no country code, assume India (+91)
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+91' + phoneNumber.substring(1);
      } else if (phoneNumber.length === 10) {
        phoneNumber = '+91' + phoneNumber;
      } else {
        phoneNumber = '+91' + phoneNumber;
      }
    }

    // Format order items for WhatsApp
    const itemsText = data.orderItems.map(item => 
      `• ${item.product_name}${item.grind_type ? ` (${item.grind_type})` : ''}${item.weight ? ` - ${item.weight}g` : ''} x${item.quantity} = ₹${item.total_price.toFixed(2)}`
    ).join('\n');

    const codInfo = data.paymentType === "cod" ? 
      `\n💰 *Cash on Delivery*\nAdvance Paid: ₹${(data.orderTotal * 0.1).toFixed(2)}\nBalance on Delivery: ₹${(data.orderTotal * 0.9).toFixed(2)}` : '';

    const trackingInfo = data.trackingNumber ? 
      `\n📦 *Tracking Number:* ${data.trackingNumber}\nTrack: https://www.dtdc.in/tracking/tracking_results.asp?strCnno=${data.trackingNumber}` : '';

    const deliveryInfo = data.deliveryDate ? 
      `\n📅 *Expected Delivery:* ${new Date(data.deliveryDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : '';

    const message = `🎉 *Order Confirmed!*

Hello ${data.customerName},

Your order #${data.orderNumber} has been confirmed!

📦 *Order Items:*
${itemsText}

💰 *Total Amount:* ₹${data.orderTotal.toFixed(2)}${codInfo}

📍 *Shipping Address:*
${data.shippingAddress.fullName}
${data.shippingAddress.addressLine1}${data.shippingAddress.addressLine2 ? '\n' + data.shippingAddress.addressLine2 : ''}
${data.shippingAddress.city}, ${data.shippingAddress.state} - ${data.shippingAddress.pincode}
${data.shippingAddress.landmark ? 'Landmark: ' + data.shippingAddress.landmark + '\n' : ''}Phone: ${data.shippingAddress.phone}${deliveryInfo}${trackingInfo}

Thank you for choosing Sharma Coffee Works! ☕

Need help?
🔴 PRIMARY: +91 8762 988 145 (This WhatsApp)
🟡 SECONDARY: +91 6363 235 357
🟠 STAFF: +91 84318 91360`;

    const whatsappTo = `whatsapp:${phoneNumber}`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: twilioWhatsAppFrom,
          To: whatsappTo,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Twilio API error:", errorData);
      return { success: false, error: `WhatsApp send failed: ${response.status}` };
    }

    console.log("WhatsApp notification sent successfully");
    return { success: true };
  } catch (error) {
    console.error("Error sending WhatsApp:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const notificationData: NotificationRequest = await req.json();

    // Validate required fields
    if (!notificationData.orderId || !notificationData.customerEmail || !notificationData.customerPhone) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: orderId, customerEmail, customerPhone",
          success: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send notifications in parallel (don't fail if one fails)
    const [emailResult, whatsappResult] = await Promise.allSettled([
      sendEmailNotification(notificationData),
      sendWhatsAppNotification(notificationData),
    ]);

    const emailSuccess = emailResult.status === "fulfilled" && emailResult.value.success;
    const whatsappSuccess = whatsappResult.status === "fulfilled" && whatsappResult.value.success;

    // Log results
    if (emailResult.status === "rejected") {
      console.error("Email notification failed:", emailResult.reason);
    } else if (!emailResult.value.success) {
      console.warn("Email notification skipped:", emailResult.value.error);
    }

    if (whatsappResult.status === "rejected") {
      console.error("WhatsApp notification failed:", whatsappResult.reason);
    } else if (!whatsappResult.value.success) {
      console.warn("WhatsApp notification skipped:", whatsappResult.value.error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent: emailSuccess,
        whatsappSent: whatsappSuccess,
        message: `Notifications sent: Email ${emailSuccess ? '✓' : '✗'}, WhatsApp ${whatsappSuccess ? '✓' : '✗'}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-order-notification:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
