import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get the age threshold from query params (default: 24 hours)
    const url = new URL(req.url)
    const hoursThreshold = parseInt(url.searchParams.get("hours") || "24", 10)
    const thresholdDate = new Date()
    thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold)

    console.log(`Cleaning up pending payments older than ${hoursThreshold} hours (before ${thresholdDate.toISOString()})`)

    // Find all pending payments older than the threshold
    const { data: oldPendingPayments, error: fetchError } = await supabaseClient
      .from("payments")
      .select("id, payment_status, created_at, member_id")
      .eq("payment_status", "pending")
      .lt("created_at", thresholdDate.toISOString())

    if (fetchError) {
      console.error("Error fetching pending payments:", fetchError)
      throw fetchError
    }

    if (!oldPendingPayments || oldPendingPayments.length === 0) {
      console.log("No old pending payments found to clean up")
      return new Response(
        JSON.stringify({
          success: true,
          message: "No old pending payments found",
          deletedCount: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    }

    console.log(`Found ${oldPendingPayments.length} old pending payments to delete`)

    // Delete related records first (foreign key constraints)
    const paymentIds = oldPendingPayments.map((p) => p.id)
    
    // Delete receipt generation logs
    const { error: logsError } = await supabaseClient
      .from("receipt_generation_logs")
      .delete()
      .in("payment_id", paymentIds)

    if (logsError) {
      console.warn("Error deleting receipt generation logs:", logsError)
    }

    // Delete receipts
    const { error: receiptsError } = await supabaseClient
      .from("receipts")
      .delete()
      .in("payment_id", paymentIds)

    if (receiptsError) {
      console.warn("Error deleting receipts:", receiptsError)
    }

    // Finally delete the payments
    const { error: deleteError } = await supabaseClient
      .from("payments")
      .delete()
      .in("id", paymentIds)

    if (deleteError) {
      console.error("Error deleting pending payments:", deleteError)
      throw deleteError
    }

    console.log(`Successfully deleted ${oldPendingPayments.length} old pending payments`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully deleted ${oldPendingPayments.length} old pending payments`,
        deletedCount: oldPendingPayments.length,
        thresholdHours: hoursThreshold,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Error cleaning up pending payments:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to cleanup pending payments",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})
