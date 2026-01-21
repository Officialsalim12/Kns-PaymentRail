import { requireOrgAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ApprovalsManagement from '@/components/admin/ApprovalsManagement'

export default async function ApprovalsPage() {
  const user = await requireOrgAdmin()
  const supabase = await createClient()

  const organizationId = user.profile?.organization_id

  // Get pending member approvals
  const { data: pendingMembers } = await supabase
    .from('members')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Get approved members
  const { data: approvedMembers } = await supabase
    .from('members')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // Get pending organization requests (if organization is pending)
  const { data: orgRequest } = await supabase
    .from('organizations')
    .select('id, name, status')
    .eq('id', organizationId)
    .single()

  // Get pending admin requests (password reset requests for this organization's admin)
  const { data: passwordResetRequests } = await supabase
    .from('password_reset_requests')
    .select('*')
    .eq('user_email', user.email)
    .eq('status', 'pending')

  const pendingApprovals = {
    members: pendingMembers || [],
    organization: orgRequest?.status === 'pending' ? [orgRequest] : [],
    adminRequests: passwordResetRequests || [],
  }

  return (
    <ApprovalsManagement
      pendingApprovals={pendingApprovals}
      approvedMembers={approvedMembers || []}
      organizationId={organizationId || ''}
    />
  )
}
