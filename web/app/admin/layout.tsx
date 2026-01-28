import { requireOrgAdmin } from '@/lib/auth'
import AdminSidebar from '@/components/admin/Sidebar'
import { createClient } from '@/lib/supabase/server'
import DashboardLayoutWrapper from '@/components/shared/DashboardLayoutWrapper'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireOrgAdmin()
  const supabase = await createClient()

  // Get organization details including logo
  const organizationId = user.profile?.organization_id
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
  const userFullName = user.profile?.full_name || user.email || 'Admin'
  const profilePhotoUrl = user.profile?.profile_photo_url || null

  // Get unread notification count
  const { count: notificationCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  return (
    <DashboardLayoutWrapper
      role="admin"
      userFullName={userFullName}
      profilePhotoUrl={profilePhotoUrl}
      unreadNotificationCount={notificationCount || 0}
      sidebar={
        <AdminSidebar
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

