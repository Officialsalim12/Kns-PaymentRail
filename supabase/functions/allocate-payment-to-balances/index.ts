// Supabase Edge Function: allocate-payment-to-balances
// Allocates a payment to the oldest unpaid monthly balances first
// Called whenever a payment is completed for a compulsory tab

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface AllocationRequest {
    memberId: string
    tabId: string
    paymentAmount: number
    paymentId: string
    organizationId?: string
}

serve(async (req) => {
    try {
        const authHeader = req.headers.get("Authorization")!
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            {
                global: { headers: { Authorization: authHeader } },
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        )

        const { memberId, tabId, paymentAmount, paymentId, organizationId }: AllocationRequest =
            await req.json()

        if (!memberId || !tabId || !paymentAmount || !paymentId) {
            throw new Error("Missing required fields: memberId, tabId, paymentAmount, paymentId")
        }

        console.log(`=== Allocating Payment ===`)
        console.log(`Payment ID: ${paymentId}`)
        console.log(`Member ID: ${memberId}`)
        console.log(`Tab ID: ${tabId}`)
        console.log(`Amount: ${paymentAmount}`)

        // Check if tab is compulsory
        const { data: tab, error: tabError } = await supabaseClient
            .from("member_tabs")
            .select("payment_nature, tab_name")
            .eq("id", tabId)
            .single()

        if (tabError || !tab) {
            throw new Error(`Tab not found: ${tabError?.message}`)
        }

        if (tab.payment_nature !== "compulsory") {
            console.log(`Tab "${tab.tab_name}" is not compulsory, skipping allocation`)
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "Tab is not compulsory, no allocation needed",
                    allocated: 0,
                }),
                { headers: { "Content-Type": "application/json" }, status: 200 }
            )
        }

        // Get all unpaid obligations for this member, oldest first
        const { data: unpaidObligations, error: obligationsError } = await supabaseClient
            .from("payment_obligations")
            .select("*")
            .eq("member_id", memberId)
            // Optional: Filter by tabId if provided and desired, but FIFO usually spans across tabs
            .in("status", ["pending", "partial", "overdue"])
            .order("due_date", { ascending: true }) // OLDEST FIRST

        if (obligationsError) {
            throw new Error(`Error fetching obligations: ${obligationsError.message}`)
        }

        if (!unpaidObligations || unpaidObligations.length === 0) {
            console.log("No unpaid obligations found")
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "No unpaid obligations to allocate to",
                    allocated: 0,
                }),
                { headers: { "Content-Type": "application/json" }, status: 200 }
            )
        }

        console.log(`Found ${unpaidObligations.length} unpaid obligations`)

        let remainingPayment = paymentAmount
        let totalAllocated = 0
        const allocations: any[] = []

        for (const obs of unpaidObligations) {
            if (remainingPayment <= 0) break

            const amountOwed = obs.amount_due - obs.amount_paid
            const amountToApply = Math.min(remainingPayment, amountOwed)

            const newPaidAmount = obs.amount_paid + amountToApply
            const isNowPaid = newPaidAmount >= obs.amount_due

            console.log(`Applying ${amountToApply} to obligation ${obs.id} (period: ${obs.period})`)

            // Update obligation
            const { error: updateError } = await supabaseClient
                .from("payment_obligations")
                .update({
                    amount_paid: newPaidAmount,
                    status: isNowPaid ? 'paid' : 'partial',
                    updated_at: new Date().toISOString(),
                })
                .eq("id", obs.id)

            if (updateError) {
                console.error(`Error updating obligation ${obs.id}:`, updateError)
                continue
            }

            allocations.push({
                obligation_id: obs.id,
                period: obs.period,
                amount_applied: amountToApply,
                settled: isNowPaid,
            })

            remainingPayment -= amountToApply
            totalAllocated += amountToApply
        }

        console.log(`Total allocated: ${totalAllocated}`)
        console.log(`Remaining payment: ${remainingPayment}`)

        // Check if member should be unfrozen
        await checkAndUnfreezeMember(supabaseClient, memberId, organizationId)

        return new Response(
            JSON.stringify({
                success: true,
                message: `Payment allocated successfully`,
                total_allocated: totalAllocated,
                remaining: remainingPayment,
                allocations: allocations,
            }),
            {
                headers: { "Content-Type": "application/json" },
                status: 200,
            }
        )
    } catch (error: any) {
        console.error("Error allocating payment:", error)
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                stack: error.stack,
            }),
            {
                headers: { "Content-Type": "application/json" },
                status: 500,
            }
        )
    }
})

async function checkAndUnfreezeMember(
    supabaseClient: any,
    memberId: string,
    organizationId?: string
) {
    console.log(`Checking if member ${memberId} should be reactivated`)

    const { data: member } = await supabaseClient
        .from("members")
        .select("status, user_id, organization_id")
        .eq("id", memberId)
        .single()

    if (!member || (member.status !== "frozen" && member.status !== "suspended")) {
        console.log("Member is not frozen/suspended, no action needed")
        return
    }

    // Check if all obligations are now settled
    const { data: unpaidObligations } = await supabaseClient
        .from("payment_obligations")
        .select("id")
        .eq("member_id", memberId)
        .in("status", ["pending", "partial", "overdue"])
        .limit(1)

    if (unpaidObligations && unpaidObligations.length > 0) {
        console.log("Member still has unpaid obligations, cannot reactivate")
        return
    }

    console.log(`Unfreezing member ${memberId}`)

    // Unfreeze
    const { error: unfreezeError } = await supabaseClient
        .from("members")
        .update({
            status: "active",
            freeze_reason: null,
            frozen_at: null,
            frozen_by: null,
        })
        .eq("id", memberId)

    if (unfreezeError) {
        console.error("Error unfreezing member:", unfreezeError)
        return
    }

    // Notify user
    const { data: existingReactivationNotif } = await supabaseClient
        .from("notifications")
        .select("id")
        .eq("recipient_id", member.user_id)
        .eq("member_id", memberId)
        .eq("title", "Account Reactivated")
        .eq("type", "success")
        .gt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .maybeSingle();

    if (!existingReactivationNotif) {
        await supabaseClient.from("notifications").insert({
            organization_id: organizationId || member.organization_id,
            recipient_id: member.user_id,
            member_id: memberId,
            title: "Account Reactivated",
            message: "Welcome back! Your account has been reactivated since all outstanding balances are now settled.",
            type: "success",
        })
    } else {
        console.log(`Skipping duplicate Account Reactivated notification for member ${memberId}`)
    }

    console.log("Member successfully unfrozen")
}
