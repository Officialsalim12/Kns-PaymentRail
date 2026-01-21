import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import PaymentHistoryList from '@/components/member/PaymentHistoryList'

export default async function PaymentHistoryPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Get member record
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Get all completed payments only (incomplete payments should not be recorded)
  const { data: payments } = await supabase
    .from('payments')
    .select('*, receipt:receipts(receipt_number, pdf_url, pdf_storage_path)')
    .eq('member_id', member?.id || '')
    .eq('payment_status', 'completed')
    .order('payment_date', { ascending: false })
  
  // Add organization_id and member_id to each payment if not already included
  const paymentsWithIds = payments?.map(payment => ({
    ...payment,
    organization_id: payment.organization_id || member?.organization_id,
    member_id: payment.member_id || member?.id,
  })) || []

  return <PaymentHistoryList payments={paymentsWithIds} />
}
