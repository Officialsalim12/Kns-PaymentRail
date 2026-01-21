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

    const url = new URL(req.url)
    const memberId = url.searchParams.get("memberId") // Optional: recalculate specific member

    // Get all members or specific one
    let membersQuery = supabaseClient.from("members").select("id, organization_id")
    
    if (memberId) {
      membersQuery = membersQuery.eq("id", memberId)
    }

    const { data: members, error: membersError } = await membersQuery

    if (membersError) {
      throw membersError
    }

    if (!members || members.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No members found to recalculate",
          updatedCount: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    }

    let updatedCount = 0
    const updates: Array<{ memberId: string; oldTotalPaid: number; newTotalPaid: number }> = []

    // Recalculate total_paid for each member based on completed payments only
    for (const member of members) {
      // Get all completed payments for this member
      const { data: payments, error: paymentsError } = await supabaseClient
        .from("payments")
        .select("amount, payment_status")
        .eq("member_id", member.id)
        .eq("payment_status", "completed")

      if (paymentsError) {
        console.error(`Error fetching payments for member ${member.id}:`, paymentsError)
        continue
      }

      // Calculate total_paid from completed payments only
      const newTotalPaid = payments?.reduce((sum, p) => {
        const amount = typeof p.amount === "string" 
          ? parseFloat(p.amount) 
          : (p.amount || 0)
        return sum + amount
      }, 0) || 0

      // Get current total_paid for comparison
      const { data: currentMember } = await supabaseClient
        .from("members")
        .select("total_paid")
        .eq("id", member.id)
        .single()

      const oldTotalPaid = currentMember?.total_paid || 0

      // Only update if different
      if (Math.abs(oldTotalPaid - newTotalPaid) > 0.01) {
        const { error: updateError } = await supabaseClient
          .from("members")
          .update({ total_paid: Math.max(0, newTotalPaid) })
          .eq("id", member.id)

        if (updateError) {
          console.error(`Error updating member ${member.id}:`, updateError)
          continue
        }

        updatedCount++
        updates.push({
          memberId: member.id,
          oldTotalPaid,
          newTotalPaid,
        })
        console.log(`Updated member ${member.id}: ${oldTotalPaid} → ${newTotalPaid}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully recalculated total_paid for ${updatedCount} member(s)`,
        updatedCount,
        updates,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Error recalculating member totals:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to recalculate member totals",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})
