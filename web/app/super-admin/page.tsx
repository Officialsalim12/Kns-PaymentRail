import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import SuperAdminDashboard from '@/components/super-admin/Dashboard'

export default async function SuperAdminDashboardPage() {
  try {
    const user = await requireSuperAdmin()
    const supabase = await createClient()

    // Get user profile info
    const userFullName = user.profile?.full_name || user.email || 'Super Admin'
    const profilePhotoUrl = user.profile?.profile_photo_url || null

    // Initialize default values
    let notificationCount = 0
    let organizations: any[] = []
    let allUsers: any[] = []

    // Get unread notification count
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)

      if (error) {
        console.error('Error fetching notification count:', error)
      } else {
        notificationCount = count || 0
      }
    } catch (error) {
      console.error('Error fetching notification count:', error)
    }

    // Get all organizations
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching organizations:', error)
      } else {
        organizations = data || []
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    }

    // Get member counts for each organization
    const organizationIds = organizations?.map(org => org.id) || []
    const memberCounts: { [key: string]: number } = {}

    if (organizationIds.length > 0) {
      try {
        const { data: memberCountsData, error } = await supabase
          .from('members')
          .select('organization_id')
          .in('organization_id', organizationIds)

        if (error) {
          console.error('Error fetching member counts:', error)
        } else {
          // Count members per organization
          memberCountsData?.forEach((member) => {
            const orgId = member.organization_id
            memberCounts[orgId] = (memberCounts[orgId] || 0) + 1
          })
        }
      } catch (error) {
        console.error('Error fetching member counts:', error)
      }
    }

    // Add member counts to organizations
    const organizationsWithCounts = organizations?.map(org => ({
      ...org,
      memberCount: memberCounts[org.id] || 0
    })) || []

    // Get platform stats - exclude super_admin users from count
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, role')
        .neq('role', 'super_admin')

      if (error) {
        console.error('Error fetching users:', error)
      } else {
        allUsers = data || []
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }

    const stats = {
      totalOrganizations: organizations?.length || 0,
      pendingApprovals: organizations?.filter(o => o.status === 'pending').length || 0,
      totalUsers: allUsers?.length || 0,
    }

    return (
      <SuperAdminDashboard
        organizations={organizationsWithCounts}
        stats={stats}
        userFullName={userFullName}
        profilePhotoUrl={profilePhotoUrl}
        unreadNotificationCount={notificationCount}
      />
    )
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error('Super admin dashboard error:', error)
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-sm text-gray-600 mb-6">
              {error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
            </p>
            <a
              href="/super-admin"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Refresh Page
            </a>
          </div>
        </div>
      </div>
    )
  }
}
