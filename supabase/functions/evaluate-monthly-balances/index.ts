// Supabase Edge Function: evaluate-monthly-balances
// Runs daily to close previous month balances, create current month balances,
// and freeze accounts with 3+ consecutive months of unpaid balances

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        )

        console.log("=== Starting Monthly Balance Evaluation ===")
        console.log(`Current time: ${new Date().toISOString()}`)

        const today = new Date()
        const currentMonthStart = startOfMonth(today)
        const previousMonthStart = startOfMonth(subMonths(today, 1))
        const previousMonthEnd = endOfMonth(subMonths(today, 1))

        // Step 1: Create current month's obligation records
        await createCurrentMonthObligations(supabaseClient, currentMonthStart)

        // Step 2: (Legacy) Close previous month's balances - disabled or can be removed
        // await closePreviousMonthBalances(...)

        // Step 3: Check for delinquent accounts (This is now largely handled by DB triggers, but we can still log)
        await checkAndLogDelinquentAccounts(supabaseClient)

        console.log("=== Monthly Balance Evaluation Complete ===")

        return new Response(
            JSON.stringify({
                success: true,
                message: "Monthly balance evaluation completed successfully",
                timestamp: new Date().toISOString(),
            }),
            {
                headers: { "Content-Type": "application/json" },
                status: 200,
            }
        )
    } catch (error: any) {
        console.error("Error in monthly balance evaluation:", error)
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

// Helper: Get start of month
function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1)
}

// Helper: Get end of month
function endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

// Helper: Subtract months
function subMonths(date: Date, months: number): Date {
    const result = new Date(date)
    result.setMonth(result.getMonth() - months)
    return result
}

// Helper: Add months
function addMonths(date: Date, months: number): Date {
    const result = new Date(date)
    result.setMonth(result.getMonth() + months)
    return result
}

async function closePreviousMonthBalances(
    supabaseClient: any,
    monthStart: Date,
    monthEnd: Date
) {
    console.log(
        `Closing balances for period: ${monthStart.toISOString()} to ${monthEnd.toISOString()}`
    )

    // Find all unsettled balances for previous month
    const { data: unsettledBalances, error: fetchError } = await supabaseClient
        .from("monthly_balances")
        .select(`
      *,
      tab:member_tabs(payment_nature, monthly_cost, tab_name)
    `)
        .eq("month_start", monthStart.toISOString().split("T")[0])
        .eq("is_settled", false)

    if (fetchError) {
        console.error("Error fetching unsettled balances:", fetchError)
        throw fetchError
    }

    if (!unsettledBalances || unsettledBalances.length === 0) {
        console.log("No unsettled balances found for previous month")
        return
    }

    console.log(`Found ${unsettledBalances.length} unsettled balances to process`)

    for (const balance of unsettledBalances) {
        // Only process compulsory payment tabs
        if (balance.tab?.payment_nature !== "compulsory") {
            console.log(`Skipping non-compulsory tab: ${balance.tab?.tab_name}`)
            continue
        }

        const unpaidAmount = balance.required_amount - balance.paid_amount

        if (unpaidAmount > 0) {
            console.log(
                `Processing unpaid balance: ${unpaidAmount} for member ${balance.member_id}`
            )

            // Mark as unsettled and record unpaid balance
            const { error: updateError } = await supabaseClient
                .from("monthly_balances")
                .update({
                    unpaid_amount: unpaidAmount,
                    is_settled: false,
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
                action: "balance_rollover",
                amount: unpaidAmount,
                previous_unpaid: 0,
                new_unpaid: unpaidAmount,
                notes: `Month closed with ${unpaidAmount} unpaid`,
            })

            // Update member's total unpaid_balance using RPC
            const { error: rpcError } = await supabaseClient.rpc(
                "increment_member_unpaid_balance",
                {
                    p_member_id: balance.member_id,
                    p_amount: unpaidAmount,
                }
            )

            if (rpcError) {
                console.error(
                    `Error incrementing member unpaid balance for ${balance.member_id}:`,
                    rpcError
                )
            }
        } else {
            // Mark as settled
            const { error: settleError } = await supabaseClient
                .from("monthly_balances")
                .update({
                    is_settled: true,
                    settled_at: new Date().toISOString(),
                    unpaid_amount: 0,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", balance.id)

            if (settleError) {
                console.error(`Error settling balance ${balance.id}:`, settleError)
            } else {
                console.log(`Balance ${balance.id} fully settled`)
            }
        }
    }

    console.log("Finished closing previous month balances")
}

async function createCurrentMonthObligations(
    supabaseClient: any,
    monthStart: Date
) {
    const period = monthStart.toISOString().slice(0, 7) // "YYYY-MM"
    const dueDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), 28) // Due at end of month

    console.log(`Creating obligations for period: ${period}`)

    // Get all active payment tabs
    const { data: tabs, error: tabsError } = await supabaseClient
        .from("member_tabs")
        .select("id, member_id, organization_id, monthly_cost, tab_name, billing_cycle")
        .eq("is_active", true)

    if (tabsError) {
        console.error("Error fetching tabs:", tabsError)
        throw tabsError
    }

    if (!tabs || tabs.length === 0) {
        console.log("No active tabs found")
        return
    }

    const obligationRecords = tabs
        // Skip one-time style tabs for recurring monthly obligations
        .filter((tab) => tab.billing_cycle !== "one_time")
        .map((tab) => ({
            organization_id: tab.organization_id,
            member_id: tab.member_id,
            tab_id: tab.id,
            period: period,
            amount_due: tab.monthly_cost,
            amount_paid: 0,
            status: 'pending',
            due_date: dueDate.toISOString().split("T")[0],
        }))

    // Insert with ON CONFLICT (idempotency)
    // Note: You might need to add a unique constraint (member_id, tab_id, period) to payment_obligations if not already there.
    const { error: insertError } = await supabaseClient
        .from("payment_obligations")
        .upsert(obligationRecords, {
            onConflict: "member_id,tab_id,period",
            ignoreDuplicates: true,
        })

    if (insertError) {
        console.error("Error creating payment obligations:", insertError)
        throw insertError
    }

    console.log(`Successfully created/verified ${obligationRecords.length} obligation records`)
}

async function checkAndLogDelinquentAccounts(supabaseClient: any) {
    console.log("Checking for delinquent accounts")
    
    // We can fetch members with status 'suspended' directly now as the trigger handles it
    const { data: suspendedMembers, error: queryError } = await supabaseClient
        .from("members")
        .select("id, full_name, status")
        .eq("status", "suspended")

    if (queryError) throw queryError

    console.log(`Found ${suspendedMembers?.length || 0} suspended members.`)
}

async function checkAndFreezeDelinquentAccounts(supabaseClient: any) {
    console.log("Checking for delinquent accounts (3+ months unpaid)")

    const threeMonthsAgo = startOfMonth(subMonths(new Date(), 3))

    // Use the database function to find delinquent members
    const { data: delinquentMembers, error: rpcError } = await supabaseClient.rpc(
        "find_delinquent_members_3_months",
        { cutoff_date: threeMonthsAgo.toISOString().split("T")[0] }
    )

    if (rpcError) {
        console.error("Error finding delinquent members:", rpcError)
        throw rpcError
    }

    if (!delinquentMembers || delinquentMembers.length === 0) {
        console.log("No delinquent members found")
        return
    }

    console.log(`Found ${delinquentMembers.length} delinquent members`)

    // Automatic freezing is disabled. We now only log delinquent members
    // so that admins can manually review and take action if needed.
    for (const member of delinquentMembers) {
        console.log(
            `[Delinquent] Member ${member.member_id} (${member.consecutive_unpaid_months} consecutive unpaid months, total_unpaid=${member.total_unpaid})`
        )

        await supabaseClient.from("balance_audit_log").insert({
            monthly_balance_id: member.latest_balance_id,
            action: "delinquent_detected",
            amount: member.total_unpaid,
            notes: `Delinquent detected: ${member.consecutive_unpaid_months} consecutive months unpaid (no automatic freeze applied)`,
            metadata: {
                member_id: member.member_id,
                total_unpaid: member.total_unpaid,
            },
        })
    }

    console.log("Finished processing delinquent accounts (logging only, no automatic freezes)")
}
