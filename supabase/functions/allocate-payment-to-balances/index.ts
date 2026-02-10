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

        // Get all unpaid balances for this member+tab, oldest first
        const { data: unpaidBalances, error: balancesError } = await supabaseClient
            .from("monthly_balances")
            .select("*")
            .eq("member_id", memberId)
            .eq("tab_id", tabId)
            .eq("is_settled", false)
            .order("month_start", { ascending: true }) // OLDEST FIRST

        if (balancesError) {
            throw new Error(`Error fetching balances: ${balancesError.message}`)
        }

        if (!unpaidBalances || unpaidBalances.length === 0) {
            console.log("No unpaid balances found")
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "No unpaid balances to allocate to",
                    allocated: 0,
                }),
                { headers: { "Content-Type": "application/json" }, status: 200 }
            )
        }

        console.log(`Found ${unpaidBalances.length} unpaid balances`)

        let remainingPayment = paymentAmount
        let totalAllocated = 0
        const allocations: any[] = []

        for (const balance of unpaidBalances) {
            if (remainingPayment <= 0) break

            const amountOwed = balance.required_amount - balance.paid_amount
            const amountToApply = Math.min(remainingPayment, amountOwed)

            const newPaidAmount = balance.paid_amount + amountToApply
            const newUnpaidAmount = Math.max(0, amountOwed - amountToApply)
            const isNowSettled = newPaidAmount >= balance.required_amount

            console.log(`Applying ${amountToApply} to balance ${balance.id} (month: ${balance.month_start})`)

            // Update balance
            const { error: updateError } = await supabaseClient
                .from("monthly_balances")
                .update({
                    paid_amount: newPaidAmount,
                    unpaid_amount: newUnpaidAmount,
                    is_settled: isNowSettled,
                    settled_at: isNowSettled ? new Date().toISOString() : null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", balance.id)

            if (updateError) {
                console.error(`Error updating balance ${balance.id}:`, updateError)
                continue
            }

            // Audit log
            await supabaseClient.from("balance_audit_log").insert({
                monthly_balance_id: balance.id,
                action: "payment_applied",
                amount: amountToApply,
                previous_unpaid: balance.unpaid_amount,
                new_unpaid: newUnpaidAmount,
                notes: `Payment ${paymentId} applied`,
                metadata: { payment_id: paymentId },
            })

            allocations.push({
                balance_id: balance.id,
                month_start: balance.month_start,
                amount_applied: amountToApply,
                settled: isNowSettled,
            })

            remainingPayment -= amountToApply
            totalAllocated += amountToApply

            // If this balance was unsettled and now settled, reduce member's unpaid_balance
            if (balance.unpaid_amount > 0 && isNowSettled) {
                const { error: decrementError } = await supabaseClient.rpc(
                    "increment_member_unpaid_balance",
                    {
                        p_member_id: memberId,
                        p_amount: -balance.unpaid_amount, // Negative to decrement
                    }
                )

                if (decrementError) {
                    console.error(`Error decrementing member unpaid balance:`, decrementError)
                }
            }
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
    console.log(`Checking if member ${memberId} should be unfrozen`)

    const { data: member } = await supabaseClient
        .from("members")
        .select("status, user_id, organization_id")
        .eq("id", memberId)
        .single()

    if (!member || member.status !== "frozen") {
        console.log("Member is not frozen, no action needed")
        return
    }

    // Check if all balances are now settled
    const { data: unpaidBalances } = await supabaseClient
        .from("monthly_balances")
        .select("id")
        .eq("member_id", memberId)
        .eq("is_settled", false)
        .limit(1)

    if (unpaidBalances && unpaidBalances.length > 0) {
        console.log("Member still has unpaid balances, cannot unfreeze")
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
    await supabaseClient.from("notifications").insert({
        organization_id: organizationId || member.organization_id,
        recipient_id: member.user_id,
        member_id: memberId,
        title: "Account Reactivated",
        message: "Welcome back! Your account has been reactivated since all outstanding balances are now settled.",
        type: "success",
    })

    console.log("Member successfully unfrozen")
}
