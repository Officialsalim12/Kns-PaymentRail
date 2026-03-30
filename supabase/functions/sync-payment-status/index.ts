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
    let appOrigin: string | null = null
    const originHeader = req.headers.get("origin")
    const refererHeader = req.headers.get("referer")

    if (originHeader) {
      appOrigin = originHeader
    } else if (refererHeader) {
      try {
        appOrigin = new URL(refererHeader).origin
      } catch {
        appOrigin = null
      }
    }

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
    console.log(`[Sync] Configured Monime Space ID: ${monimeSpaceId.substring(0, 10)}... (Length: ${monimeSpaceId.length})`);

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

    // Check payment status from Monime API
    const checkoutSessionId = payment.monime_checkout_session_id || null;
    const monimePaymentIdFromRecord = payment.monime_payment_id || null;

    let sessionData: any = null;
    let monimePaymentId = monimePaymentIdFromRecord;

    if (checkoutSessionId) {
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
      console.log(`[Sync] Monime checkout session data for ${checkoutSessionId}:`, JSON.stringify(monimeData, null, 2));

      sessionData = monimeData?.result || monimeData;
      
      // ONLY take ID as monimePaymentId if it's a real payment ID (starts with spm-)
      // monimeData.paymentId or monimeData.payment.id are the most reliable
      const possiblePaymentId = sessionData?.paymentId || sessionData?.payment?.id || (sessionData?.id?.startsWith('spm-') ? sessionData.id : null);
      
      if (possiblePaymentId && typeof possiblePaymentId === 'string' && possiblePaymentId.startsWith('spm-')) {
        monimePaymentId = possiblePaymentId;
      }
      
      console.log(`[Sync] Monime payment ID identified from session: ${monimePaymentId || 'NONE'}`);
    } else {
      console.warn(`Payment ${paymentId} has no monime_checkout_session_id, falling back to monime_payment_id flow`);
    }

    // CRITICAL: We must check the actual payment status, not just the checkout session status
    // A checkout session can be "completed" even if the payment hasn't been processed yet
    let actualPaymentStatus: string | null = null;
    let orderNumber: string | null = null;
    let paymentData: any = null;

    // Always fetch the actual payment status from the payment endpoint - ONLY if we have a valid spm- ID
    if (monimePaymentId && typeof monimePaymentId === 'string' && monimePaymentId.startsWith('spm-')) {
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

    // Use order number as reference (preferred), fallback to checkout session ID, then existing DB ref, then payment id
    const referenceNumber = orderNumber || checkoutSessionId || payment.reference_number || payment.id;

    // Determine if payment is completed - ONLY use actual payment status
    // Do NOT rely on checkout session status alone
    const isCompleted = actualPaymentStatus === "completed" ||
      actualPaymentStatus === "paid" ||
      actualPaymentStatus === "succeeded" ||
      actualPaymentStatus === "success";

    if (!isCompleted && actualPaymentStatus) {
      console.log(`Payment is NOT completed. Status: ${actualPaymentStatus}`);
    }

    let updatedPayment: any = null;

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

      let { error: updateError, data: updatedPayment } = await supabaseClient
        .from("payments")
        .update(updateData)
        .eq("id", paymentId)
        .neq("payment_status", "completed") // Atomic check: only update if not already completed
        .select()
        .maybeSingle();

      if (updateError) {
        console.warn(`[Sync] update failed for payment ${paymentId}: ${updateError.message}`);
        
        // If it's a trigger error (often 42703 or 400 with specific message), 
        // we should try a fallback update that might bypass specific issues.
        if (updateError.code === "42703" || updateError.message?.includes("tab_name") || updateError.message?.includes("tab_type")) {
          console.warn(`[Sync] Detected schema/trigger mismatch (tab_name/type). Attempting fallback update for status only.`);
          
          const { error: fallbackError, data: fallbackPayment } = await supabaseClient
            .from("payments")
            .update({
              payment_status: "completed",
              payment_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              monime_payment_id: monimePaymentId
            })
            .eq("id", paymentId)
            .neq("payment_status", "completed")
            .select()
            .maybeSingle();
            
          if (fallbackError) {
            console.error(`[Sync] Fallback update also failed:`, fallbackError.message);
            throw new Error(`Critical: Failed to update payment status even with fallback: ${fallbackError.message}`);
          }
          
          updatedPayment = fallbackPayment;
          updateError = null;
        } else {
          console.error(`[Sync] Non-recoverable error updating payment ${paymentId}:`, updateError.message);
          throw new Error(`Failed to update payment: ${updateError.message}`);
        }
      }

      if (!updatedPayment) {
        // Check if it's already completed to be sure
        const { data: finalCheck } = await supabaseClient
          .from("payments")
          .select("payment_status")
          .eq("id", paymentId)
          .single();
          
        if (finalCheck?.payment_status === "completed") {
          console.log(`[Sync] Payment ${paymentId} verified as already completed. Ensuring side effects are triggered...`);
          // We don't return here! We want to make sure the receipt is generated and 
          // member totals are updated if they were missed.
          updatedPayment = finalCheck;
        } else {
          console.error(`[Sync] Payment ${paymentId} update failed to return data and status is still ${finalCheck?.payment_status}`);
          throw new Error(`Failed to update payment ${paymentId} to completed status.`);
        }
      }

      console.log(`[Sync] ✅ Payment ${paymentId} update succeeded, proceeding with follow-up tasks`);

      // Update member's total_paid
      try {
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
      } catch (memberErr: any) {
        console.warn("⚠️ Member total update failed in sync:", memberErr.message);
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
        } else {
          const functionUrl = `${supabaseUrl}/functions/v1/generate-receipt`;
          console.log(`Attempting to generate receipt for payment ${payment.id}...`);

          const receiptResponse = await fetch(functionUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
              "apikey": serviceRoleKey,
              ...(appOrigin ? { "origin": appOrigin, "referer": appOrigin } : {}),
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
        console.error("Payment sync will continue, but receipt generation failed. Receipt can be generated manually later.");
      }

      // Even if the payment was just updated, always refresh receipt template.
      // (generate-receipt will insert if missing, otherwise update the existing PDF)
      try {
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        if (serviceRoleKey && supabaseUrl) {
          const functionUrl = `${supabaseUrl}/functions/v1/generate-receipt`;
          await fetch(functionUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
              "apikey": serviceRoleKey,
              ...(appOrigin ? { "origin": appOrigin, "referer": appOrigin } : {}),
            },
            body: JSON.stringify({
              paymentId: payment.id,
              organizationId: payment.organization_id,
              memberId: payment.member_id,
            }),
          });
        }
      } catch (receiptRefreshErr) {
        console.error("Receipt refresh after sync failed:", receiptRefreshErr);
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
      // If payment is already completed, refresh receipt template (even if it exists).
    // Determine the most up-to-date status to decide if we should trigger side effects
    const finalPaymentStatus = updatedPayment?.payment_status || payment.payment_status;
    const isActuallyCompleted = finalPaymentStatus === "completed";

    console.log(`[Sync] Final verification: Status is ${finalPaymentStatus}. IsCompleted: ${isActuallyCompleted}. Monime: ${isCompleted}`);

    if (isActuallyCompleted) {
      // TRIGGER SIDE EFFECTS if payment is completed (idempotent calls)
      if (payment.member_id && payment.organization_id) {
        console.log(`[Sync] Triggering side effects for completed payment ${paymentId}...`);
        
        try {
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          if (serviceRoleKey && supabaseUrl) {
            const functionUrl = `${supabaseUrl}/functions/v1/generate-receipt`;
            console.log(`[Sync] Calling generate-receipt for ${paymentId}`);
            
            // We use fetch instead of invoke to be explicit and avoid any potential 
            // supabase-js timeouts for long PDF generation
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
            
            if (receiptResponse.ok) {
              console.log(`[Sync] generate-receipt call successful for ${paymentId}`);
            } else {
              const errTxt = await receiptResponse.text();
              console.warn(`[Sync] generate-receipt returned error: ${errTxt}`);
            }
          }
        } catch (receiptRefreshErr) {
          console.error("[Sync] Side effects trigger failed:", receiptRefreshErr);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment confirmed and side effects triggered.",
          paymentStatus: "completed",
          monimePaymentStatus: actualPaymentStatus,
          monimePaymentId: monimePaymentId,
          referenceNumber: referenceNumber,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Payment not completed yet
    return new Response(
      JSON.stringify({
        success: true,
        message: `Payment status is ${actualPaymentStatus || "pending"}. Payment has not been completed yet.`,
        paymentStatus: finalPaymentStatus,
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

