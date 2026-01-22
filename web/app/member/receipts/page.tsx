import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ReceiptsList from '@/components/member/ReceiptsList'

export default async function ReceiptsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Get member record
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Get all receipts including storage path for downloads
  const { data: receiptsData } = await supabase
    .from('receipts')
    .select('id, receipt_number, pdf_url, pdf_storage_path, created_at, payment:payments(id, amount, payment_date, payment_method, description, reference_number)')
    .eq('member_id', member?.id || '')
    .order('created_at', { ascending: false })

  // Transform receipts to handle payment as array (Supabase returns arrays for relationships)
  const receipts = (receiptsData || []).map((receipt: any) => ({
    ...receipt,
    payment: Array.isArray(receipt.payment) && receipt.payment.length > 0 
      ? receipt.payment[0] 
      : receipt.payment
  }))

  return <ReceiptsList receipts={receipts} />
}
