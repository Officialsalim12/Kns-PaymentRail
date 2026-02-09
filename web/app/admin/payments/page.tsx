import { requireOrgAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import PaymentManagement from '@/components/admin/PaymentManagement'

export default async function PaymentsPage() {
  await requireOrgAdmin()
  const supabase = await createClient()
  const user = await requireOrgAdmin()

  const organizationId = user.profile?.organization_id

  // Get all members for payment form (include both active and pending for consistency)
  const { data: members } = await supabase
    .from('members')
    .select('id, full_name, membership_id, status')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'pending'])
    .order('full_name')

  // Get all completed payments only (incomplete payments should not be recorded)
  const { data: payments } = await supabase
    .from('payments')
    .select('*, member:members(full_name, membership_id)')
    .eq('organization_id', organizationId)
    .eq('payment_status', 'completed')
    .order('created_at', { ascending: false })

  return <PaymentManagement members={members || []} payments={payments || []} />
}

