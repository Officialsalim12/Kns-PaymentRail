import { requireOrgAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import AdminDashboard from '@/components/admin/Dashboard'
import { getDisplayAmount } from '@/lib/utils/payment-display'

export default async function AdminDashboardPage() {
  const user = await requireOrgAdmin()
  const supabase = await createClient()

  const organizationId = user.profile?.organization_id

  // Get user profile info
  const userFullName = user.profile?.full_name || user.email || 'Admin'
  const profilePhotoUrl = user.profile?.profile_photo_url || null

  // Get unread notification count
  const { count: notificationCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  // Get organization details including logo
  const { data: orgData } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single()

  const organization = orgData ? {
    id: orgData.id,
    name: orgData.name,
    logo_url: orgData.logo_url || null
  } : null

  // Get organization stats
  const { data: members } = await supabase
    .from('members')
    .select('id, status, unpaid_balance')
    .eq('organization_id', organizationId)

  // Get all payments for status distribution and chart
  const { data: allPayments } = await supabase
    .from('payments')
    .select('amount, created_at, payment_status')
    .eq('organization_id', organizationId)

  // Filter for completed payments for revenue calculations
  const payments = allPayments?.filter(p => p.payment_status === 'completed') || []

  // Calculate payment status distribution
  const paymentStatusDistribution = {
    completed: allPayments?.filter(p => p.payment_status === 'completed').length || 0,
    pending: allPayments?.filter(p => p.payment_status === 'pending' || p.payment_status === 'processing').length || 0,
    failed: allPayments?.filter(p => p.payment_status === 'failed' || p.payment_status === 'cancelled').length || 0,
    total: allPayments?.length || 0
  }

  const activeMembers = members?.filter(m => m.status === 'active').length || 0

  // Get set of member IDs who have made at least one successful payment
  const { data: paymentRecords } = await supabase
    .from('payments')
    .select('member_id')
    .eq('organization_id', organizationId)
    .eq('payment_status', 'completed')

  const paidMemberIds = new Set(paymentRecords?.map(p => p.member_id) || [])

  // Calculate paid vs unpaid members
  // A member is "Paid" only if they have made at least one payment AND have no balance
  const paidMembers = members?.filter(m => {
    const hasMadePayment = paidMemberIds.has(m.id)
    const balance = m.unpaid_balance || 0
    return hasMadePayment && (balance === 0 || balance === null)
  }).length || 0

  const unpaidMembers = members?.filter(m => {
    const balance = m.unpaid_balance || 0
    return balance > 0
  }).length || 0

  // Calculate totals using display amounts (97% for completed payments)
  const totalPayments = payments.reduce((sum, p) => sum + getDisplayAmount(p.amount, p.payment_status || 'completed'), 0)

  // Calculate monthly revenue (current month) - using native Date methods
  const now = new Date()
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyPayments = payments.filter(p => {
    const paymentDate = new Date(p.created_at)
    return paymentDate >= startOfCurrentMonth
  })
  const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + getDisplayAmount(p.amount, p.payment_status || 'completed'), 0)

  // Calculate last month revenue for comparison
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = startOfCurrentMonth
  const lastMonthPayments = payments.filter(p => {
    const date = new Date(p.created_at)
    return date >= startOfLastMonth && date < endOfLastMonth
  })
  const lastMonthRevenue = lastMonthPayments.reduce((sum, p) => sum + getDisplayAmount(p.amount, p.payment_status || 'completed'), 0)

  // Calculate average payment
  const averagePayment = payments.length > 0
    ? totalPayments / payments.length
    : 0

  // Get payments for last 7 days for chart
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)
  const recentPaymentsData = payments.filter(p => {
    const paymentDate = new Date(p.created_at)
    return paymentDate >= sevenDaysAgo
  })

  // Get recent completed payments only (payment record)
  const { data: recentPayments } = await supabase
    .from('payments')
    .select('*, member:members(full_name, membership_id)')
    .eq('organization_id', organizationId)
    .eq('payment_status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10)

  // Get pending member approvals
  const { data: pendingMembers } = await supabase
    .from('members')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .limit(10)

  // Get pending organization requests (if organization is pending)
  const { data: orgRequest } = await supabase
    .from('organizations')
    .select('id, name, status')
    .eq('id', organizationId)
    .single()

  // Get pending admin requests (password reset requests for this organization's admin)
  const { data: passwordResetRequests } = await supabase
    .from('password_reset_requests')
    .select('*')
    .eq('user_email', user.email)
    .eq('status', 'pending')

  // Get recent activity (payments, member approvals, etc.)
  const { data: recentActivity } = await supabase
    .from('payments')
    .select('*, member:members(full_name, membership_id)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(5)

  const pendingApprovalsList = [
    ...(pendingMembers || []),
    ...(orgRequest?.status === 'pending' ? [orgRequest] : []),
    ...(passwordResetRequests || [])
  ]

  const revenueChange = lastMonthRevenue > 0
    ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0

  const memberGrowth = members && members.length > 0
    ? (activeMembers / members.length) * 100
    : 0

  return (
    <AdminDashboard
      organization={organization || null}
      stats={{
        totalMembers: members?.length || 0,
        activeMembers,
        totalPayments,
        monthlyRevenue,
        averagePayment,
        totalTransactions: payments.length,
        paidMembers,
        unpaidMembers,
      }}
      recentPayments={recentPayments || []}
      pendingApprovals={pendingApprovalsList}
      revenueHistory={allPayments || []} // Pass all payments for transaction count
      memberGrowth={memberGrowth}
      revenueChange={revenueChange}
      paymentStatusDistribution={paymentStatusDistribution}
    />
  )
}

