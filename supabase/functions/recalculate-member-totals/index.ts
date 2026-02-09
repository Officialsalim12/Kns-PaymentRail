import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const url = new URL(req.url)
    const memberId = url.searchParams.get("memberId")

    let query = supabase.from("members").select("id, full_name, activated_at, total_paid")
    if (memberId) query = query.eq("id", memberId)

    const { data: members, error: membersError } = await query
    if (membersError) throw membersError

    if (!members?.length) {
      return new Response(JSON.stringify({ success: true, message: "No members found", updatedCount: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      })
    }

    let updatedCount = 0
    const results = []
    const now = new Date()

    for (const member of members) {
      // 1. Calculate actual paid amount
      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("member_id", member.id)
        .eq("payment_status", "completed")

      const totalPaid = payments?.reduce((sum, p) => {
        const amount = typeof p.amount === "string" ? parseFloat(p.amount) : (p.amount || 0)
        return sum + amount
      }, 0) || 0

      // 2. Sum up expected totals from all active payment tabs
      let expectedTotal = 0
      const { data: tabs } = await supabase
        .from("member_tabs")
        .select("monthly_cost, billing_cycle, created_at")
        .eq("member_id", member.id)
        .eq("is_active", true)
        .eq("tab_type", "payment")

      if (tabs) {
        for (const tab of tabs) {
          const cost = tab.monthly_cost || 0
          const cycle = tab.billing_cycle || 'monthly'
          const diffMs = now.getTime() - new Date(tab.created_at).getTime()

          if (diffMs < 0) continue

          const msPerPeriod = cycle === 'weekly'
            ? 1000 * 60 * 60 * 24 * 7
            : 1000 * 60 * 60 * 24 * 30.4375

          const periods = Math.floor(diffMs / msPerPeriod) + 1
          expectedTotal += (periods * cost)
        }
      }

      const unpaidBalance = Math.max(0, expectedTotal - totalPaid)

      const { error: updateError } = await supabase
        .from("members")
        .update({
          total_paid: Math.max(0, totalPaid),
          unpaid_balance: unpaidBalance,
          updated_at: now.toISOString()
        })
        .eq("id", member.id)

      if (updateError) {
        console.error(`[recalculate-member-totals] Update failed for ${member.id}:`, updateError)
        continue
      }

      updatedCount++
      results.push({ id: member.id, name: member.full_name, totalPaid, expectedTotal, unpaidBalance })
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Recalculated ${updatedCount} member(s)`,
      updatedCount,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })

  } catch (error) {
    console.error("[recalculate-member-totals] Fatal error:", error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
