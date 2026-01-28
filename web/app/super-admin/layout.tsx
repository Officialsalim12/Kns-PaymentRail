import { requireSuperAdmin } from '@/lib/auth'
import SuperAdminSidebar from '@/components/super-admin/Sidebar'
import { createClient } from '@/lib/supabase/server'
import DashboardLayoutWrapper from '@/components/shared/DashboardLayoutWrapper'
import { ShieldAlert } from 'lucide-react'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireSuperAdmin()
  const supabase = await createClient()

  // Get user profile info
  const userFullName = user.profile?.full_name || user.email || 'Super Admin'
  const profilePhotoUrl = user.profile?.profile_photo_url || null

  // Get unread notification count (password reset requests for super admins)
  const { count: notificationCount } = await supabase
    .from('password_reset_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return (
    <DashboardLayoutWrapper
      role="super_admin"
      userFullName={userFullName}
      profilePhotoUrl={profilePhotoUrl}
      unreadNotificationCount={notificationCount || 0}
      leftHeaderContent={
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-none">
            KNS MultiRail
          </h1>
        </div>
      }
      sidebar={
        <SuperAdminSidebar
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

