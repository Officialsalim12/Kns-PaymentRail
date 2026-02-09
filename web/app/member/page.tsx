import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import MemberDashboard from '@/components/member/Dashboard'

export default async function MemberDashboardPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Get member record
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Only fetch data if member exists
  let payments = []
  let receipts = []
  let tabs = []

  if (member?.id) {
    // Get only completed payments (incomplete payments should not be recorded)
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('*, receipt:receipts(*)')
      .eq('member_id', member.id)
      .eq('payment_status', 'completed')
      .order('payment_date', { ascending: false })
    payments = paymentsData || []

    // Get receipts separately for dedicated receipts section
    const { data: receiptsData } = await supabase
      .from('receipts')
      .select('*, payment:payments(id, amount, payment_date, payment_method, description)')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
    receipts = receiptsData || []

    // Get member tabs
    const { data: tabsData, error: tabsError } = await supabase
      .from('member_tabs')
      .select('*')
      .eq('member_id', member.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    tabs = tabsData || []

    // Log for debugging (remove in production)
    if (tabsError) {
      console.error('Error fetching member tabs:', tabsError)
    }
  }

  // Get notifications (always available for any authenticated user)
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get unread notification count
  const { count: notificationCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  // Get user profile photo
  const profilePhotoUrl = user.profile?.profile_photo_url || null

  return (
    <MemberDashboard
      member={member}
      payments={payments}
      receipts={receipts}
      notifications={notifications || []}
      tabs={tabs}
      profilePhotoUrl={profilePhotoUrl}
      unreadNotificationCount={notificationCount || 0}
    />
  )
}

