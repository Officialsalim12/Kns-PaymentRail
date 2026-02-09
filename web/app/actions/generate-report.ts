'use server'

import { requireOrgAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { type ReportData } from '@/lib/csv'

export async function generateReport(type: 'daily' | 'monthly' | 'yearly' | 'all', day?: number, month?: number, year?: number) {
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
  if (type === 'daily' && day !== undefined && month !== undefined && year !== undefined) {
    const startDate = new Date(year, month, day, 0, 0, 0, 0)
    const endDate = new Date(year, month, day, 23, 59, 59, 999)

    query = query
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
  } else if (type === 'monthly' && month !== undefined && year !== undefined) {
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

  try {
    const { data: payments, error } = await query

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase error fetching payments:', error)
      }
      throw new Error(`Failed to fetch payments: ${error.message}`)
    }

    // Transform data for CSV
    return (payments || []).map((payment: any) => ({
      id: payment.id,
      payment_date: payment.payment_date || payment.created_at,
      created_at: payment.created_at,
      member_name: payment.member?.full_name || 'N/A',
      membership_id: payment.member?.membership_id || 'N/A',
      amount: Number(payment.amount) || 0,
      payment_type: payment.description?.toLowerCase().includes('donation') ? 'Donation' : 'Payment',
      tab_name: payment.description || 'General',
      payment_method: payment.payment_method || 'N/A',
      payment_status: payment.payment_status || 'pending',
      reference_number: payment.reference_number || 'N/A',
      description: payment.description || '',
    }))
  } catch (err: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in generateReport:', err)
    }
    // Re-throw with a clean message to avoid exposing internal details to the client
    if (err.message && !err.message.includes('Failed to fetch payments')) {
      throw new Error(`Report generation failed: ${err.message}`)
    }
    throw err
  }
}
