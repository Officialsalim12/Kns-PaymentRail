import { requireSuperAdmin } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import ActivityLogs from '@/components/super-admin/ActivityLogs'

export default async function ActivityLogsPage() {
  await requireSuperAdmin()
  const supabase = createServiceRoleClient()

  const { data: logs, error: logsError } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000)

  let initialLogs: any[] = logs || []
  if (logsError && (logsError as any).code === 'PGRST205') {
    const { data: webhookRows } = await supabase
      .from('webhook_logs')
      .select('*')
      .limit(1000)

    initialLogs = (webhookRows || []).map((row: any) => {
      const payload = row?.payload || {}
      const body = payload?.body
      const createdAt =
        payload?.timestamp || row?.created_at || row?.timestamp || new Date().toISOString()

      const description =
        typeof body === 'string'
          ? body.slice(0, 500)
          : body
            ? JSON.stringify(body).slice(0, 500)
            : `Webhook received (${row?.event_type || 'webhook'})`

      return {
        id: String(row?.id ?? `${row?.event_type || 'webhook'}-${createdAt}`),
        user_id: 'webhook',
        user_name: 'Webhook',
        organization_id: null,
        action: String(row?.event_type || 'webhook'),
        entity_type: null,
        entity_id: null,
        description,
        metadata: null,
        ip_address: payload?.ip ?? null,
        user_agent: null,
        created_at: createdAt,
        user: null,
        organization: null,
      }
    })
  } else if (logsError) {
    console.error('Error fetching activity logs:', logsError)
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
      initialLogs={initialLogs}
      users={allUsers || []}
      organizations={allOrganizations || []}
    />
  )
}
