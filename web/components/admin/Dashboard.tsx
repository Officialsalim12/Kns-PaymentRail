'use client'

import { useState } from 'react'
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
  Sparkles
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
}

export default function AdminDashboard({
  organization,
  stats,
  recentPayments,
  pendingApprovals,
  revenueHistory = [],
  memberGrowth = 0,
  revenueChange = 0
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

    const dayTotal = revenueHistory
      .filter(p => {
        const pDate = new Date(p.created_at || p.payment_date)
        return pDate >= dayStart && pDate <= dayEnd && (p.payment_status === 'completed' || p.status === 'completed')
      })
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

    return {
      date: format(date, 'EEE'),
      amount: dayTotal,
      fullDate: format(dayStart, 'MMM dd')
    }
  })

  const maxAmount = Math.max(...chartData.map(d => d.amount), 1)

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      {/* Welcome Header */}
      {organization && (
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-b-2xl md:rounded-2xl shadow-xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="relative p-6 sm:p-8 md:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8">
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4 sm:gap-6">
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={organization.name}
                    className="relative h-16 w-16 sm:h-24 sm:w-24 object-contain rounded-2xl border-2 border-white/30 bg-white/10 backdrop-blur-sm shadow-xl"
                  />
                ) : (
                  <div className="relative h-16 w-16 sm:h-24 sm:w-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-xl">
                    <span className="text-xl sm:text-3xl font-bold text-white uppercase tracking-wider">
                      {getOrganizationAbbreviation(organization.name)}
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  <h1 className="text-xl xs:text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                    {organization.name}
                  </h1>
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
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="md:hidden px-4">
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center">
                <div className="p-2.5 bg-primary-500 rounded-lg mb-4">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                {revenueChange !== 0 && (
                  <div className={`mb-3 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${revenueChange >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                    {revenueChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(revenueChange).toFixed(1)}%
                  </div>
                )}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalPayments)}</p>
              </div>

              <Link href="/admin/payments" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-green-200 transition-colors flex flex-col items-center text-center">
                <div className="p-2.5 bg-green-500 rounded-lg mb-4">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Monthly</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
              </Link>

              <Link href="/admin/members" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-blue-200 transition-colors flex flex-col items-center text-center">
                <div className="p-2.5 bg-blue-500 rounded-lg mb-4">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <span className="mb-3 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                  +{memberGrowthRate.toFixed(0)}%
                </span>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Members</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
              </Link>

              <Link href="/admin/approvals" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:border-orange-200 transition-colors flex flex-col items-center text-center">
                <div className="p-2.5 bg-orange-500 rounded-lg mb-4">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                {totalPendingApprovals > 0 && (
                  <span className="mb-3 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {totalPendingApprovals}
                  </span>
                )}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{totalPendingApprovals}</p>
              </Link>
            </div>
          </div>

          {/* Analytics Tab Content */}
          <div className={`${mobileTab === 'analytics' ? 'block' : 'hidden md:block'} space-y-8`}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Revenue Performance</h2>
              <div className="h-64 sm:h-72 flex items-end justify-between gap-2 sm:gap-4">
                {chartData.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-3 group">
                    <div className="w-full bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg transition-all duration-300 group-hover:from-primary-700 group-hover:to-primary-500 relative cursor-pointer"
                      style={{ height: `${Math.max((day.amount / maxAmount) * 100, 8)}%` }}>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                        {formatCurrency(day.amount)}
                      </div>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">{day.date}</span>
                  </div>
                ))}
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
