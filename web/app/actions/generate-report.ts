'use server'

import { requireOrgAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export interface ReportData {
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

export async function generateReport(type: 'monthly' | 'yearly' | 'all', month?: number, year?: number) {
  const user = await requireOrgAdmin()
  const supabase = await createClient()
  const organizationId = user.profile?.organization_id

  if (!organizationId) {
    throw new Error('Organization not found')
  }

  let query = supabase
    .from('payments')
    .select('id, payment_date, created_at, amount, payment_method, payment_status, reference_number, description, member:members(full_name, membership_id)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  // Apply date filters based on report type
  if (type === 'monthly' && month !== undefined && year !== undefined) {
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999)
    
    query = query
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
  } else if (type === 'yearly' && year !== undefined) {
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999)
    
    query = query
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
  }

  const { data: payments, error } = await query

  if (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`)
  }

  // Transform data for CSV
  const reportData: ReportData[] = (payments || []).map((payment: any) => ({
    id: payment.id,
    payment_date: payment.payment_date || payment.created_at,
    created_at: payment.created_at,
    member_name: payment.member?.full_name || 'N/A',
    membership_id: payment.member?.membership_id || 'N/A',
    amount: Number(payment.amount) || 0,
    payment_method: payment.payment_method || 'N/A',
    payment_status: payment.payment_status || 'pending',
    reference_number: payment.reference_number || 'N/A',
    description: payment.description || '',
  }))

  return reportData
}

export async function convertToCSV(data: ReportData[]): Promise<string> {
  if (data.length === 0) {
    return 'No data available'
  }

  // CSV Headers
  const headers = [
    'Payment ID',
    'Payment Date',
    'Created At',
    'Member Name',
    'Membership ID',
    'Amount',
    'Payment Method',
    'Payment Status',
    'Reference Number',
    'Description'
  ]

  // Convert data to CSV rows
  const rows = data.map(payment => [
    payment.id,
    payment.payment_date,
    payment.created_at,
    `"${payment.member_name.replace(/"/g, '""')}"`,
    payment.membership_id,
    payment.amount.toString(),
    payment.payment_method,
    payment.payment_status,
    payment.reference_number,
    `"${payment.description.replace(/"/g, '""')}"`
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')

  return csvContent
}
