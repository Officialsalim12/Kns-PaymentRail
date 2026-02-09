import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import MemberPaymentsList from '@/components/member/MemberPaymentsList'

export default async function MemberPaymentsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Get member record
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Get all active payment tabs for this member
  const { data: tabs } = await supabase
    .from('member_tabs')
    .select('*')
    .eq('member_id', member?.id || '')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return <MemberPaymentsList member={member} tabs={tabs || []} />
}
