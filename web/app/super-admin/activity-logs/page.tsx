import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import ActivityLogs from '@/components/super-admin/ActivityLogs'

export default async function ActivityLogsPage() {
  await requireSuperAdmin()
  const supabase = await createClient()

  // Get activity logs with user information
  const { data: logs, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      user:users!activity_logs_user_id_fkey(
        id,
        email,
        full_name,
        role,
        organization_id
      ),
      organization:organizations!activity_logs_organization_id_fkey(
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) {
    console.error('Error fetching activity logs:', error)
  }

  // Get unique users and organizations for filters
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .order('full_name')

  const { data: allOrganizations } = await supabase
    .from('organizations')
    .select('id, name')
    .order('name')

  return (
    <ActivityLogs
      initialLogs={logs || []}
      users={allUsers || []}
      organizations={allOrganizations || []}
    />
  )
}
