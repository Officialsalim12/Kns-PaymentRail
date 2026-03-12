import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import SuperAdminNotificationsList from '@/components/super-admin/SuperAdminNotificationsList'

export default async function SuperAdminNotificationsPage() {
  const user = await requireSuperAdmin()
  const supabase = await createClient()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })

  return <SuperAdminNotificationsList notifications={notifications || []} />
}
