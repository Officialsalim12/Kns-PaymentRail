'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Wallet,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  Activity,
  Calendar,
  Plus,
  BarChart3,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Building2
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import Link from 'next/link'
import BulkPaymentTabCreator from './BulkTabCreator'
import { formatCurrency } from '@/lib/currency'
import { getOrganizationAbbreviation } from '@/lib/utils/organization'

interface DashboardProps {
  organization: any
  stats: {
    totalPayments: number
    monthlyRevenue: number
    totalTransactions: number
    totalMembers: number
    activeMembers: number
    unpaidMembers: number
    paidMembers: number
    monthlyTotal: number
    weeklyTotal: number
    oneTimeTotal: number
    donationTotal: number
  }
  recentPayments: any[]
  pendingApprovals: any[]
  revenueHistory?: any[]
  memberGrowth?: number
  revenueChange?: number
  paymentStatusDistribution?: {
    completed: number
    pending: number
    failed: number
    total: number
  }
}

export default function AdminDashboard({
  organization,
  stats,
  recentPayments,
  pendingApprovals,
  revenueHistory = [],
  memberGrowth = 0,
  revenueChange = 0,
  paymentStatusDistribution
}: DashboardProps) {
  const [showBulkTabCreator, setShowBulkTabCreator] = useState(false)
  const [mobileTab, setMobileTab] = useState<'summary' | 'analytics' | 'activity'>('summary')
  const organizationId = organization?.id
  const [logoError, setLogoError] = useState(false)

  // Calculate fees
  const transferFeeTotal = stats.totalPayments * 0.01 // 1%
  const serviceChargeTotal = stats.totalPayments * 0.03 // 3%
  const netRevenue = stats.totalPayments * 0.96 // 96%

  const isRevenueUp = revenueChange >= 0
  const memberGrowthRate = memberGrowth

  // Filter recent payments
  const recentActivity = recentPayments.slice(0, 5)

  // Get display amount
  const getDisplayAmount = (amount: any, status: string) => {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0
    return numAmount
  }

  const totalPendingApprovals = pendingApprovals.length

  const toSafeAmount = (value: any) => {
    const numeric = typeof value === 'number' ? value : parseFloat(String(value ?? 0))
    return Number.isFinite(numeric) ? numeric : 0
  }

  // Generate chart data for last 7 days
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    const dailyPayments = revenueHistory
      .filter(p => {
        const pDate = new Date(p.payment_date || p.created_at)
        if (Number.isNaN(pDate.getTime())) return false
        return pDate >= dayStart && pDate <= dayEnd
      })

    const dayTotal = dailyPayments
      .filter(p => p.payment_status === 'completed' || p.status === 'completed')
      .reduce((sum, p) => sum + toSafeAmount(p.amount), 0)

    const transactionCount = dailyPayments.length

    return {
      date: format(date, 'EEE'),
      amount: dayTotal,
      count: transactionCount,
      fullDate: format(dayStart, 'MMM dd')
    }
  })

  const maxAmount = Math.max(1, ...chartData.map(d => toSafeAmount(d.amount)))
  const hasGraphData = chartData.some(d => d.count > 0 || d.amount > 0)

  // Use paymentStatusDistribution if available, otherwise fallback to stats (though page now provides it)
  const statusData = paymentStatusDistribution || {
    completed: 0,
    pending: 0,
    failed: 0,
    total: 0
  }

  // Calculate percentages for the donut chart
  const totalStatus = statusData.total || 1
  const completedPct = (statusData.completed / totalStatus) * 502.65
  const pendingPct = (statusData.pending / totalStatus) * 502.65
  const failedPct = (statusData.failed / totalStatus) * 502.65

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      {/* Welcome Header */}
      {organization && (
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-2xl shadow-xl mx-2 xs:mx-4 sm:mx-0">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-primary-400/20 rounded-full blur-2xl" />

          <div className="relative p-5 xs:p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
              {organization.logo_url && !logoError ? (
                <div className="relative h-12 w-12 sm:h-16 sm:w-16 shrink-0">
                  <Image
                    src={organization.logo_url}
                    alt={organization.name}
                    fill
                    className="object-contain rounded-xl bg-white ring-4 ring-white/20 shadow-2xl"
                    onError={() => setLogoError(true)}
                  />
                </div>
              ) : (
                <div className="relative h-12 w-12 sm:h-16 sm:w-16 shrink-0 rounded-xl bg-white/10 flex items-center justify-center ring-4 ring-white/10 shadow-2xl backdrop-blur-sm">
                  <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-white opacity-80" />
                </div>
              )}
              <div className="space-y-1.5 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                  {organization.name}
                </h1>
                <p className="text-primary-100 text-xs sm:text-sm font-semibold opacity-90 tracking-wide uppercase">Admin Dashboard</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setShowBulkTabCreator(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white text-primary-700 rounded-2xl hover:bg-primary-50 transition-all shadow-xl font-bold text-sm tracking-wide active:scale-95 group"
              >
                <Plus className="h-5 w-5 text-primary-600 transition-transform group-hover:rotate-90" />
                <span>Create Payment Tab</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="md:hidden px-2 sm:px-4">
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setMobileTab('summary')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mobileTab === 'summary' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
          >
            Summary
          </button>
          <button
            onClick={() => setMobileTab('analytics')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mobileTab === 'analytics' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
          >
            Analytics
          </button>
          <button
            onClick={() => setMobileTab('activity')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mobileTab === 'activity' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
          >
            Activity
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Summary Tab Content */}
          <div className={`${mobileTab === 'summary' ? 'block' : 'hidden md:block'} space-y-8`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="p-2 bg-primary-500 rounded-lg mb-4">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{formatCurrency(stats.monthlyTotal + stats.weeklyTotal + stats.oneTimeTotal + stats.donationTotal)}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="p-2 bg-green-500 rounded-lg mb-4">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Monthly Pay</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{formatCurrency(stats.monthlyTotal)}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="p-2 bg-blue-500 rounded-lg mb-4">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Weekly Pay</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{formatCurrency(stats.weeklyTotal)}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="p-2 bg-purple-500 rounded-lg mb-4">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">One-Time Pay</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{formatCurrency(stats.oneTimeTotal)}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="p-2 bg-orange-500 rounded-lg mb-4">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Donations</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{formatCurrency(stats.donationTotal)}</p>
              </div>
            </div>

            {/* Sub-metrics members info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <Link href="/admin/members" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:border-blue-200 transition-colors flex items-center gap-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Members</p>
                  <p className="text-xl font-bold text-gray-900">{stats.totalMembers}</p>
                </div>
              </Link>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <span className="w-5 h-5 rounded-full bg-green-600 animate-pulse block" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Paid Members</p>
                  <p className="text-xl font-bold text-gray-900">{stats.paidMembers}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unpaid Balance</p>
                  <p className="text-xl font-bold text-gray-900">{stats.unpaidMembers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Content (always visible so charts are never hidden) */}
          <div className="space-y-8">
            {/* Revenue Performance (existing bar chart) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8 overflow-hidden">
              <h2 className="text-lg font-bold text-gray-900 mb-8 sm:mb-10 text-center sm:text-left">Revenue Performance</h2>
              {hasGraphData ? (
                <div className="overflow-x-auto pb-4 -mx-1 px-1 hide-scrollbar">
                  <div className="h-64 sm:h-80 min-w-[500px] flex items-end justify-between gap-3 sm:gap-6 lg:gap-8 pr-4">
                  {chartData.map((day) => {
                    const safeAmount = toSafeAmount(day.amount)
                    const height = Math.max(8, (safeAmount / maxAmount) * 100)
                    return (
                      <div key={day.date} className="relative flex-1 flex flex-col items-center group">
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all z-10 pointer-events-none">
                          <div className="bg-gray-900/95 text-white text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap text-center">
                            <div className="font-bold">{formatCurrency(safeAmount)}</div>
                            <div className="font-medium text-gray-300">{day.count} Transactions</div>
                          </div>
                        </div>
                        <div
                          className="w-full max-w-[12px] xs:max-w-[20px] sm:max-w-[32px] rounded-t-lg bg-slate-200 hover:bg-slate-300 active:bg-slate-300 transition-all relative overflow-hidden group/bar border border-slate-300"
                          style={{ height: `${height}%` }}
                        >
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-[#0f172a]"
                            style={{ height: '100%' }}
                          />
                        </div>
                        <div className="mt-3 flex flex-col items-center">
                          <p className="text-[8px] xs:text-[10px] font-bold text-gray-500 uppercase tracking-tighter xs:tracking-widest">
                            {day.date}
                          </p>
                          {day.count > 0 && (
                            <span className="text-[8px] text-gray-400 font-mono mt-0.5">{day.count}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="h-64 sm:h-80 flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-500">No payment data for the selected period yet.</p>
              </div>
            )}
          </div>

            {/* Member Payment Participation chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Member Payment Participation</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Shows how many active members paid in the last 7 days compared to those who did not.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" />
                    <span className="font-semibold text-gray-600">Paying members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <span className="font-semibold text-gray-600">Not paying</span>
                  </div>
                </div>
              </div>

              <div className="h-64 flex items-end justify-between gap-1 xs:gap-3 sm:gap-6 lg:gap-8 px-1 xs:px-4">
                {chartData.map((day) => {
                  // Unique member IDs who paid (completed) on this day
                  const date = subDays(new Date(), 6 - chartData.findIndex(d => d.date === day.date))
                  const dayStart = startOfDay(date)
                  const dayEnd = endOfDay(date)

                  const membersWhoPaid = new Set(
                    revenueHistory
                      .filter(p => {
                        const pDate = new Date(p.payment_date || p.created_at)
                        if (Number.isNaN(pDate.getTime())) return false
                        return (
                          p.payment_status === 'completed' &&
                          p.member_id &&
                          pDate >= dayStart &&
                          pDate <= dayEnd
                        )
                      })
                      .map(p => p.member_id)
                  )

                  const payingCount = membersWhoPaid.size
                  const totalActive = Math.max(stats.activeMembers, payingCount)
                  const payingPct = totalActive > 0 ? (payingCount / totalActive) * 100 : 0
                  const nonPayingPct = 100 - payingPct

                  return (
                    <div key={day.date} className="relative flex-1 flex flex-col items-center group">
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all z-10 pointer-events-none">
                        <div className="bg-gray-900/95 text-white text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap text-center">
                          <div className="font-bold">{payingCount} paying</div>
                          <div className="font-medium text-gray-300">
                            {totalActive - payingCount} not paying
                          </div>
                        </div>
                      </div>
                      <div className="w-full max-w-[16px] xs:max-w-[22px] sm:max-w-[30px] rounded-t-lg bg-slate-200 overflow-hidden flex flex-col justify-end border border-slate-300">
                        <div
                          className="bg-[#0f172a] transition-all duration-700"
                          style={{ height: `${payingPct}%` }}
                        />
                        <div
                          className="bg-slate-200"
                          style={{ height: `${nonPayingPct}%` }}
                        />
                      </div>
                      <div className="mt-3 flex flex-col items-center">
                        <p className="text-[8px] xs:text-[10px] font-bold text-gray-500 uppercase tracking-tighter xs:tracking-widest">
                          {day.date}
                        </p>
                        {payingCount > 0 && (
                          <span className="text-[8px] text-gray-400 font-mono mt-0.5">
                            {payingCount}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Activity Tab Content */}
          <div className={`${mobileTab === 'activity' ? 'block' : 'hidden md:block'} space-y-8`}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
              </div>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                      <div className="p-2 bg-primary-50 rounded-lg shrink-0">
                        <Wallet className="h-4 w-4 text-primary-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{activity.member?.full_name || 'Member'}</p>
                        <p className="text-xs text-gray-500">Paid <span className="text-primary-600 font-bold">{formatCurrency(getDisplayAmount(activity.amount, activity.status))}</span></p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showBulkTabCreator && organizationId && (
        <BulkPaymentTabCreator
          organizationId={organizationId}
          onClose={() => setShowBulkTabCreator(false)}
        />
      )}
    </div>
  )
}
