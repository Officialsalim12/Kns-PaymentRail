import { requireOrgAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import MessagesManagement from '@/components/admin/MessagesManagement'

export default async function MessagesPage() {
  const user = await requireOrgAdmin()
  const supabase = await createClient()

  const organizationId = user.profile?.organization_id

  // Get all members for the message form (include both active and pending for consistency)
  const { data: members } = await supabase
    .from('members')
    .select('id, full_name, membership_id, email, user_id, status')
    .eq('organization_id', organizationId)
    .in('status', ['active', 'pending'])
    .not('user_id', 'is', null)
    .order('full_name')

  // Get all messages (notifications) sent by this admin
  const { data: messages } = await supabase
    .from('notifications')
    .select('*, recipient:users(full_name, email)')
    .eq('organization_id', organizationId)
    .eq('sender_id', user.id)
    .order('created_at', { ascending: false })

  return <MessagesManagement members={members || []} messages={messages || []} />
}

