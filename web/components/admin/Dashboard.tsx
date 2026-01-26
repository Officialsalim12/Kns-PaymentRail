'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  Users, 
  Wallet, 
  CheckCircle, 
  Clock, 
  Plus, 
  Building2, 
  UserCog,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Activity,
  FileText,
  AlertCircle,
  Calendar,
  BarChart3,
  Sparkles,
  User,
  Settings,
  LogOut,
  Bell
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency'
import BulkTabCreator from './BulkTabCreator'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getDisplayAmount } from '@/lib/utils/payment-display'
import { getOrganizationAbbreviation } from '@/lib/utils/organization'

interface Stats {
  totalMembers: number
  activeMembers: number
  totalPayments: number
  monthlyRevenue: number
  lastMonthRevenue: number
  averagePayment: number
  totalTransactions: number
  paidMembers: number
  unpaidMembers: number
}

interface Payment {
  id: string
  amount: number
  payment_date?: string
  created_at?: string
  reference_number: string
  payment_status?: string
  member: {
    full_name: string
    membership_id: string
  }
}

interface Member {
  id: string
  full_name: string
  membership_id: string
  email: string
  status: string
}

interface Organization {
  id: string
  name: string
  logo_url: string | null
}

interface PendingApprovals {
  members: Member[]
  organization: Array<{ id: string; name: string; status: string }>
  adminRequests: Array<{ id: string; user_name: string; user_email: string; user_phone: string; status: string }>
}

interface Props {
  organization: Organization | null
  stats: Stats
  recentPayments: Payment[]
  pendingApprovals: PendingApprovals
  recentActivity?: Payment[]
  paymentChartData?: Array<{ amount: number; created_at: string; payment_status?: string }>
  userFullName?: string
  profilePhotoUrl?: string | null
  unreadNotificationCount?: number
}

export default function AdminDashboard({ 
  organization, 
  stats: initialStats, 
  recentPayments: initialRecentPayments, 
  pendingApprovals: initialPendingApprovals,
  recentActivity: initialRecentActivity = [],
  paymentChartData: initialPaymentChartData = [],
  userFullName = 'Admin',
  profilePhotoUrl = null,
  unreadNotificationCount = 0
}: Props) {
  const router = useRouter()
  
  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }
  const [showBulkTabCreator, setShowBulkTabCreator] = useState(false)
  const [recentPayments, setRecentPayments] = useState(initialRecentPayments)
  const [pendingApprovals, setPendingApprovals] = useState(initialPendingApprovals)
  const [recentActivity, setRecentActivity] = useState(initialRecentActivity)
  const [paymentChartData, setPaymentChartData] = useState(initialPaymentChartData)
  const [stats, setStats] = useState(initialStats)
  const organizationId = organization?.id

  // Set up real-time subscriptions
  useEffect(() => {
    if (typeof window === 'undefined' || !organizationId) return

    const supabase = createClient()

    const paymentsChannel = supabase
      .channel(`admin-payments-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('Payment change detected:', payload)
          router.refresh()
        }
      )
      .subscribe()

    const membersChannel = supabase
      .channel(`admin-members-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('Member change detected:', payload)
          router.refresh()
        }
      )
      .subscribe()

    const notificationsChannel = supabase
      .channel(`admin-notifications-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('Notification change detected:', payload)
          router.refresh()
        }
      )
      .subscribe() as ReturnType<typeof supabase.channel>

    return () => {
      supabase.removeChannel(paymentsChannel)
      supabase.removeChannel(membersChannel)
      supabase.removeChannel(notificationsChannel)
    }
  }, [organizationId, router])

  const totalPendingApprovals = 
    pendingApprovals.members.length + 
    pendingApprovals.organization.length + 
    pendingApprovals.adminRequests.length

  // Calculate revenue trend
  const revenueChange = stats.lastMonthRevenue > 0
    ? ((stats.monthlyRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100
    : 0
  const isRevenueUp = revenueChange >= 0

  // Calculate member growth (simplified - comparing active vs total)
  const memberGrowthRate = stats.totalMembers > 0
    ? ((stats.activeMembers / stats.totalMembers) * 100)
    : 0

  // Admin fee breakdown based on net revenue (stats.totalPayments)
  // Net = 96% (after 1% transfer fee + 3% service charge)
  const NET_PERCENTAGE = 0.96
  const TRANSFER_FEE_PERCENTAGE = 0.01
  const SERVICE_FEE_PERCENTAGE = 0.03

  const grossTotal = stats.totalPayments > 0 ? stats.totalPayments / NET_PERCENTAGE : 0
  const transferFeeTotal = grossTotal * TRANSFER_FEE_PERCENTAGE
  const serviceChargeTotal = grossTotal * SERVICE_FEE_PERCENTAGE

  // Prepare chart data for last 7 days
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    // Create separate date objects for start and end of day to avoid mutation issues
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)
    
    // Safely filter payments for this day
    const dayPayments = (paymentChartData || []).filter(p => {
      if (!p || !p.created_at) return false
      try {
        const paymentDate = new Date(p.created_at)
        return paymentDate >= dayStart && paymentDate <= dayEnd
      } catch (e) {
        return false
      }
    })
    
    const dayTotal = dayPayments.reduce((sum, p) => {
      try {
        return sum + getDisplayAmount(p.amount || 0, p.payment_status || 'completed')
      } catch (e) {
        return sum
      }
    }, 0)
    
    return {
      date: format(dayStart, 'EEE'),
      amount: dayTotal,
      fullDate: format(dayStart, 'MMM dd')
    }
  })

  const maxAmount = Math.max(...chartData.map(d => d.amount), 1)

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Header with Better Design */}
      {organization && (
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-2xl shadow-xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="relative p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-5">
                {organization.logo_url ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 blur-xl rounded-2xl" />
                    <img
                      src={organization.logo_url}
                      alt={organization.name}
                      className="relative h-20 w-20 object-contain rounded-2xl border-2 border-white/30 bg-white/10 backdrop-blur-sm shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 blur-xl rounded-2xl" />
                    <div className="relative h-20 w-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-lg">
                      <span className="text-2xl font-bold text-white">
                        {getOrganizationAbbreviation(organization.name)}
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                    {organization.name}
                  </h1>
                  <div className="flex items-center gap-2 text-primary-100">
                    <Sparkles className="h-4 w-4" />
                    <p className="text-sm md:text-base font-medium">Organization Dashboard</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {organizationId && (
                  <button
                    onClick={() => setShowBulkTabCreator(true)}
                    className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-white text-primary-700 rounded-xl hover:bg-primary-50 transition-all shadow-lg hover:shadow-xl font-semibold text-xs sm:text-sm hover:scale-105 active:scale-95"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Create Payment Tab</span>
                    <span className="sm:hidden">Create Tab</span>
                  </button>
                )}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-start">
                  <div className="relative">
                    {profilePhotoUrl ? (
                      <img
                        src={profilePhotoUrl}
                        alt={userFullName}
                        className="h-10 w-10 rounded-xl object-cover border-2 border-white/30 shadow-lg"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-white/30 shadow-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="text-white">
                    <p className="text-sm font-semibold">{userFullName}</p>
                  </div>
                  <Link
                    href="/admin/notifications"
                    className="relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 text-white transition-all hover:scale-105 active:scale-95 font-medium text-xs sm:text-sm"
                  >
                    <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Notifications</span>
                    {unreadNotificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 text-white transition-all hover:scale-105 active:scale-95 font-medium text-xs sm:text-sm"
                  >
                    <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Settings</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 text-white transition-all hover:scale-105 active:scale-95 font-medium text-xs sm:text-sm"
                  >
                    <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid - Enhanced Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
        {/* Total Revenue Card */}
        <div className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-primary-200 transition-all duration-300 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div className="p-3.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              {isRevenueUp ? (
                <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-bold">+{Math.abs(revenueChange).toFixed(1)}%</span>
                </div>
              ) : revenueChange !== 0 ? (
                <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-xs font-bold">{Math.abs(revenueChange).toFixed(1)}%</span>
                </div>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(stats.totalPayments)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Transfer fee (1%): <span className="font-semibold text-red-600">{formatCurrency(transferFeeTotal)}</span>
              </p>
              <p className="text-xs text-gray-500">
                Service charge (3%): <span className="font-semibold text-orange-600">{formatCurrency(serviceChargeTotal)}</span>
              </p>
              <p className="text-xs text-gray-500">
                Net revenue (96%): <span className="font-semibold text-green-600">{formatCurrency(stats.totalPayments)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Revenue Card */}
        <Link 
          href="/admin/payments"
          className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-green-200 transition-all duration-300 overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div className="p-3.5 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-green-600 transition-colors" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Monthly Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">{formatCurrency(stats.monthlyRevenue)}</p>
              <p className="text-xs text-gray-500 font-medium">{stats.totalTransactions} transactions</p>
            </div>
          </div>
        </Link>

        {/* Total Members Card */}
        <Link 
          href="/admin/members"
          className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-300 overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div className="p-3.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                  {memberGrowthRate.toFixed(0)}%
                </span>
                <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Members</p>
              <p className="text-3xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                {stats.totalMembers}
              </p>
              <p className="text-xs text-gray-500 font-medium">{stats.activeMembers} active members</p>
            </div>
          </div>
        </Link>

        {/* Pending Approvals Card */}
        <Link 
          href="/admin/approvals"
          className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-orange-200 transition-all duration-300 overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div className="p-3.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-6 w-6 text-white" />
              </div>
              {totalPendingApprovals > 0 && (
                <div className="flex items-center gap-2">
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-full border border-orange-200">
                    {totalPendingApprovals}
                  </span>
                  <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-orange-600 transition-colors" />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pending Approvals</p>
              <p className="text-3xl font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                {totalPendingApprovals}
              </p>
              <p className="text-xs text-gray-500 font-medium">Requires attention</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Secondary Metrics - Refined */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
        <div className="bg-gradient-to-br from-purple-50 via-purple-50/50 to-white rounded-2xl border border-purple-100 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-2">Average Payment</p>
              <p className="text-2xl font-bold text-purple-900">{formatCurrency(stats.averagePayment)}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 via-indigo-50/50 to-white rounded-2xl border border-indigo-100 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Total Transactions</p>
              <p className="text-2xl font-bold text-indigo-900">{stats.totalTransactions}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-xl">
              <Activity className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-50 via-teal-50/50 to-white rounded-2xl border border-teal-100 p-6 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-2">Active Members</p>
              <p className="text-2xl font-bold text-teal-900">{stats.activeMembers}</p>
            </div>
            <div className="p-3 bg-teal-100 rounded-xl">
              <CheckCircle className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Activity Section - Enhanced */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Revenue Overview</h2>
              <p className="text-sm text-gray-500 font-medium">Last 7 days performance</p>
            </div>
            <Link href="/admin/payments" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1.5">
              View All
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="h-72 flex items-end justify-between gap-3 pb-2">
            {chartData.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-3 group">
                <div className="w-full flex flex-col items-center gap-2 relative">
                  <div 
                    className="w-full bg-gradient-to-t from-primary-600 via-primary-500 to-primary-400 rounded-t-xl transition-all duration-300 hover:from-primary-700 hover:via-primary-600 hover:to-primary-500 cursor-pointer relative shadow-md hover:shadow-lg"
                    style={{ height: `${Math.max((day.amount / maxAmount) * 100, 8)}%`, minHeight: '24px' }}
                    title={`${day.fullDate}: ${formatCurrency(day.amount)}`}
                  >
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-lg z-10">
                      <div className="font-semibold">{formatCurrency(day.amount)}</div>
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                        <div className="border-4 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{day.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 overflow-hidden">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Activity className="h-5 w-5 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
          </div>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No recent activity</p>
                <p className="text-xs text-gray-400 mt-1">Activity will appear here</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0 group">
                  <div className="p-2.5 bg-primary-50 rounded-lg group-hover:bg-primary-100 transition-colors">
                    <Wallet className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {activity.member?.full_name || 'Member'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 font-medium">
                      Paid <span className="text-primary-600 font-semibold">{formatCurrency(getDisplayAmount(activity.amount, activity.payment_status || 'completed'))}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(activity.created_at || activity.payment_date || new Date()), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Paid vs Unpaid Members Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Member Payment Status</h2>
            <p className="text-sm text-gray-500 font-medium">Paid vs Unpaid members overview</p>
          </div>
          <Link href="/admin/members" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1.5">
            View All
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Chart Visualization */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-64 h-64 mb-6">
              {/* Donut Chart using SVG */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="30"
                />
                {stats.totalMembers > 0 && (
                  <>
                    {/* Paid Members Arc */}
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="30"
                      strokeDasharray={`${(stats.paidMembers / stats.totalMembers) * 502.65} 502.65`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                    {/* Unpaid Members Arc */}
                    {stats.unpaidMembers > 0 && (
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="30"
                        strokeDasharray={`${(stats.unpaidMembers / stats.totalMembers) * 502.65} 502.65`}
                        strokeDashoffset={`-${(stats.paidMembers / stats.totalMembers) * 502.65}`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    )}
                  </>
                )}
              </svg>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold text-gray-900">{stats.totalMembers}</p>
                <p className="text-sm text-gray-500 font-medium">Total Members</p>
              </div>
            </div>
          </div>

          {/* Legend and Stats */}
          <div className="flex flex-col justify-center gap-6">
            <div className="space-y-4">
              {/* Paid Members */}
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100 hover:bg-green-100 transition-colors group">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-1">Paid Members</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-green-600">{stats.paidMembers}</p>
                    {stats.totalMembers > 0 && (
                      <p className="text-sm text-gray-500 font-medium">
                        ({((stats.paidMembers / stats.totalMembers) * 100).toFixed(1)}%)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Unpaid Members */}
              <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors group">
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-1">Unpaid Members</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-red-600">{stats.unpaidMembers}</p>
                    {stats.totalMembers > 0 && (
                      <p className="text-sm text-gray-500 font-medium">
                        ({((stats.unpaidMembers / stats.totalMembers) * 100).toFixed(1)}%)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Bar */}
            {stats.totalMembers > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Status Distribution</p>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full flex">
                    {stats.paidMembers > 0 && (
                      <div
                        className="bg-green-500 transition-all duration-500"
                        style={{ width: `${(stats.paidMembers / stats.totalMembers) * 100}%` }}
                      />
                    )}
                    {stats.unpaidMembers > 0 && (
                      <div
                        className="bg-red-500 transition-all duration-500"
                        style={{ width: `${(stats.unpaidMembers / stats.totalMembers) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Record and Pending Approvals - Enhanced */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
        {/* Payment Record */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <FileText className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Payment Record</h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Recent transactions</p>
              </div>
            </div>
            <Link href="/admin/payments" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1.5">
              View All
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="p-4 sm:p-6">
            {recentPayments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-600 font-semibold mb-1">No payments yet</p>
                <p className="text-sm text-gray-400">Payments will appear here once processed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="border border-gray-200 rounded-xl p-5 hover:bg-primary-50/50 hover:border-primary-300 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                          <p className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {formatCurrency(getDisplayAmount(payment.amount, 'completed'))}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 font-mono mb-2 font-semibold">{payment.reference_number}</p>
                        <p className="text-sm text-gray-800 font-semibold mb-1">
                          {payment.member.full_name}
                        </p>
                        <p className="text-xs text-gray-500 mb-3 font-medium">
                          ID: <span className="font-mono">{payment.member.membership_id}</span>
                        </p>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <p className="text-xs font-medium">
                            {format(new Date(payment.payment_date || payment.created_at || new Date()), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-orange-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Pending Approvals</h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Action required</p>
              </div>
            </div>
            <Link href="/admin/approvals" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1.5">
              View All
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="p-4 sm:p-6">
            {totalPendingApprovals === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-green-400" />
                </div>
                <p className="text-gray-600 font-semibold mb-1">All caught up!</p>
                <p className="text-sm text-gray-400">No pending approvals</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {/* Pending Members */}
                {pendingApprovals.members.map((member) => (
                  <div 
                    key={member.id} 
                    className="border border-orange-200 rounded-xl p-4 hover:bg-orange-50/50 hover:border-orange-300 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2.5 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors flex-shrink-0">
                          <Users className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate text-sm">
                            {member.full_name}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 font-mono font-semibold">{member.membership_id}</p>
                          <p className="text-xs text-gray-500 mt-1 truncate">{member.email}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-100 rounded-lg whitespace-nowrap border border-orange-200">
                        Member
                      </span>
                    </div>
                  </div>
                ))}

                {/* Pending Organization Requests */}
                {pendingApprovals.organization.map((org) => (
                  <div 
                    key={org.id} 
                    className="border border-orange-200 rounded-xl p-4 hover:bg-orange-50/50 hover:border-orange-300 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2.5 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors flex-shrink-0">
                          <Building2 className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate text-sm">
                            {org.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Organization approval pending</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-100 rounded-lg whitespace-nowrap border border-orange-200">
                        Organization
                      </span>
                    </div>
                  </div>
                ))}

                {/* Pending Admin Requests */}
                {pendingApprovals.adminRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="border border-orange-200 rounded-xl p-4 hover:bg-orange-50/50 hover:border-orange-300 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2.5 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors flex-shrink-0">
                          <UserCog className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate text-sm">
                            {request.user_name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 truncate">{request.user_email}</p>
                          <p className="text-xs text-gray-500 mt-1 truncate">{request.user_phone}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-100 rounded-lg whitespace-nowrap border border-orange-200">
                        Admin
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showBulkTabCreator && organizationId && (
        <BulkTabCreator
          organizationId={organizationId}
          onClose={() => setShowBulkTabCreator(false)}
        />
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  )
}
