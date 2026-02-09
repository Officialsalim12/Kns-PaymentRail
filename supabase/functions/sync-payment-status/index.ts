// Supabase Edge Function: Sync Payment Status from Monime
// This function manually checks payment status from Monime API and updates the database
// Useful as a fallback when webhooks are not working

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MONIME_API_BASE_URL = "https://api.monime.io/v1";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
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

    // Get Monime API key
    const monimeApiKey = Deno.env.get("MONIME_ACCESS_TOKEN") || Deno.env.get("MONIME_API_KEY");
    if (!monimeApiKey) {
      throw new Error("MONIME_ACCESS_TOKEN or MONIME_API_KEY not configured");
    }

    const monimeSpaceId = Deno.env.get("MONIME_SPACE_ID");
    if (!monimeSpaceId) {
      throw new Error("MONIME_SPACE_ID not configured");
    }

    // Parse request body
    const { paymentId } = await req.json();

    if (!paymentId) {
      throw new Error("Missing paymentId parameter");
    }

    console.log(`Syncing payment status for payment: ${paymentId}`);

    // Fetch payment from database
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .select("*, member:members(user_id, organization_id)")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error(`Payment not found: ${paymentError?.message}`);
    }

    if (!payment.monime_checkout_session_id) {
      throw new Error("Payment does not have a Monime checkout session ID");
    }

    // Check payment status from Monime API
    const checkoutSessionId = payment.monime_checkout_session_id;

    console.log(`Checking Monime checkout session: ${checkoutSessionId}`);

    const monimeResponse = await fetch(
      `${MONIME_API_BASE_URL}/checkout-sessions/${checkoutSessionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${monimeApiKey}`,
          "Content-Type": "application/json",
          "Monime-Space-Id": monimeSpaceId,
        },
      }
    );

    if (!monimeResponse.ok) {
      const errorText = await monimeResponse.text();
      throw new Error(`Monime API error: ${monimeResponse.status} - ${errorText}`);
    }

    const monimeData = await monimeResponse.json();
    console.log("Monime API response:", JSON.stringify(monimeData, null, 2));

    // Extract status and IDs from Monime response
    const sessionData = monimeData?.result || monimeData;
    const monimePaymentId = sessionData?.paymentId || sessionData?.payment?.id || sessionData?.id;

    // CRITICAL: We must check the actual payment status, not just the checkout session status
    // A checkout session can be "completed" even if the payment hasn't been processed yet
    let actualPaymentStatus: string | null = null;
    let orderNumber: string | null = null;
    let paymentData: any = null;

    // Always fetch the actual payment status from the payment endpoint
    if (monimePaymentId) {
      try {
        console.log(`Fetching actual payment status from Monime payment endpoint: ${monimePaymentId}`);
        const paymentResponse = await fetch(
          `${MONIME_API_BASE_URL}/payments/${monimePaymentId}`,
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
          const paymentResponseData = await paymentResponse.json();
          paymentData = paymentResponseData?.result || paymentResponseData;

          // Get the actual payment status - this is the authoritative source
          actualPaymentStatus = paymentData?.status ||
            paymentData?.payment_status ||
            paymentData?.paymentStatus ||
            null;

          // Get order number from payment
          orderNumber = paymentData?.order_number ||
            paymentData?.orderNumber ||
            paymentData?.order_id ||
            paymentData?.orderId ||
            paymentData?.order?.number ||
            paymentData?.order?.id ||
            null;

          console.log(`Actual payment status from Monime: ${actualPaymentStatus}`);
        } else {
          const errorText = await paymentResponse.text();
          console.warn(`Failed to fetch payment from Monime API: ${paymentResponse.status} - ${errorText}`);
        }
      } catch (error) {
        console.warn("Could not fetch payment details from Monime API:", error);
      }
    }

    // If we couldn't get payment data, check if there's payment info in the session data
    if (!actualPaymentStatus && sessionData?.payment) {
      actualPaymentStatus = sessionData.payment.status ||
        sessionData.payment.payment_status ||
        sessionData.payment.paymentStatus ||
        null;
      console.log(`Using payment status from session data: ${actualPaymentStatus}`);
    }

    // If still no payment status, check the session status as a last resort
    // But note: session status is NOT reliable for determining payment completion
    if (!actualPaymentStatus) {
      const sessionStatus = sessionData?.status || sessionData?.paymentStatus;
      console.warn(`No payment status found, using session status as fallback: ${sessionStatus}`);
      console.warn(`WARNING: Session status may not accurately reflect payment completion. Payment ID: ${monimePaymentId || 'N/A'}`);
      actualPaymentStatus = sessionStatus;
    }

    // Try to get order number from session if not found in payment
    if (!orderNumber) {
      orderNumber = sessionData?.order_number ||
        sessionData?.orderNumber ||
        sessionData?.order_id ||
        sessionData?.orderId ||
        sessionData?.payment?.order_number ||
        sessionData?.payment?.orderNumber ||
        null;
    }

    // Use order number as reference (preferred), fallback to checkout session ID
    const referenceNumber = orderNumber || checkoutSessionId;

    // Determine if payment is completed - ONLY use actual payment status
    // Do NOT rely on checkout session status alone
    const isCompleted = actualPaymentStatus === "completed" ||
      actualPaymentStatus === "paid" ||
      actualPaymentStatus === "succeeded";

    if (!isCompleted && actualPaymentStatus) {
      console.log(`Payment is NOT completed. Status: ${actualPaymentStatus}`);
    }

    if (isCompleted && payment.payment_status !== "completed") {
      console.log(`Payment ${paymentId} is completed, updating database...`);

      // Update payment status
      const updateData: any = {
        payment_status: "completed",
        payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reference_number: referenceNumber,
      };

      if (monimePaymentId) {
        updateData.monime_payment_id = monimePaymentId;
      }

      console.log(`[Sync] Attempting to update payment ${paymentId} to completed. Data:`, JSON.stringify(updateData, null, 2));

      const { error: updateError, data: updatedPayment } = await supabaseClient
        .from("payments")
        .update(updateData)
        .eq("id", paymentId)
        .neq("payment_status", "completed") // Atomic check: only update if not already completed
        .select()
        .maybeSingle();

      if (!updatedPayment) {
        console.log(`[Sync] Payment ${paymentId} was already completed or not found. Skipping duplicate processing.`);
        return new Response(
          JSON.stringify({
            success: true,
            message: "Payment was already completed by another process (webhook or sync).",
            paymentStatus: "completed",
            referenceNumber: referenceNumber,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      if (updateError) {
        console.error(`[Sync] ERROR updating payment ${paymentId}:`, updateError.message);
        throw new Error(`Failed to update payment: ${updateError.message}`);
      }

      console.log(`[Sync] ✅ Payment ${paymentId} updated successfully to completed`);

      // Update member's total_paid
      if (payment.member_id) {
        const { data: allPayments, error: paymentsError } = await supabaseClient
          .from("payments")
          .select("amount, payment_status")
          .eq("member_id", payment.member_id);

        if (!paymentsError && allPayments) {
          const totalPaid = allPayments
            .filter((p) => p.payment_status === "completed")
            .reduce((sum, p) => {
              const amount = typeof p.amount === "string"
                ? parseFloat(p.amount)
                : (p.amount || 0);
              return sum + amount;
            }, 0);

          await supabaseClient
            .from("members")
            .update({ total_paid: Math.max(0, totalPaid) })
            .eq("id", payment.member_id);

          console.log(`Updated member ${payment.member_id} total_paid to ${totalPaid}`);
        }
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

      // Generate receipt
      try {
        // Get service role key and Supabase URL for internal function calls
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const supabaseUrl = Deno.env.get("SUPABASE_URL");

        if (!serviceRoleKey || !supabaseUrl) {
          console.error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL environment variables - cannot generate receipt");
          // Don't throw - payment sync should still succeed even if receipt generation fails
        } else {
          // Invoke generate-receipt function using direct HTTP fetch (proper way for Edge Function to Edge Function calls)
          const functionUrl = `${supabaseUrl}/functions/v1/generate-receipt`;
          console.log(`Attempting to generate receipt for payment ${payment.id}...`);

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
            }),
          });

          if (!receiptResponse.ok) {
            const errorText = await receiptResponse.text();
            console.error(`Receipt generation HTTP error (${receiptResponse.status}):`, errorText);
            // Log to console but don't fail the payment sync
          } else {
            const receiptData = await receiptResponse.json();
            if (!receiptData.success) {
              console.error("Receipt generation failed:", receiptData.error || "Unknown error");
              console.error("Receipt generation error details:", JSON.stringify(receiptData, null, 2));
            } else {
              console.log("✅ Receipt generation triggered successfully:", receiptData.receipt?.receipt_number || "N/A");
            }
          }
        }
      } catch (error) {
        console.error("Error generating receipt:", error);
        console.error("Error stack:", error.stack);
        console.error("Payment sync will continue, but receipt generation failed. Receipt can be generated manually later.");
        // Don't throw - payment sync should still succeed even if receipt generation fails
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment status synced and updated to completed",
          paymentStatus: "completed",
          referenceNumber: referenceNumber,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Payment not completed yet
      return new Response(
        JSON.stringify({
          success: true,
          message: `Payment status is ${actualPaymentStatus || "pending"}. Payment has not been completed yet.`,
          paymentStatus: payment.payment_status,
          monimePaymentStatus: actualPaymentStatus,
          monimePaymentId: monimePaymentId,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error("Error syncing payment status:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

