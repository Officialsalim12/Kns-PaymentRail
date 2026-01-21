import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

interface ReportData {
  id: string
  payment_date: string
  created_at: string
  member_name: string
  membership_id: string
  amount: number
  payment_method: string
  payment_status: string
  reference_number: string
  description: string
}

function convertToCSV(data: ReportData[]): string {
  if (data.length === 0) {
    return "No data available"
  }

  const headers = [
    "Payment ID",
    "Payment Date",
    "Created At",
    "Member Name",
    "Membership ID",
    "Amount",
    "Payment Method",
    "Payment Status",
    "Reference Number",
    "Description",
  ]

  const rows = data.map((payment) => [
    payment.id,
    payment.payment_date,
    payment.created_at,
    `"${payment.member_name.replace(/"/g, '""')}"`,
    payment.membership_id,
    payment.amount.toString(),
    payment.payment_method,
    payment.payment_status,
    payment.reference_number,
    `"${payment.description.replace(/"/g, '""')}"`,
  ])

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n")

  return csvContent
}

async function generateReport(
  supabaseClient: any,
  organizationId: string,
  type: "monthly" | "yearly" | "all",
  month?: number,
  year?: number
): Promise<ReportData[]> {
  let query = supabaseClient
    .from("payments")
    .select(
      "id, payment_date, created_at, amount, payment_method, payment_status, reference_number, description, member:members(full_name, membership_id)"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })

  if (type === "monthly" && month !== undefined && year !== undefined) {
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999)

    query = query
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
  } else if (type === "yearly" && year !== undefined) {
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999)

    query = query
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
  }

  const { data: payments, error } = await query

  if (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`)
  }

  const reportData: ReportData[] = (payments || []).map((payment: any) => ({
    id: payment.id,
    payment_date: payment.payment_date || payment.created_at,
    created_at: payment.created_at,
    member_name: payment.member?.full_name || "N/A",
    membership_id: payment.member?.membership_id || "N/A",
    amount: Number(payment.amount) || 0,
    payment_method: payment.payment_method || "N/A",
    payment_status: payment.payment_status || "pending",
    reference_number: payment.reference_number || "N/A",
    description: payment.description || "",
  }))

  return reportData
}

async function generateAndStoreReport(
  supabaseClient: any,
  organizationId: string,
  type: "monthly" | "yearly" | "all",
  month?: number,
  year?: number
): Promise<void> {
  const now = new Date()
  const reportYear = year ?? now.getFullYear()
  const reportMonth = month ?? now.getMonth()

  const reportData = await generateReport(
    supabaseClient,
    organizationId,
    type,
    reportMonth,
    reportYear
  )

  if (reportData.length === 0) {
    console.log(`No data for ${type} report, skipping storage`)
    return
  }

  const csvContent = convertToCSV(reportData)

  let storagePath = `${organizationId}/all/payments-all.csv`

  if (type === "monthly") {
    const months = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ]
    const fileName = `payments-${months[reportMonth]}-${reportYear}.csv`
    storagePath = `${organizationId}/monthly/${reportYear}/${fileName}`
  } else if (type === "yearly") {
    const fileName = `payments-${reportYear}.csv`
    storagePath = `${organizationId}/yearly/${fileName}`
  }

  const { error: uploadError } = await supabaseClient.storage
    .from("reports")
    .upload(storagePath, csvContent, {
      contentType: "text/csv",
      upsert: true,
      cacheControl: "3600",
    })

  if (uploadError) {
    console.error(`Failed to upload ${type} report:`, uploadError)
    throw new Error(`Failed to upload report: ${uploadError.message}`)
  }

  console.log(`✅ Successfully updated ${type} report: ${storagePath}`)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

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

    const { organizationId, paymentDate } = await req.json()

    if (!organizationId) {
      throw new Error("organizationId is required")
    }

    const date = paymentDate ? new Date(paymentDate) : new Date()
    const year = date.getFullYear()
    const month = date.getMonth()

    console.log(
      `Updating reports for organization ${organizationId}, payment date: ${date.toISOString()}`
    )

    // Update all reports
    await generateAndStoreReport(supabaseClient, organizationId, "all")

    // Update yearly report
    await generateAndStoreReport(supabaseClient, organizationId, "yearly", undefined, year)

    // Update monthly report
    await generateAndStoreReport(supabaseClient, organizationId, "monthly", month, year)

    return new Response(
      JSON.stringify({
        success: true,
        message: "Reports updated successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error("Error updating reports:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})
