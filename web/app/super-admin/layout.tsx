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
      mainOffsetClassName="lg:ml-80"
      leftHeaderContent={
        <div className="flex min-w-0 items-center">
          <div className="relative h-[86px] w-[235px] max-w-[72vw] max-h-[18vh] shrink-0 sm:h-[96px] sm:w-[265px] md:h-[102px] md:w-[310px] lg:h-[110px] lg:w-[380px] xl:h-[122px] xl:w-[440px]">
            <Image
              src="/fundflow-logo.png"
              alt="Fundflow"
              fill
              sizes="(max-width: 640px) 240px, (max-width: 1024px) 320px, 440px"
              className="object-contain object-left"
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

