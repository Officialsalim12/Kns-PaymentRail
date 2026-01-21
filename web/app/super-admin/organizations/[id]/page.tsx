import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrganizationDetail from '@/components/super-admin/OrganizationDetail'

export default async function OrganizationDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await requireSuperAdmin()
  const supabase = await createClient()

  // Get organization details
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!organization) {
    notFound()
  }

  // Get all members of this organization
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('*, user:users(id, email, full_name, phone_number, created_at)')
    .eq('organization_id', params.id)
    .order('created_at', { ascending: false })

  // Log error if any (for debugging)
  if (membersError) {
    console.error('Error fetching members:', membersError)
  }

  // Get only completed payments for this organization (incomplete payments should not be recorded)
  const { data: payments } = await supabase
    .from('payments')
    .select('*, member:members(full_name, membership_id)')
    .eq('organization_id', params.id)
    .eq('payment_status', 'completed')
    .order('created_at', { ascending: false })

  // Get all users (credentials) for this organization
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('organization_id', params.id)
    .order('created_at', { ascending: false })

  // Get activity logs (we'll use notifications and payments as logs)
  const { data: logs } = await supabase
    .from('notifications')
    .select('*, sender:users(full_name, email), recipient:users(full_name, email)')
    .eq('organization_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <OrganizationDetail
      organization={organization}
      members={members || []}
      payments={payments || []}
      users={users || []}
      logs={logs || []}
    />
  )
}
