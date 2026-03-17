import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = new Date()
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(now.getMonth() - 3)

    // Only check members who aren't already inactive
    const { data: members, error: queryError } = await supabase
      .from('members')
      .select('id, full_name, user_id, email, phone_number, status, organization_id, activated_at, unpaid_balance')
      .not('status', 'in', '("suspended","inactive")')

    if (queryError) throw queryError

    if (!members?.length) {
      return new Response(JSON.stringify({ message: 'No members to check', checked: 0, flagged: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const results = []

    for (const member of members) {
      const { data: lastPayment } = await supabase
        .from('payments')
        .select('created_at')
        .eq('member_id', member.id)
        .eq('payment_status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let shouldSuspend = false
      let reason = ""

      if (lastPayment) {
        const lastPaymentDate = new Date(lastPayment.created_at)
        if (lastPaymentDate < threeMonthsAgo) {
          shouldSuspend = true
          reason = `No payment since ${lastPaymentDate.toLocaleDateString()}`
        }
      } else {
        // Fallback: check the oldest active payment tab
        const { data: oldestTab } = await supabase
          .from('member_tabs')
          .select('created_at')
          .eq('member_id', member.id)
          .eq('is_active', true)
          .eq('tab_type', 'payment')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        const referenceDate = oldestTab ? new Date(oldestTab.created_at) : (member.activated_at ? new Date(member.activated_at) : null)

        if (referenceDate && referenceDate < threeMonthsAgo) {
          shouldSuspend = true
          reason = oldestTab
            ? `No payment since first tab created on ${referenceDate.toLocaleDateString()}`
            : `No payment since activation on ${referenceDate.toLocaleDateString()}`
        }
      }

      if (shouldSuspend) {
        // Do NOT automatically change member status anymore.
        // Just flag the member so admins can manually review and decide.
        results.push({
          id: member.id,
          name: member.full_name,
          reason,
          unpaid_balance: member.unpaid_balance || 0,
          current_status: member.status,
        })
      }
    }

    return new Response(JSON.stringify({
      message: 'Suspension check completed (members flagged only; no automatic status changes)',
      checked: members.length,
      flagged: results.length,
      flaggedMembers: results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    console.error("[check-member-suspensions] Fatal error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
