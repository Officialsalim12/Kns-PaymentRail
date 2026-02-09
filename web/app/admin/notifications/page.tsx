import { requireOrgAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import NotificationsManagement from '@/components/admin/NotificationsManagement'

export default async function NotificationsPage() {
  const user = await requireOrgAdmin()
  const supabase = await createClient()

  const organizationId = user.profile?.organization_id

  // Get all notifications for this admin (both sent and received)
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, sender:users!sender_id(full_name, email), member:members(full_name, membership_id)')
    .eq('organization_id', organizationId)
    .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  return <NotificationsManagement notifications={notifications || []} />
}

