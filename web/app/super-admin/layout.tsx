import { requireSuperAdmin } from '@/lib/auth'
import SuperAdminSidebar from '@/components/super-admin/Sidebar'
import { createClient } from '@/lib/supabase/server'
import DashboardLayoutWrapper from '@/components/shared/DashboardLayoutWrapper'
import Image from 'next/image'

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

  // Get unread notification count
  const { count: notificationCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  return (
    <DashboardLayoutWrapper
      role="super_admin"
      userFullName={userFullName}
      profilePhotoUrl={profilePhotoUrl}
      unreadNotificationCount={notificationCount || 0}
      leftHeaderContent={
        <div className="flex items-center gap-2">
          <div className="relative w-[300px] h-[82px]">
            <Image
              src="/fundflow-logo.png"
              alt="Fundflow"
              fill
              sizes="300px"
              className="object-contain"
              priority
            />
          </div>
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

