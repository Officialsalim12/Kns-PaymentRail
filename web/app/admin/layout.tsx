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

  const organizationId = user.profile?.organization_id
  let organization = null
  if (organizationId) {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .maybeSingle()

    if (data) {
      organization = {
        id: data.id,
        name: data.name,
        logo_url: data.logo_url || null,
        primary_color: data.primary_color || '#0ea5e9',
        background_color: data.background_color || '#f9fafb',
        sidebar_bg_color: data.sidebar_bg_color || '#020617',
        text_color: data.text_color || '#0f172a',
      }
    }
  }

  const userFullName = user.profile?.full_name || user.email || 'Admin'
  const profilePhotoUrl = user.profile?.profile_photo_url || null

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
          organization={organization ? { name: organization.name, logo_url: organization.logo_url } : null}
          userFullName={userFullName}
          profilePhotoUrl={profilePhotoUrl}
          unreadNotificationCount={notificationCount || 0}
        />
      }
      theme={organization ? {
        primary: organization.primary_color,
        background: organization.background_color,
        sidebarBg: organization.sidebar_bg_color,
        text: organization.text_color,
      } : undefined}
    >
      {children}
    </DashboardLayoutWrapper>
  )
}

