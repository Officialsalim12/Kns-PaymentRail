// Supabase Edge Function: Generate Receipt PDF
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateReceiptPDF } from "./utils/pdf.ts";
import { sendReceiptEmail } from "./utils/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONIME_API_BASE_URL = "https://api.monime.io/v1";

interface ReceiptData {
  paymentId: string;
  organizationId: string;
  memberId: string;
  idempotencyKey?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let paymentId, organizationId, memberId;

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "").trim();
    const isServiceRoleAuth = token === serviceRoleKey;

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (!isServiceRoleAuth) {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      if (authError || !user) throw new Error("Invalid authentication");
    }

    const { paymentId: pid, organizationId: oid, memberId: mid, idempotencyKey }: ReceiptData = await req.json();
    paymentId = pid; organizationId = oid; memberId = mid;

    if (!paymentId || !organizationId || !memberId) throw new Error("Missing required parameters");

    // Idempotency check 1: Check if receipt already exists
    const { data: existingReceipt } = await supabaseClient
      .from("receipts")
      .select("id, receipt_number, pdf_url")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (existingReceipt) {
      return new Response(JSON.stringify({ success: true, receipt: existingReceipt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Idempotency check 2: Distributed Lock using receipt_generation_logs
    // Try to insert a 'processing' record. If it fails (constraint violation), another process is working on it.
    // The table should have a unique constraint on payment_id.
    const { error: lockError } = await supabaseClient
      .from("receipt_generation_logs")
      .insert({
        payment_id: paymentId,
        status: "processing",
        started_at: new Date().toISOString(),
        idempotency_key: idempotencyKey
      });

    if (lockError) {
      console.log(`Receipt generation lock failed for payment ${paymentId}:`, lockError.message);

      // Check if it failed because it's already processing or completed
      const { data: logEntry } = await supabaseClient
        .from("receipt_generation_logs")
        .select("status, created_at")
        .eq("payment_id", paymentId)
        .maybeSingle();

      if (logEntry) {
        // If it was created less than 1 minute ago, assume it's still processing vs stale lock
        const lockTime = new Date(logEntry.created_at).getTime();
        const now = Date.now();
        if (now - lockTime < 60000) { // 1 minute timeout
          return new Response(JSON.stringify({
            success: true,
            message: "Receipt generation already in progress",
            processing: true
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        } else {
          // Stale lock - we could theoretically delete and retry, but for now let's just log and continue carefully
          // or fail safely. Let's try to take over the lock if it's stale? 
          // Simpler for now: just fail safe.
          console.warn(`Found stale lock for payment ${paymentId} from ${logEntry.created_at}.`);
        }
      }
    }

    // Fetch details
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .select(`*, member:members!inner(*, organization:organizations!inner(*))`)
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) throw new Error(`Payment not found: ${paymentError?.message}`);
    if (payment.payment_status !== "completed") throw new Error("Payment not completed");

    // Fetch Monime details
    let monimePaymentData = null;
    if (payment.monime_payment_id) {
      const monimeApiKey = Deno.env.get("MONIME_ACCESS_TOKEN") || Deno.env.get("MONIME_API_KEY");
      const monimeSpaceId = Deno.env.get("MONIME_SPACE_ID");
      if (monimeApiKey && monimeSpaceId) {
        const monimeResponse = await fetch(`${MONIME_API_BASE_URL}/payments/${payment.monime_payment_id}`, {
          headers: { Authorization: `Bearer ${monimeApiKey}`, "Monime-Space-Id": monimeSpaceId }
        });
        if (monimeResponse.ok) monimePaymentData = (await monimeResponse.json())?.result;
      }
    }

    // Generate PDF
    const orgPrefix = payment.member.organization.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "");
    const receiptNumber = `RCP-${orgPrefix}-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;
    const pdfContent = await generateReceiptPDF(payment, receiptNumber, monimePaymentData);

    // Upload
    const storagePath = `${organizationId}/${receiptNumber}.pdf`;
    const { error: uploadError } = await supabaseClient.storage.from("receipts").upload(storagePath, pdfContent, { contentType: "application/pdf" });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = supabaseClient.storage.from("receipts").getPublicUrl(storagePath);

    // Save record
    const { data: receipt, error: receiptError } = await supabaseClient
      .from("receipts")
      .insert({ organization_id: organizationId, payment_id: paymentId, member_id: memberId, receipt_number: receiptNumber, pdf_url: publicUrl, pdf_storage_path: storagePath })
      .select().single();

    // Release Lock (Update status to completed)
    await supabaseClient
      .from("receipt_generation_logs")
      .update({ status: "completed", completed_at: new Date().toISOString(), receipt_number: receiptNumber })
      .eq("payment_id", paymentId);

    if (receiptError) {
      await supabaseClient.storage.from("receipts").remove([storagePath]);
      throw receiptError;
    }

    // Notify & Email
    if (payment.member.user_id) {
      await supabaseClient.from("notifications").insert({
        organization_id: organizationId, recipient_id: payment.member.user_id, title: "Receipt Generated",
        message: `Your receipt ${receiptNumber} is ready.`, type: "receipt"
      });
    }

    if (payment.member.email) {
      await sendReceiptEmail(payment.member.email, payment.member.full_name, receiptNumber, publicUrl, payment, payment.member.organization.name, monimePaymentData);
    }

    return new Response(JSON.stringify({ success: true, receipt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Receipt generation error:", error);

    // Try to update lock to failed
    try {
      if (paymentId) { // Check if paymentId was extracted
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await supabaseClient
          .from("receipt_generation_logs")
          .update({ status: "failed", error: error.message })
          .eq("payment_id", paymentId);
      }
    } catch (e) {
      // Ignore error during error handling
    }

    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
