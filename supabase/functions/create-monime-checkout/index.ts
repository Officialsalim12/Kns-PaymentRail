// Supabase Edge Function: Create Monime Checkout Session
// This function creates a Monime checkout session for a payment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MONIME_API_BASE_URL = "https://api.monime.io/v1";

interface CheckoutRequest {
  paymentId: string;
  amount: number;
  currency?: string;
  description?: string;
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

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

    // Get Monime API key from environment (support both MONIME_ACCESS_TOKEN and MONIME_API_KEY)
    const monimeApiKey = Deno.env.get("MONIME_ACCESS_TOKEN") || Deno.env.get("MONIME_API_KEY");
    if (!monimeApiKey) {
      throw new Error("MONIME_ACCESS_TOKEN or MONIME_API_KEY environment variable must be set");
    }

    // Get Monime Space ID from environment
    const monimeSpaceId = Deno.env.get("MONIME_SPACE_ID");
    if (!monimeSpaceId) {
      throw new Error("MONIME_SPACE_ID environment variable is not set. This endpoint requires a Space ID.");
    }

    // Parse request body
    const {
      paymentId,
      amount,
      currency = "SLE",
      description,
      successUrl,
      cancelUrl,
      metadata,
    }: CheckoutRequest = await req.json();

    if (!paymentId || !amount) {
      throw new Error("Missing required parameters: paymentId and amount");
    }

    let { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .select(
        `
        *,
        member:members!inner(
          id,
          full_name,
          membership_id,
          email,
          organization:organizations!inner(
            id,
            name
          )
        )
      `
      )
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      const { data: paymentData, error: simpleError } = await supabaseClient
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (simpleError || !paymentData) {
        throw new Error(`Payment not found: ${simpleError?.message || paymentError?.message}`);
      }

      const { data: memberData } = await supabaseClient
        .from("members")
        .select("id, full_name, membership_id, email, organization_id, organization:organizations(id, name)")
        .eq("id", paymentData.member_id)
        .single();

      payment = {
        ...paymentData,
        member: memberData,
      };
    }

    if (!payment) {
      throw new Error("Payment not found after retry");
    }

    if (!payment.member) {
      throw new Error("Payment member not found. Please ensure the payment is linked to a member.");
    }

    const member = payment.member;

    // Check if checkout session already exists
    if (payment.monime_checkout_session_id) {
      // Try to retrieve existing session
      try {
        const sessionResponse = await fetch(
          `${MONIME_API_BASE_URL}/checkout-sessions/${payment.monime_checkout_session_id}`,
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
          const session = await sessionResponse.json();
          return new Response(
            JSON.stringify({
              success: true,
              checkoutSession: session,
              message: "Using existing checkout session",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      } catch (error) { }
    }

    // Use the provided URLs directly (frontend sends full URLs)
    // If not provided, throw an error as we can't construct valid URLs
    if (!successUrl || !cancelUrl) {
      throw new Error("Missing required parameters: successUrl and cancelUrl must be provided");
    }

    // Prepare the request body for Monime API
    // Build a descriptive payment name from metadata and payment details
    let paymentDescription = description || payment.description || '';

    // If metadata has tab info, build a more descriptive name
    if (metadata?.tab_name) {
      const tabName = metadata.tab_name;
      const tabType = metadata.tab_type || 'payment';

      // If we have quantity info in metadata, include it
      if (metadata.months || metadata.quantity) {
        const quantity = metadata.months || metadata.quantity;
        const unitPrice = metadata.monthly_cost || metadata.unit_price;

        if (unitPrice) {
          // Format: "Monthly Dues - 3 months × Le 100.00"
          paymentDescription = `${tabName} - ${quantity} ${parseInt(quantity) === 1 ? 'month' : 'months'}${unitPrice ? ` × Le ${parseFloat(unitPrice).toFixed(2)}` : ''}`;
        } else {
          // Format: "Monthly Dues - 3 months"
          paymentDescription = `${tabName} - ${quantity} ${parseInt(quantity) === 1 ? 'month' : 'months'}`;
        }
      } else {
        // Just use tab name
        paymentDescription = tabName;
      }
    }

    // Fallback if still empty
    if (!paymentDescription) {
      paymentDescription = `Payment for ${payment.member?.full_name || "Member"}`;
    }

    // Ensure amount is a number (not string) and is valid
    const amountValue = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(amountValue) || amountValue <= 0) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    // Monime uses SLE (Sierra Leonean Leone) currency
    // Amounts must be in minor units: Le 1.00 = 100 minor units
    const finalCurrency = currency || 'SLE';
    const finalAmountMinor = Math.round(amountValue * 100); // Convert to minor units

    // Monime API requires: name (string) and lineItems (array) - camelCase
    // Does NOT allow: space_id, amount, currency, success_url, cancel_url in body
    // space_id is sent as Monime-Space-Id header (required for Space-scoped endpoints)
    // price in lineItems must be a MoneyAlias object with amount (in minor units) and currency
    // Metadata: All values must be strings, max 100 characters each

    // Convert metadata to string map (matching Monime integration guide)
    const toStringMap = (input: any): Record<string, string> => {
      const out: Record<string, string> = {};
      if (input && typeof input === 'object') {
        for (const [k, v] of Object.entries(input)) {
          if (v === undefined || v === null) continue;
          if (typeof v === 'object') continue;
          out[k] = String(v);
        }
      }
      return out;
    };

    // Enforce metadata limits (max 100 chars per value)
    const enforceMetadataLimits = (input: Record<string, string>, maxLength = 100): Record<string, string> => {
      const trimmed: Record<string, string> = {};
      for (const [key, value] of Object.entries(input)) {
        if (!value) continue;
        trimmed[key] = value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
      }
      return trimmed;
    };

    // Prepare metadata using toStringMap and enforceMetadataLimits
    const metadataInput = { ...(metadata || {}) };
    const metadataBase = {
      ...toStringMap(metadataInput),
      payment_id: String(paymentId),
      organization_id: String(payment.organization_id || ''),
      member_id: String(payment.member_id || ''),
      member_name: String(payment.member?.full_name || ''),
      ...(payment.member?.organization ? { organization_name: String(payment.member.organization.name || '') } : {}),
    };
    const safeMetadata = enforceMetadataLimits(metadataBase);

    // Build line item name with cost breakdown
    // Note: metadata values are strings (sanitized), so we need to parse them
    let lineItemName = paymentDescription;

    // If we have quantity and unit price info, add it to the line item name
    if (metadata?.months && metadata?.monthly_cost) {
      const months = metadata.months.toString();
      const monthlyCost = parseFloat(metadata.monthly_cost.toString());
      const monthsNum = parseInt(months);
      const totalCost = monthsNum * monthlyCost;

      if (!isNaN(monthlyCost) && !isNaN(monthsNum)) {
        // Format: "Monthly Dues - 3 months × Le 100.00 = Le 300.00"
        lineItemName = `${paymentDescription} - ${months} ${monthsNum === 1 ? 'month' : 'months'} × Le ${monthlyCost.toFixed(2)} = Le ${totalCost.toFixed(2)}`;
      }
    } else if (metadata?.quantity && metadata?.unit_price) {
      const quantity = metadata.quantity.toString();
      const unitPrice = parseFloat(metadata.unit_price.toString());
      const quantityNum = parseInt(quantity);
      const totalCost = quantityNum * unitPrice;

      if (!isNaN(unitPrice) && !isNaN(quantityNum)) {
        // Format: "Item Name - 2 × Le 50.00 = Le 100.00"
        lineItemName = `${paymentDescription} - ${quantity} × Le ${unitPrice.toFixed(2)} = Le ${totalCost.toFixed(2)}`;
      }
    }

    // If line item name is still just the description, add the total amount
    if (lineItemName === paymentDescription && amountValue > 0) {
      lineItemName = `${paymentDescription} - Le ${amountValue.toFixed(2)}`;
    }

    // Ensure line item name doesn't exceed reasonable length (Monime might have limits)
    if (lineItemName.length > 200) {
      lineItemName = lineItemName.substring(0, 197) + '...';
    }

    // Build line items with proper structure matching Monime integration guide
    const effectiveQuantity = metadata?.quantity
      ? parseInt(metadata.quantity.toString())
      : (metadata?.months ? parseInt(metadata.months.toString()) : 1);

    // Create payload matching Monime integration guide structure
    const monimeRequestBody: any = {
      name: paymentDescription || 'Payment',
      successUrl: successUrl,
      cancelUrl: cancelUrl,
      lineItems: [
        {
          type: 'custom',
          name: lineItemName,
          price: {
            currency: finalCurrency,
            value: finalAmountMinor
          },
          quantity: effectiveQuantity,
        },
      ],
      metadata: safeMetadata,
    };

    // Idempotency key: check headers first, then generate UUID
    // This matches the Monime integration guide pattern
    const clientIdemFromHeader = req.headers.get('Idempotency-Key') || req.headers.get('X-Idempotency-Key');
    const clientIdemFromBody = metadata?.idempotencyKey && typeof metadata.idempotencyKey === 'string' && metadata.idempotencyKey.trim()
      ? metadata.idempotencyKey.trim()
      : null;

    // Generate UUID for idempotency (Deno compatible)
    let idempotencyKey = clientIdemFromHeader || clientIdemFromBody;
    if (!idempotencyKey) {
      // Generate UUID-like string for Deno (crypto.randomUUID() might not be available)
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      idempotencyKey = `${paymentId}-${timestamp}-${random}`;
    }

    const checkoutResponse = await fetch(
      `${MONIME_API_BASE_URL}/checkout-sessions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${monimeApiKey}`,
          "Content-Type": "application/json",
          "Monime-Space-Id": monimeSpaceId,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(monimeRequestBody),
      }
    );

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      let errorMessage = checkoutResponse.statusText || "Unknown error";

      try {
        const errorJson = JSON.parse(errorText);
        // Try multiple ways to extract the error message
        if (typeof errorJson === 'string') {
          errorMessage = errorJson;
        } else if (errorJson.message) {
          errorMessage = typeof errorJson.message === 'string' ? errorJson.message : JSON.stringify(errorJson.message);
        } else if (errorJson.error) {
          if (typeof errorJson.error === 'string') {
            errorMessage = errorJson.error;
          } else if (errorJson.error.message) {
            errorMessage = errorJson.error.message;
          } else {
            errorMessage = JSON.stringify(errorJson.error);
          }
        } else if (errorJson.detail) {
          errorMessage = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        } else if (errorJson.errors && Array.isArray(errorJson.errors)) {
          // Handle validation errors array
          errorMessage = errorJson.errors.map((e: any) =>
            typeof e === 'string' ? e : (e.message || JSON.stringify(e))
          ).join(', ');
        } else {
          // If we can't find a message, stringify the whole object
          errorMessage = JSON.stringify(errorJson);
        }
      } catch {
        // If not JSON, use the text as error message
        errorMessage = errorText || errorMessage;
      }

      // Log full error details for debugging
      let errorDetails = null;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }

      // Extract detailed error information
      let detailedError = errorMessage;

      // Check for permission errors
      const errorTextLower = errorText.toLowerCase();
      const errorMessageLower = errorMessage.toLowerCase();
      const isPermissionError =
        errorTextLower.includes('permission') ||
        errorTextLower.includes('checkout.checkout_sessions:create') ||
        errorTextLower.includes('checkout_sessions:create') ||
        errorMessageLower.includes('permission') ||
        errorMessageLower.includes('checkout.checkout_sessions:create') ||
        errorMessageLower.includes('checkout_sessions:create') ||
        checkoutResponse.status === 403;

      if (isPermissionError) {
        detailedError = `Permission denied: The Monime API key requires the 'checkout.checkout_sessions:create' permission. Please verify your API key has this permission enabled in your Monime dashboard. Original error: ${errorMessage}`;
      } else if (errorDetails && typeof errorDetails === 'object') {
        // Try to extract validation errors
        if (errorDetails.details && Array.isArray(errorDetails.details)) {
          const validationErrors = errorDetails.details.map((d: any) => {
            if (typeof d === 'string') return d;
            if (d.field) return `${d.field}: ${d.message || d.error || JSON.stringify(d)}`;
            return JSON.stringify(d);
          }).join('; ');
          if (validationErrors) {
            detailedError = `${errorMessage} (Details: ${validationErrors})`;
          }
        } else if (errorDetails.errors && Array.isArray(errorDetails.errors)) {
          const validationErrors = errorDetails.errors.map((e: any) => {
            if (typeof e === 'string') return e;
            if (e.field) return `${e.field}: ${e.message || e.error || JSON.stringify(e)}`;
            return JSON.stringify(e);
          }).join('; ');
          if (validationErrors) {
            detailedError = `${errorMessage} (Details: ${validationErrors})`;
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: detailedError,
          monimeError: {
            status: checkoutResponse.status,
            statusText: checkoutResponse.statusText,
            errorDetails: errorDetails,
            errorBody: errorText,
            requestBody: monimeRequestBody, // Include request for debugging
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const data = await checkoutResponse.json();

    // Extract redirectUrl and sessionId from response
    // Response structure: { result: { redirectUrl: string, id: string } }
    const redirectUrl = data?.result?.redirectUrl || data?.redirectUrl || data?.url || data?.checkout_url || data?.checkoutUrl;
    const sessionId = data?.result?.id || data?.id || data?.sessionId;

    // Extract order number from various possible locations in the response
    // Monime may return order number in result.orderNumber, result.order_number, or nested in order object
    let orderNumber = data?.result?.orderNumber ||
      data?.result?.order_number ||
      data?.result?.order?.number ||
      data?.result?.order?.id ||
      data?.orderNumber ||
      data?.order_number ||
      data?.order?.number ||
      data?.order?.id ||
      data?.result?.orderId ||
      data?.orderId ||
      null;

    console.log("Monime checkout response:", JSON.stringify(data, null, 2));
    console.log("Extracted order number:", orderNumber);
    console.log("Extracted session ID:", sessionId);

    if (!redirectUrl) {
      throw new Error("Invalid response from payment provider: No redirectUrl in response");
    }

    // Use order number as reference (preferred), fallback to session ID
    const referenceNumber = orderNumber || sessionId;
    console.log("Using reference number:", referenceNumber);

    // Update payment with checkout session ID and set reference_number to match Monime order
    if (sessionId) {
      const updatePayload: any = {
        monime_checkout_session_id: sessionId,
        payment_status: "pending",
      };

      // Always set reference_number to match Monime order number or checkout session ID
      if (referenceNumber) {
        updatePayload.reference_number = referenceNumber;
        console.log(`Setting reference_number to: ${referenceNumber} for payment: ${paymentId}`);
      } else {
        console.warn(`No reference number available for payment: ${paymentId}, sessionId: ${sessionId}`);
      }

      const { error: updateError, data: updatedPayment } = await supabaseClient
        .from("payments")
        .update(updatePayload)
        .eq("id", paymentId)
        .select("reference_number, monime_checkout_session_id")
        .single();

      if (updateError) {
        console.error("Error updating payment with checkout session ID:", updateError);
        throw new Error(`Failed to update payment: ${updateError.message}`);
      } else {
        console.log(`Payment ${paymentId} updated successfully:`, {
          reference_number: updatedPayment?.reference_number,
          monime_checkout_session_id: updatedPayment?.monime_checkout_session_id,
        });
      }
    } else {
      console.error("No sessionId received from Monime for payment:", paymentId);
      throw new Error("No checkout session ID received from Monime");
    }

    // Return response matching both Monime guide format and frontend expectations
    const responseData = {
      success: true,
      redirectUrl, // Monime guide format
      sessionId, // Monime guide format
      idempotencyKey, // Monime guide format
      checkoutSession: { // Frontend expected format
        id: sessionId,
        url: redirectUrl,
      },
    };

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

