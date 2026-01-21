import { requireAuth } from '@/lib/auth'
import { getCurrentUser } from '@/lib/auth'

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    await requireAuth()
    const user = await getCurrentUser()

    // Determine which layout to use based on role
    const role = user?.profile?.role

    if (role === 'super_admin') {
      const SuperAdminLayout = (await import('../super-admin/layout')).default
      return <SuperAdminLayout>{children}</SuperAdminLayout>
    } else if (role === 'org_admin') {
      const AdminLayout = (await import('../admin/layout')).default
      return <AdminLayout>{children}</AdminLayout>
    } else if (role === 'member') {
      const MemberLayout = (await import('../member/layout')).default
      return <MemberLayout>{children}</MemberLayout>
    } else {
      // Fallback: render children without specific layout if role is unknown
      return <>{children}</>
    }
  } catch (error) {
    // If there's an error, just render children without layout
    return <>{children}</>
  }
}

