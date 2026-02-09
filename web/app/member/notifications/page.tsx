import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import MemberNotificationsList from '@/components/member/MemberNotificationsList'

export default async function MemberNotificationsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Get all notifications for this member
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })

  return <MemberNotificationsList notifications={notifications || []} />
}
