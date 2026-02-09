// Supabase Edge Function: Monime Webhook Handler
// This function handles webhook events from Monime

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MONIME_API_BASE_URL = "https://api.monime.io/v1";

interface MonimeWebhookEvent {
  type: string;
  event?: string;
  name?: string;
  data: {
    id: string;
    status?: string;
    checkout_session_id?: string;
    amount?: number;
    currency?: string;
    metadata?: {
      payment_id?: string;
      organization_id?: string;
      member_id?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get webhook secret from environment (if Monime provides webhook signing)
    const webhookSecret = Deno.env.get("MONIME_WEBHOOK_SECRET");

    // Parse webhook event - handle different formats
    const rawBody = await req.text();

    // Log webhook payload for audit purposes
    const webhookLog = {
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(req.headers.entries()),
      body: rawBody,
      ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
    };
    console.log("Webhook payload received:", JSON.stringify(webhookLog, null, 2));

    // Verify webhook signature (implement based on Monime's documentation)
    const signature = req.headers.get("x-monime-signature") || req.headers.get("x-signature");
    let signatureVerified = false;
    if (webhookSecret && signature) {
      signatureVerified = await verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!signatureVerified) {
        console.error("Invalid webhook signature");
        throw new Error("Invalid webhook signature");
      }
      console.log("Webhook signature verified successfully");
    } else if (webhookSecret && !signature) {
      console.warn("Webhook secret configured but no signature provided");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Store webhook log in database for audit trail
    try {
      await supabaseClient.from("webhook_logs").insert({
        event_type: "monime_webhook",
        payload: webhookLog,
        signature: signature || null,
        verified: webhookSecret ? signatureVerified : null,
      });
    } catch (logError) {
      // Don't fail webhook processing if logging fails
      console.error("Failed to log webhook:", logError);
    }

    console.log("Raw webhook body:", rawBody);

    let event: MonimeWebhookEvent;
    try {
      const parsed = JSON.parse(rawBody);

      // Handle different possible Monime webhook envelope formats
      // 1) Newer format with { apiVersion, event: { name, ... }, object, data }
      if (parsed && typeof parsed === "object" && parsed.event) {
        const evt = parsed.event;
        const evtName =
          (typeof evt.name === "string" && evt.name) ||
          (typeof evt.type === "string" && evt.type) ||
          (typeof evt.id === "string" && evt.id) ||
          "payment.completed";

        event = {
          type: evtName,
          data: parsed.data || parsed.object || parsed,
        };
      } else {
        // 2) Legacy / simple formats where the root has type/event and data
        event = parsed;
      }
    } catch (e: any) {
      // Try to handle if the entire body is the data object
      try {
        const dataOnly = JSON.parse(rawBody);
        event = {
          type:
            (typeof dataOnly.type === "string" && dataOnly.type) ||
            (typeof dataOnly.event === "string" && dataOnly.event) ||
            "payment.completed",
          data: dataOnly.data || dataOnly,
        };
      } catch (e2) {
        throw new Error(`Invalid JSON in webhook body: ${(e as Error).message}`);
      }
    }

    console.log("Parsed webhook event:", JSON.stringify(event, null, 2));

    // Handle different event types - normalize event type
    // Check multiple possible locations for event type, guarding against non-string values
    const toLower = (val: unknown): string =>
      typeof val === "string" ? val.toLowerCase() : "";

    let eventType =
      toLower((event as any).type) ||
      toLower((event as any).event) ||
      toLower((event as any).name);

    // Normalize Monime-specific variants
    if (
      eventType === "payment.processing_started" ||
      eventType === "payment.processing_initiated"
    ) {
      eventType = "payment.processing";
    }

    // Monime sometimes uses "checkout_session.completed" (underscore)
    // Normalize it to the dot form we handle in the switch
    if (eventType === "checkout_session.completed") {
      eventType = "checkout.session.completed";
    }

    // Normalize checkout_session.cancelled to checkout.session.cancelled
    if (eventType === "checkout_session.cancelled" || eventType === "checkout_session.canceled") {
      eventType = "checkout.session.cancelled";
    }

    // Also check if status in data indicates completion
    if (!eventType && event.data) {
      const dataStatus = event.data.status?.toLowerCase();
      if (dataStatus === "completed" || dataStatus === "paid" || dataStatus === "succeeded") {
        eventType = "payment.completed";
        console.log(`Inferred event type from data.status: ${eventType}`);
      }
    }

    console.log(`Processing webhook event type: ${eventType || "unknown"}`);

    switch (eventType) {
      case "checkout.session.completed":
      case "payment.completed":
      case "payment.succeeded":
      case "payment.paid":
        await handlePaymentCompleted(supabaseClient, event.data);
        break;

      case "payment.failed":
      case "payment.failure":
        await handlePaymentFailed(supabaseClient, event.data);
        break;

      case "checkout.session.cancelled":
      case "checkout.session.canceled":
      case "payment.cancelled":
      case "payment.canceled":
        await handlePaymentCancelled(supabaseClient, event.data);
        break;

      case "payment.processing":
        await handlePaymentProcessing(supabaseClient, event.data);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type || event.event || "unknown"}`);
        console.log(`Full event structure:`, JSON.stringify(event, null, 2));
        // If we have data but no recognized event type, try to infer from data
        if (event.data && event.data.status) {
          const inferredStatus = event.data.status.toLowerCase();
          console.log(`Attempting to handle based on inferred status: ${inferredStatus}`);
          if (inferredStatus === "completed" || inferredStatus === "paid" || inferredStatus === "succeeded") {
            await handlePaymentCompleted(supabaseClient, event.data);
          }
        }
        break;
    }

    return new Response(
      JSON.stringify({
        success: true,
        received: true,
        eventType:
          typeof (event as any).type === "string"
            ? (event as any).type
            : eventType || "unknown",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error processing Monime webhook:", error);
    console.error("Error stack:", error.stack);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

async function handlePaymentCompleted(
  supabaseClient: any,
  data: MonimeWebhookEvent["data"]
) {
  console.log("Processing payment completed webhook:");
  console.log("Full webhook data:", JSON.stringify(data, null, 2));
  console.log("Webhook data keys:", Object.keys(data || {}));
  if (data.metadata) {
    console.log("Metadata keys:", Object.keys(data.metadata));
    console.log("Metadata:", JSON.stringify(data.metadata, null, 2));
  }

  // Try multiple ways to find the payment ID
  let paymentId = data.metadata?.payment_id ||
    data.metadata?.paymentId ||
    data.payment_id ||
    data.paymentId;

  // Extract checkout_session_id from various possible fields
  const checkoutSessionId = data.checkout_session_id ||
    data.checkoutSessionId ||
    data.session_id ||
    data.sessionId ||
    data.id; // Sometimes the id is the session ID

  // If not in metadata, try to find by checkout_session_id
  if (!paymentId && checkoutSessionId) {
    console.log(`Looking up payment by checkout_session_id: ${checkoutSessionId}`);
    const { data: paymentBySession, error: sessionError } = await supabaseClient
      .from("payments")
      .select("id")
      .eq("monime_checkout_session_id", checkoutSessionId)
      .maybeSingle();

    if (paymentBySession) {
      paymentId = paymentBySession.id;
      console.log(`Found payment by session ID: ${paymentId}`);
    } else if (sessionError) {
      console.error("Error looking up payment by session:", sessionError);
    }
  }

  // Last resort: try to find by monime_payment_id
  if (!paymentId && data.id) {
    console.log(`Looking up payment by monime_payment_id: ${data.id}`);
    const { data: paymentByMonimeId } = await supabaseClient
      .from("payments")
      .select("id")
      .eq("monime_payment_id", data.id)
      .maybeSingle();

    if (paymentByMonimeId) {
      paymentId = paymentByMonimeId.id;
      console.log(`Found payment by Monime payment ID: ${paymentId}`);
    }
  }

  if (!paymentId) {
    console.error("No payment ID found in webhook data. Data:", JSON.stringify(data, null, 2));
    throw new Error("Payment ID not found in webhook data. Please ensure payment_id is included in metadata when creating checkout session.");
  }

  console.log(`Found payment ID: ${paymentId}`);

  // Check if payment is already processed to avoid duplicates and race conditions
  const { data: currentPayment, error: checkError } = await supabaseClient
    .from("payments")
    .select("payment_status")
    .eq("id", paymentId)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking current payment status:", checkError);
  } else if (currentPayment?.payment_status === "completed") {
    console.log(`Payment ${paymentId} is already marked as completed. Skipping redundant webhook processing.`);
    return;
  }

  // Extract order number from webhook data - Monime sends order number in various fields
  // Check nested structures as well (order.number, payment.order_number, etc.)
  let orderNumber = data.order_number ||
    data.orderNumber ||
    data.order_id ||
    data.orderId ||
    data.metadata?.order_number ||
    data.metadata?.orderNumber ||
    data.order?.number ||
    data.order?.id ||
    data.payment?.order_number ||
    data.payment?.orderNumber ||
    data.result?.order_number ||
    data.result?.orderNumber ||
    data.result?.order?.number ||
    data.result?.order?.id ||
    null;

  // Fallback: search for anything that looks like an order reference
  if (!orderNumber) {
    const findOrder = (obj: any, depth = 0): string | null => {
      if (depth > 5 || !obj || typeof obj !== 'object') return null
      for (const [key, value] of Object.entries(obj)) {
        const k = key.toLowerCase()
        if (k.includes('order') && (typeof value === 'string' || typeof value === 'number')) {
          const val = String(value)
          if (val && val.length > 2) return val
        }
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const found = findOrder(value, depth + 1)
          if (found) return found
        }
      }
      return null
    }

    orderNumber = findOrder(data)
    if (orderNumber) console.log(`[Webhook] Inferred order number: ${orderNumber}`)
  }

  // If order number not found in webhook data, fetch it from Monime API
  // Try checkout session first (most likely to have order number), then payment endpoint
  if (!orderNumber) {
    try {
      const monimeApiKey = Deno.env.get("MONIME_ACCESS_TOKEN") || Deno.env.get("MONIME_API_KEY");
      const monimeSpaceId = Deno.env.get("MONIME_SPACE_ID");

      if (monimeApiKey && monimeSpaceId) {
        // Get checkout session ID from database if we have paymentId but not checkoutSessionId
        let sessionIdToCheck = checkoutSessionId;
        if (!sessionIdToCheck && paymentId) {
          const { data: paymentRecord } = await supabaseClient
            .from("payments")
            .select("monime_checkout_session_id")
            .eq("id", paymentId)
            .maybeSingle();

          if (paymentRecord?.monime_checkout_session_id) {
            sessionIdToCheck = paymentRecord.monime_checkout_session_id;
            console.log(`Retrieved checkout session ID from database: ${sessionIdToCheck}`);
          }
        }

        // First, try to get order number from checkout session
        if (sessionIdToCheck && sessionIdToCheck !== data.id) {
          try {
            console.log(`Fetching order number from Monime checkout session: ${sessionIdToCheck}`);
            const sessionResponse = await fetch(
              `${MONIME_API_BASE_URL}/checkout-sessions/${sessionIdToCheck}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${monimeApiKey}`,
                  "Content-Type": "application/json",
                  "Monime-Space-Id": monimeSpaceId,
                },
              }
            );

            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json();
              const session = sessionData?.result || sessionData;
              orderNumber = session?.order_number ||
                session?.orderNumber ||
                session?.order_id ||
                session?.orderId ||
                session?.order?.number ||
                session?.order?.id ||
                session?.payment?.order_number ||
                session?.payment?.orderNumber ||
                null;

              if (orderNumber) {
                console.log(`Found order number from checkout session: ${orderNumber}`);
              } else {
                console.log("Order number not found in checkout session response:", JSON.stringify(session, null, 2));
              }
            } else {
              console.warn(`Failed to fetch checkout session from Monime API: ${sessionResponse.status}`);
            }
          } catch (error) {
            console.warn("Error fetching checkout session from Monime API:", error);
          }
        }

        // If still not found, try payment endpoint
        if (!orderNumber && data.id) {
          try {
            console.log(`Fetching order number from Monime payment: ${data.id}`);
            const paymentResponse = await fetch(
              `${MONIME_API_BASE_URL}/payments/${data.id}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${monimeApiKey}`,
                  "Content-Type": "application/json",
                  "Monime-Space-Id": monimeSpaceId,
                },
              }
            );

            if (paymentResponse.ok) {
              const paymentData = await paymentResponse.json();
              const payment = paymentData?.result || paymentData;
              orderNumber = payment?.order_number ||
                payment?.orderNumber ||
                payment?.order_id ||
                payment?.orderId ||
                payment?.order?.number ||
                payment?.order?.id ||
                null;

              if (orderNumber) {
                console.log(`Found order number from Monime payment: ${orderNumber}`);
              } else {
                console.log("Order number not found in Monime payment response:", JSON.stringify(payment, null, 2));
              }
            } else {
              console.warn(`Failed to fetch payment from Monime API: ${paymentResponse.status}`);
            }
          } catch (error) {
            console.warn("Error fetching payment from Monime API:", error);
          }
        }
      } else {
        console.warn("Monime API credentials not configured, cannot fetch order number");
      }
    } catch (error) {
      console.warn("Error fetching order number from Monime API:", error);
    }
  }

  // Use order number as reference_number (preferred), fallback to checkout session ID
  const referenceNumber = orderNumber || checkoutSessionId || data.id || null;

  // CRITICAL: Verify payment status with Monime API BEFORE updating database
  // This prevents marking payments as completed when they're not actually completed
  const monimeApiKey = Deno.env.get("MONIME_ACCESS_TOKEN") || Deno.env.get("MONIME_API_KEY");
  const monimeSpaceId = Deno.env.get("MONIME_SPACE_ID");
  let verifiedPaymentStatus: string | null = null;
  let verificationPerformed = false;
  let shouldUpdateToCompleted = true;

  if (monimeApiKey && monimeSpaceId && data.id) {
    try {
      console.log(`Verifying payment with Monime API BEFORE updating: ${data.id}`);
      const verifyResponse = await fetch(
        `https://api.monime.io/payments/${data.id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${monimeApiKey}`,
            "Content-Type": "application/json",
            "Monime-Space-Id": monimeSpaceId,
          },
        }
      );

      if (verifyResponse.ok) {
        verificationPerformed = true;
        const verifyData = await verifyResponse.json();
        const paymentData = verifyData?.result || verifyData;
        verifiedPaymentStatus = paymentData?.status || paymentData?.payment_status;

        // Verify payment is actually completed
        if (verifiedPaymentStatus !== "completed" && verifiedPaymentStatus !== "paid" && verifiedPaymentStatus !== "succeeded" && verifiedPaymentStatus !== "success") {
          console.error(`❌ PAYMENT NOT COMPLETED: Monime API reports status "${verifiedPaymentStatus}", but webhook says completed. NOT updating payment to completed.`);
          shouldUpdateToCompleted = false;
          // Don't update payment status if verification shows it's not completed
          // Webhook might be premature or incorrect
        } else {
          console.log(`✅ Payment verified with Monime API - status confirmed as: ${verifiedPaymentStatus}`);
        }
      } else {
        const errorText = await verifyResponse.text();
        console.warn(`⚠️ Failed to verify payment with Monime API: ${verifyResponse.status} - ${errorText}`);
        console.warn("⚠️ Proceeding with webhook update, but payment status could not be verified");
        // If verification fails (API down, etc.), we still trust the webhook but log a warning
        verificationPerformed = false;
      }
    } catch (verifyError) {
      console.error("❌ Error verifying payment with Monime API:", verifyError);
      console.warn("⚠️ Proceeding with webhook update, but payment status could not be verified");
      // If verification fails (network error, etc.), we still trust the webhook but log a warning
      verificationPerformed = false;
    }
  } else {
    console.warn("⚠️ Monime API credentials not configured, skipping payment verification");
    console.warn("⚠️ Proceeding with webhook update without verification");
    verificationPerformed = false;
  }

  // Only block update if verification was performed AND it shows payment is NOT completed
  // If verification couldn't be performed (API down, etc.), we trust the webhook
  if (verificationPerformed && !shouldUpdateToCompleted) {
    console.error(`❌ NOT updating payment ${paymentId} to completed - Monime API verification failed`);
    throw new Error(`Payment verification failed: Monime API reports status "${verifiedPaymentStatus}", not completed. Payment will not be marked as completed.`);
  }

  const updateData: any = {
    monime_payment_id: data.id,
    payment_status: "completed",
    payment_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Always update reference_number to match Monime order number
  if (referenceNumber) {
    updateData.reference_number = referenceNumber;
    console.log(`Setting reference_number to: ${referenceNumber} (orderNumber: ${orderNumber || 'N/A'}, checkoutSessionId: ${checkoutSessionId || 'N/A'}, data.id: ${data.id || 'N/A'})`);
  } else {
    console.warn("No order number found in webhook data, using fallback. Webhook data:", JSON.stringify(data, null, 2));
  }

  // Update payment by ID (most reliable)
  console.log(`[Webhook] Attempting to update payment ${paymentId} to completed. Data:`, JSON.stringify(updateData, null, 2));

  const { error: updateError, data: updatedPayment } = await supabaseClient
    .from("payments")
    .update(updateData)
    .eq("id", paymentId)
    .neq("payment_status", "completed") // Atomic check: only update if not already completed
    .select()
    .maybeSingle();

  if (!updatedPayment) {
    console.log(`[Webhook] Payment ${paymentId} was already completed or not found. Skipping duplicate processing.`);
    return;
  }

  if (updateError) {
    console.error(`[Webhook] ERROR updating payment ${paymentId}:`, updateError);
    console.error(`[Webhook] Error details:`, JSON.stringify(updateError, null, 2));
    throw updateError;
  }

  if (!updatedPayment) {
    console.error(`[Webhook] Payment ${paymentId} not found after update attempt. Update data was:`, JSON.stringify(updateData));
    throw new Error(`Payment ${paymentId} not found after update`);
  }

  console.log(`[Webhook] ✅ Payment ${paymentId} updated successfully to status: ${updatedPayment.payment_status}`);
  console.log(`[Webhook] Updated payment row:`, JSON.stringify(updatedPayment, null, 2));

  // Fetch full payment data with member info (including all fields needed for receipt generation)
  const { data: payment, error: paymentFetchError } = await supabaseClient
    .from("payments")
    .select(`
      *,
      member:members(
        id,
        user_id,
        organization_id,
        full_name,
        membership_id,
        email,
        phone_number
      )
    `)
    .eq("id", paymentId)
    .single();

  if (paymentFetchError || !payment) {
    console.error("Error fetching payment after update:", paymentFetchError);
    throw new Error(`Payment not found after update: ${paymentFetchError?.message}`);
  }

  // Check if payment status is actually completed before proceeding
  if (payment.payment_status !== "completed") {
    console.warn(`Payment ${paymentId} status is ${payment.payment_status}, not completed. Skipping receipt generation.`);
    console.warn(`Payment details:`, JSON.stringify({
      id: payment.id,
      payment_status: payment.payment_status,
      monime_payment_id: payment.monime_payment_id,
      monime_checkout_session_id: payment.monime_checkout_session_id,
      reference_number: payment.reference_number,
    }, null, 2));
    return;
  }

  console.log(`Payment ${paymentId} confirmed as completed. Proceeding with receipt generation and notifications.`);

  // Update member's total_paid by recalculating from all completed payments
  if (payment.member_id) {
    const { data: allPayments, error: paymentsError } = await supabaseClient
      .from("payments")
      .select("amount, payment_status")
      .eq("member_id", payment.member_id);

    if (!paymentsError && allPayments) {
      // Calculate total_paid from all completed payments
      const totalPaid = allPayments
        .filter((p: any) => p.payment_status === "completed")
        .reduce((sum: number, p: any) => {
          const amount = typeof p.amount === "string"
            ? parseFloat(p.amount)
            : (p.amount || 0);
          return sum + amount;
        }, 0);

      // Update member's total_paid
      const { error: memberUpdateError } = await supabaseClient
        .from("members")
        .update({ total_paid: Math.max(0, totalPaid) })
        .eq("id", payment.member_id);

      if (memberUpdateError) {
        console.error("Error updating member total_paid:", memberUpdateError);
      } else {
        console.log(`Updated member ${payment.member_id} total_paid to ${totalPaid}`);

        // Trigger full balance recalculation
        try {
          console.log(`Triggering recalculate-member-totals for member ${payment.member_id}`);
          await supabaseClient.functions.invoke("recalculate-member-totals", {
            body: { memberId: payment.member_id },
          });

          // Fetch member again to check new unpaid_balance and status
          const { data: updatedMember } = await supabaseClient
            .from("members")
            .select("status, unpaid_balance")
            .eq("id", payment.member_id)
            .single();

          // If balance is cleared and member was inactive, reactivate them
          if (updatedMember?.status === "inactive" && (updatedMember.unpaid_balance ?? 0) <= 0) {
            console.log(`[Reactivation] Unlocking member ${payment.member_id}`);

            await supabaseClient
              .from("members")
              .update({ status: "active", updated_at: new Date().toISOString() })
              .eq("id", payment.member_id);

            if (payment.member?.user_id) {
              await supabaseClient.from("notifications").insert({
                organization_id: payment.organization_id,
                recipient_id: payment.member.user_id,
                member_id: payment.member_id,
                title: "Account Reactivated",
                message: "Welcome back! Your account has been reactivated since your balance is now cleared.",
                type: "success",
              });
            }
          }
        } catch (recalcError) {
          console.error("Error triggerring recalculation or unsuspension:", recalcError);
        }
      }
    }
  }

  // Log payment completion activity
  try {
    const { data: paymentUser } = await supabaseClient
      .from("payments")
      .select("created_by")
      .eq("id", paymentId)
      .single();

    if (paymentUser?.created_by) {
      const { data: userInfo } = await supabaseClient
        .from("users")
        .select("email, full_name, role, organization_id")
        .eq("id", paymentUser.created_by)
        .single();

      await supabaseClient.from("activity_logs").insert({
        user_id: paymentUser.created_by,
        user_email: userInfo?.email,
        user_name: userInfo?.full_name,
        user_role: userInfo?.role,
        organization_id: payment.organization_id,
        action: "payment.completed",
        entity_type: "payment",
        entity_id: paymentId,
        description: `Payment ${paymentId} completed via Monime webhook`,
        metadata: {
          amount: payment.amount,
          payment_method: payment.payment_method,
          reference_number: referenceNumber,
        },
      });
    }
  } catch (logError: any) {
    console.error("Error logging payment completion:", logError);
    // Don't fail payment processing if logging fails
  }

  // Update CSV reports automatically
  try {
    const paymentDate = new Date(payment.payment_date || payment.created_at || new Date());
    const { error: reportUpdateError } = await supabaseClient.functions.invoke(
      "update-reports",
      {
        body: {
          organizationId: payment.organization_id,
          paymentDate: paymentDate.toISOString(),
        },
      }
    );

    if (reportUpdateError) {
      console.error("Error updating reports:", reportUpdateError);
      // Don't fail payment processing if report update fails
    } else {
      console.log("✅ Reports updated successfully");
    }
  } catch (reportError: any) {
    console.error("Error calling update-reports function:", reportError);
    // Don't fail payment processing if report update fails
  }

  // Generate receipt with proper error handling and idempotency
  // Check if receipt already exists to prevent duplicates
  const { data: existingReceipt } = await supabaseClient
    .from("receipts")
    .select("id, receipt_number")
    .eq("payment_id", payment.id)
    .maybeSingle();

  if (existingReceipt) {
    console.log(`Receipt already exists for payment ${payment.id}: ${existingReceipt.receipt_number}`);
  } else {
    try {
      console.log("Generating receipt for payment:", payment.id);

      // Use idempotency key to prevent duplicate processing
      const idempotencyKey = `receipt-${payment.id}-${payment.updated_at || Date.now()}`;

      // Get service role key and Supabase URL for internal function calls
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabaseUrl = Deno.env.get("SUPABASE_URL");

      if (!serviceRoleKey || !supabaseUrl) {
        throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL environment variables");
      }

      // Invoke generate-receipt function using direct HTTP fetch (proper way for Edge Function to Edge Function calls)
      const functionUrl = `${supabaseUrl}/functions/v1/generate-receipt`;
      const receiptResponse = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          "apikey": serviceRoleKey,
        },
        body: JSON.stringify({
          paymentId: payment.id,
          organizationId: payment.organization_id,
          memberId: payment.member_id,
          idempotencyKey: idempotencyKey,
        }),
      });

      if (!receiptResponse.ok) {
        const errorText = await receiptResponse.text();
        console.error("Receipt generation HTTP error:", receiptResponse.status, errorText);
        console.error("Receipt generation request details:", {
          functionUrl,
          paymentId: payment.id,
          organizationId: payment.organization_id,
          memberId: payment.member_id,
        });

        // Log to database for tracking
        try {
          await supabaseClient.from("receipt_generation_logs").insert({
            payment_id: payment.id,
            organization_id: payment.organization_id,
            member_id: payment.member_id,
            status: "failed",
            error_message: `HTTP ${receiptResponse.status}: ${errorText}`,
            created_at: new Date().toISOString(),
          });
        } catch (logError) {
          console.warn("Could not log receipt generation error:", logError);
        }
      } else {
        const receiptData = await receiptResponse.json();

        if (!receiptData.success) {
          console.error("Receipt generation failed:", receiptData.error || "Unknown error");
          console.error("Receipt generation response:", JSON.stringify(receiptData, null, 2));

          // Log to database for tracking
          try {
            await supabaseClient.from("receipt_generation_logs").insert({
              payment_id: payment.id,
              organization_id: payment.organization_id,
              member_id: payment.member_id,
              status: "failed",
              error_message: receiptData.error || "Unknown error",
              created_at: new Date().toISOString(),
            });
          } catch (logError) {
            console.warn("Could not log receipt generation error:", logError);
          }
        } else {
          console.log("✅ Receipt generated successfully for payment:", payment.id);
          console.log("Receipt details:", JSON.stringify(receiptData, null, 2));

          // Log success to database for tracking
          try {
            await supabaseClient.from("receipt_generation_logs").insert({
              payment_id: payment.id,
              organization_id: payment.organization_id,
              member_id: payment.member_id,
              status: "success",
              error_message: null,
              created_at: new Date().toISOString(),
            });
          } catch (logError) {
            console.warn("Could not log receipt generation success:", logError);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error invoking generate-receipt function:", error);
      console.error("Error stack:", error.stack);
      console.error("Error details:", {
        paymentId: payment.id,
        organizationId: payment.organization_id,
        memberId: payment.member_id,
        errorMessage: error.message,
      });

      // Log to database for tracking
      try {
        await supabaseClient.from("receipt_generation_logs").insert({
          payment_id: payment.id,
          organization_id: payment.organization_id,
          member_id: payment.member_id,
          status: "failed",
          error_message: error.message,
          error_stack: error.stack,
          created_at: new Date().toISOString(),
        });
      } catch (logError) {
        console.warn("Could not log receipt generation error:", logError);
      }
      // Don't throw - receipt generation failure shouldn't fail the webhook
    }
  }

  // Send notification to member
  if (payment.member?.user_id) {
    await supabaseClient.from("notifications").insert({
      organization_id: payment.organization_id,
      recipient_id: payment.member.user_id,
      member_id: payment.member_id,
      title: "Payment Completed",
      message: `Your payment of ${payment.amount} ${data.currency === 'SLE' ? 'Le' : (data.currency || "Le")} has been completed successfully.`,
      type: "payment",
    });
  }

  // Send notification to admin about payment completion
  if (payment.organization_id) {
    // Get organization admin
    const { data: adminUser } = await supabaseClient
      .from("users")
      .select("id")
      .eq("organization_id", payment.organization_id)
      .eq("role", "org_admin")
      .single();

    if (adminUser) {
      await supabaseClient.from("notifications").insert({
        organization_id: payment.organization_id,
        recipient_id: adminUser.id,
        member_id: payment.member_id,
        title: "New Payment Received",
        message: `Payment of ${payment.amount} ${data.currency === 'SLE' ? 'Le' : (data.currency || "Le")} from ${payment.member?.full_name || "Member"} (${payment.reference_number || payment.id}) has been completed.`,
        type: "payment",
      });
    }
  }

  console.log("Payment completion webhook processed successfully for payment:", paymentId);
}

async function handlePaymentFailed(
  supabaseClient: any,
  data: MonimeWebhookEvent["data"]
) {
  const paymentId =
    data.metadata?.payment_id || data.checkout_session_id?.split("_")[0];

  if (!paymentId) {
    return;
  }

  const orConditions: string[] = [`id.eq.${paymentId}`];
  if (data.checkout_session_id) {
    orConditions.push(`monime_checkout_session_id.eq.${data.checkout_session_id}`);
  }
  if (data.id) {
    orConditions.push(`monime_payment_id.eq.${data.id}`);
  }

  const { error: deleteError } = await supabaseClient
    .from("payments")
    .delete()
    .or(orConditions.join(","));

  if (deleteError) { }
}

async function handlePaymentCancelled(
  supabaseClient: any,
  data: MonimeWebhookEvent["data"]
) {
  console.log("Processing payment cancelled webhook:");
  console.log("Full webhook data:", JSON.stringify(data, null, 2));

  // Try multiple ways to find the payment ID
  let paymentId = data.metadata?.payment_id ||
    data.metadata?.paymentId ||
    data.payment_id ||
    data.paymentId;

  // Extract checkout_session_id from various possible fields
  const checkoutSessionId = data.checkout_session_id ||
    data.checkoutSessionId ||
    data.session_id ||
    data.sessionId ||
    data.id;

  // If not in metadata, try to find by checkout_session_id
  if (!paymentId && checkoutSessionId) {
    console.log(`Looking up payment by checkout_session_id: ${checkoutSessionId}`);
    const { data: paymentBySession, error: sessionError } = await supabaseClient
      .from("payments")
      .select("id, payment_status")
      .eq("monime_checkout_session_id", checkoutSessionId)
      .maybeSingle();

    if (paymentBySession) {
      paymentId = paymentBySession.id;
      console.log(`Found payment by session ID: ${paymentId}, status: ${paymentBySession.payment_status}`);
    } else if (sessionError) {
      console.error("Error looking up payment by session:", sessionError);
    }
  }

  // Last resort: try to find by monime_payment_id
  if (!paymentId && data.id) {
    console.log(`Looking up payment by monime_payment_id: ${data.id}`);
    const { data: paymentByMonimeId } = await supabaseClient
      .from("payments")
      .select("id, payment_status")
      .eq("monime_payment_id", data.id)
      .maybeSingle();

    if (paymentByMonimeId) {
      paymentId = paymentByMonimeId.id;
      console.log(`Found payment by Monime payment ID: ${paymentId}, status: ${paymentByMonimeId.payment_status}`);
    }
  }

  if (!paymentId) {
    console.error("No payment ID found in cancelled webhook data. Data:", JSON.stringify(data, null, 2));
    return;
  }

  console.log(`Deleting cancelled payment: ${paymentId}`);

  // Build OR conditions for matching payment
  const orConditions: string[] = [`id.eq.${paymentId}`];
  if (checkoutSessionId) {
    orConditions.push(`monime_checkout_session_id.eq.${checkoutSessionId}`);
  }
  if (data.id) {
    orConditions.push(`monime_payment_id.eq.${data.id}`);
  }

  // Only delete if payment is still pending (not completed)
  // First check the payment status
  const { data: payment, error: fetchError } = await supabaseClient
    .from("payments")
    .select("id, payment_status, member_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching payment before deletion:", fetchError);
    return;
  }

  if (!payment) {
    console.log(`Payment ${paymentId} not found, may have already been deleted`);
    return;
  }

  // Only delete if payment is pending (not completed)
  if (payment.payment_status === "completed") {
    console.log(`Payment ${paymentId} is already completed, not deleting`);
    return;
  }

  // Delete related records first (foreign key constraints)
  // Delete receipt generation logs
  await supabaseClient
    .from("receipt_generation_logs")
    .delete()
    .eq("payment_id", paymentId);

  // Delete receipts
  await supabaseClient
    .from("receipts")
    .delete()
    .eq("payment_id", paymentId);

  // Finally delete the payment
  const { error: deleteError } = await supabaseClient
    .from("payments")
    .delete()
    .or(orConditions.join(","));

  if (deleteError) {
    console.error("Error deleting cancelled payment:", deleteError);
  } else {
    console.log(`Successfully deleted cancelled payment: ${paymentId}`);
  }
}

async function handlePaymentProcessing(
  supabaseClient: any,
  data: MonimeWebhookEvent["data"]
) {
  const paymentId =
    data.metadata?.payment_id || data.checkout_session_id?.split("_")[0];

  if (!paymentId) {
    console.error("No payment ID found in webhook data");
    return;
  }

  // Build OR condition for matching payment
  const orConditions: string[] = [`id.eq.${paymentId}`];
  if (data.checkout_session_id) {
    orConditions.push(`monime_checkout_session_id.eq.${data.checkout_session_id}`);
  }
  if (data.id) {
    orConditions.push(`monime_payment_id.eq.${data.id}`);
  }

  const { error: updateError } = await supabaseClient
    .from("payments")
    .update({
      monime_payment_id: data.id,
      payment_status: "processing",
      updated_at: new Date().toISOString(),
    })
    .or(orConditions.join(","));

  if (updateError) { }
}

// Verify webhook signature using HMAC-SHA256
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Monime typically uses HMAC-SHA256
    // Format may vary: check Monime documentation for exact format
    // Common formats: "sha256=hash" or "t=timestamp,v1=hash"

    // Try format: "t=timestamp,v1=hash"
    if (signature.includes("t=") && signature.includes("v1=")) {
      const parts = signature.split(",");
      const timestampPart = parts.find((p) => p.startsWith("t="));
      const sigPart = parts.find((p) => p.startsWith("v1="));

      if (!timestampPart || !sigPart) {
        return false;
      }

      const timestamp = parseInt(timestampPart.split("=")[1]);
      const receivedSig = sigPart.split("=")[1];

      // Check timestamp tolerance (5 minutes)
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > 300) {
        console.warn("Webhook timestamp expired or too far in future");
        return false;
      }

      // Compute expected signature
      const payloadToSign = `${timestamp}.${payload}`;
      const expectedSig = await computeHMAC(payloadToSign, secret);

      // Timing-safe comparison
      return timingSafeEqual(receivedSig, expectedSig);
    }

    // Try direct HMAC comparison (if signature is just the hash)
    const expectedSig = await computeHMAC(payload, secret);
    return timingSafeEqual(signature, expectedSig);
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

// Compute HMAC-SHA256
async function computeHMAC(message: string, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  const data = new TextEncoder().encode(message);

  // Use Web Crypto API for HMAC
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Timing-safe string comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

