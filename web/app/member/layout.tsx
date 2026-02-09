import { requireRole } from '@/lib/auth'
import MemberSidebar from '@/components/member/Sidebar'
import { createClient } from '@/lib/supabase/server'
import DashboardLayoutWrapper from '@/components/shared/DashboardLayoutWrapper'

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole(['member', 'org_admin', 'super_admin'])
  const supabase = await createClient()

  // Get member info
  const { data: member } = await supabase
    .from('members')
    .select('full_name, organization_id')
    .eq('user_id', user.id)
    .single()

  // Get organization details including logo
  const organizationId = member?.organization_id || user.profile?.organization_id
  let organization = null
  if (organizationId) {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (data) {
      organization = {
        name: data.name,
        logo_url: data.logo_url || null
      }
    }
  }

  // Get user profile info
  const userFullName = member?.full_name || user.email || 'Member'
  const profilePhotoUrl = user.profile?.profile_photo_url || null

  // Get unread notification count
  const { count: notificationCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  return (
    <DashboardLayoutWrapper
      role="member"
      userFullName={userFullName}
      profilePhotoUrl={profilePhotoUrl}
      unreadNotificationCount={notificationCount || 0}
      sidebar={
        <MemberSidebar
          organization={organization}
          userFullName={userFullName}
          profilePhotoUrl={profilePhotoUrl}
          unreadNotificationCount={notificationCount || 0}
        />
      }
    >
      {children}
    </DashboardLayoutWrapper>
  )
}

