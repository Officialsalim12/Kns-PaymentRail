import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import SuperAdminDashboard from '@/components/super-admin/Dashboard'

export default async function SuperAdminDashboardPage() {
  const user = await requireSuperAdmin()
  const supabase = await createClient()
  
  // Get user profile info
  const userFullName = user.profile?.full_name || user.email || 'Super Admin'
  const profilePhotoUrl = user.profile?.profile_photo_url || null
  
  // Get unread notification count (password reset requests and other notifications)
  const { count: passwordResetCount } = await supabase
    .from('password_reset_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: notificationCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  const totalNotifications = (passwordResetCount || 0) + (notificationCount || 0)

  // Get all organizations
  const { data: organizations } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  // Get member counts for each organization
  const organizationIds = organizations?.map(org => org.id) || []
  const memberCounts: { [key: string]: number } = {}
  
  if (organizationIds.length > 0) {
    const { data: memberCountsData } = await supabase
      .from('members')
      .select('organization_id')
      .in('organization_id', organizationIds)

    // Count members per organization
    memberCountsData?.forEach((member) => {
      const orgId = member.organization_id
      memberCounts[orgId] = (memberCounts[orgId] || 0) + 1
    })
  }

  // Add member counts to organizations
  const organizationsWithCounts = organizations?.map(org => ({
    ...org,
    memberCount: memberCounts[org.id] || 0
  })) || []

  // Get platform stats - exclude super_admin users from count
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, role')
    .neq('role', 'super_admin')

  // Get pending password reset requests
  const { data: passwordResetRequests } = await supabase
    .from('password_reset_requests')
    .select('id')
    .eq('status', 'pending')

  const stats = {
    totalOrganizations: organizations?.length || 0,
    pendingApprovals: organizations?.filter(o => o.status === 'pending').length || 0,
    totalUsers: allUsers?.length || 0,
    pendingPasswordResets: passwordResetRequests?.length || 0,
  }

  return <SuperAdminDashboard organizations={organizationsWithCounts} stats={stats} userFullName={userFullName} profilePhotoUrl={profilePhotoUrl} unreadNotificationCount={totalNotifications} />
}

