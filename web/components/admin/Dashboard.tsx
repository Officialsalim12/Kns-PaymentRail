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
    averagePayment: number
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

  // Generate chart data for last 7 days
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    const dailyPayments = revenueHistory
      .filter(p => {
        const pDate = new Date(p.created_at || p.payment_date)
        return pDate >= dayStart && pDate <= dayEnd
      })

    const dayTotal = dailyPayments
      .filter(p => p.payment_status === 'completed' || p.status === 'completed')
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

    const transactionCount = dailyPayments.length

    return {
      date: format(date, 'EEE'),
      amount: dayTotal,
      count: transactionCount,
      fullDate: format(dayStart, 'MMM dd')
    }
  })

  const maxAmount = Math.max(...chartData.map(d => d.amount), 1)

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

          <div className="relative p-5 xs:p-6 sm:p-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              {organization.logo_url ? (
                <div className="relative h-14 w-14 sm:h-20 sm:w-20">
                  <Image
                    src={organization.logo_url}
                    alt={organization.name}
                    fill
                    className="rounded-2xl object-cover ring-4 ring-white/20 shadow-2xl"
                  />
                </div>
              ) : (
                <div className="relative h-14 w-14 sm:h-20 sm:w-20 rounded-2xl bg-white/10 flex items-center justify-center ring-4 ring-white/10 shadow-2xl">
                  <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-white opacity-80" />
                </div>
              )}
              <div className="space-y-1">
                <h1 className="text-xl xs:text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {organization.name}
                </h1>
                <p className="text-primary-100 text-[10px] xs:text-xs sm:text-sm font-medium opacity-80">Organization Dashboard</p>
              </div>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-4 w-full lg:w-auto">
              <button
                onClick={() => setShowBulkTabCreator(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3.5 bg-white text-primary-700 rounded-xl sm:rounded-2xl hover:bg-primary-50 transition-all shadow-lg font-bold text-xs sm:text-sm tracking-wide active:scale-95 group"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
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
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col items-center text-center">
                <div className="p-2 bg-primary-500 rounded-lg mb-4">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{formatCurrency(stats.totalPayments)}</p>
              </div>

              <Link href="/admin/payments" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:border-green-200 transition-colors flex flex-col items-center text-center">
                <div className="p-2 bg-green-500 rounded-lg mb-4">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Monthly</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{formatCurrency(stats.monthlyRevenue)}</p>
              </Link>

              <Link href="/admin/members" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:border-blue-200 transition-colors flex flex-col items-center text-center">
                <div className="p-2 bg-blue-500 rounded-lg mb-4">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Members</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{stats.totalMembers}</p>
              </Link>

              <Link href="/admin/approvals" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:border-orange-200 transition-colors flex flex-col items-center text-center">
                <div className="p-2 bg-orange-500 rounded-lg mb-4">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                {totalPendingApprovals > 0 && (
                  <span className="mb-3 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {totalPendingApprovals}
                  </span>
                )}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pending</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{totalPendingApprovals}</p>
              </Link>
            </div>
          </div>

          {/* Analytics Tab Content */}
          <div className={`${mobileTab === 'analytics' ? 'block' : 'hidden md:block'} space-y-8`}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-8 sm:mb-10 text-center sm:text-left">Revenue Performance</h2>
              <div className="h-64 sm:h-80 flex items-end justify-between gap-1 xs:gap-3 sm:gap-6 lg:gap-8 px-1 xs:px-4">
                {chartData.map((day) => {
                  const height = Math.max(8, (day.amount / maxAmount) * 100)
                  return (
                    <div key={day.date} className="relative flex-1 flex flex-col items-center group">
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all z-10 pointer-events-none">
                        <div className="bg-gray-900/95 text-white text-[10px] px-2 py-1 rounded shadow-xl whitespace-nowrap text-center">
                          <div className="font-bold">{formatCurrency(day.amount)}</div>
                          <div className="font-medium text-gray-300">{day.count} Transactions</div>
                        </div>
                      </div>
                      <div
                        className="w-full max-w-[12px] xs:max-w-[20px] sm:max-w-[32px] rounded-t-lg bg-white/20 hover:bg-white/40 active:bg-white/60 transition-all relative overflow-hidden group/bar"
                        style={{ height: `${height}%` }}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-white/40 transition-all duration-1000 group-hover/bar:bg-white/60"
                          style={{ height: '0%', animation: 'grow-up 1s ease-out forwards' }}
                        />
                      </div>
                      <div className="mt-3 flex flex-col items-center">
                        <p className="text-[8px] xs:text-[10px] font-bold text-white/60 uppercase tracking-tighter xs:tracking-widest">
                          {day.date}
                        </p>
                        {day.count > 0 && (
                          <span className="text-[8px] text-white/40 font-mono mt-0.5">{day.count}</span>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Activity */}
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

              {/* Member Payment Status */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Payment Status</h2>
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-40 mb-6">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#f1f5f9" strokeWidth="20" />
                      {stats.totalMembers > 0 && (
                        <>
                          <circle cx="100" cy="100" r="80" fill="none" stroke="#10b981" strokeWidth="20"
                            strokeDasharray={`${(stats.paidMembers / stats.totalMembers) * 502.65} 502.65`}
                            strokeLinecap="round" />
                          {stats.unpaidMembers > 0 && (
                            <circle cx="100" cy="100" r="80" fill="none" stroke="#ef4444" strokeWidth="20"
                              strokeDasharray={`${(stats.unpaidMembers / stats.totalMembers) * 502.65} 502.65`}
                              strokeDashoffset={`-${(stats.paidMembers / stats.totalMembers) * 502.65}`}
                              strokeLinecap="round" />
                          )}
                        </>
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-3xl font-extrabold text-gray-900">{stats.totalMembers}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                    </div>
                  </div>

                  <div className="flex gap-6 w-full justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-gray-700">{stats.paidMembers} Paid</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-xs font-bold text-gray-700">{stats.unpaidMembers} Unpaid</span>
                    </div>
                  </div>
                </div>
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
