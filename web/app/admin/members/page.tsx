import { requireOrgAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import MembersManagement from '@/components/admin/MembersManagement'

// Ensure this page runs in Node runtime (not Edge) to support Supabase
export const runtime = 'nodejs'

export default async function MembersPage() {
  const user = await requireOrgAdmin()
  const supabase = await createClient()

  const organizationId = user.profile?.organization_id

  // Get all members
  const { data: members } = await supabase
    .from('members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  // Get all active obligations to compute balance dynamically
  const { data: obligations } = await supabase
    .from('payment_obligations')
    .select('member_id, amount_due, amount_paid')
    .eq('organization_id', organizationId)
    .in('status', ['pending', 'partial', 'overdue'])

  // Compute dynamic balance for each member
  const membersWithComputedBalance = (members || []).map((m: any) => {
    const memberObligations = (obligations || []).filter((obs: any) => obs.member_id === m.id)
    const computedBalance = memberObligations.reduce((sum: number, obs: any) => sum + (obs.amount_due - obs.amount_paid), 0)
    return { ...m, unpaid_balance: computedBalance }
  })

  return <MembersManagement members={membersWithComputedBalance} organizationId={organizationId || ''} />
}

