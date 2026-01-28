'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Download, Bell, Wallet, Calendar, CheckCircle, Trash2, FileText, ExternalLink, Sparkles, ArrowUpRight, User as UserIcon, Settings, LogOut } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/currency'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import MemberPaymentForm from './MemberPaymentForm'
import { getMemberDisplayAmount, calculateCompletedPaymentsDisplayAmount } from '@/lib/utils/payment-display'

interface Member {
  id: string
  full_name: string
  membership_id: string
  status: string
  unpaid_balance: number
  total_paid: number
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  payment_status?: string
  reference_number: string
  description: string
  receipt?: {
    id?: string
    receipt_number?: string | null
    pdf_url?: string | null
    pdf_storage_path?: string | null
  } | null
}

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

interface MemberTab {
  id: string
  tab_name: string
  tab_type: 'payment' | 'donation'
  description: string | null
  monthly_cost: number | null
  is_active: boolean
}

interface Receipt {
  id: string
  receipt_number: string
  pdf_url: string | null
  pdf_storage_path?: string | null
  created_at: string
  payment?: {
    id: string
    amount: number
    payment_date: string
    payment_method: string
    description: string | null
  }
}

interface Props {
  member: Member | null
  payments: Payment[]
  receipts: Receipt[]
  notifications: Notification[]
  tabs: MemberTab[]
  profilePhotoUrl?: string | null
  unreadNotificationCount?: number
}

export default function MemberDashboard({ member, payments: initialPayments, receipts: initialReceipts, notifications: initialNotifications, tabs, profilePhotoUrl, unreadNotificationCount = 0 }: Props) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications || [])
  const [payments, setPayments] = useState(initialPayments)
  const [receipts, setReceipts] = useState(initialReceipts)
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<MemberTab | null>(null)
  const [memberData, setMemberData] = useState(member)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Set up realtime subscriptions for payments and receipts
  useEffect(() => {
    if (typeof window === 'undefined' || !memberData?.id) return

    const supabase = createClient()

    const paymentsChannel = supabase
      .channel(`member-payments-${memberData.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `member_id=eq.${memberData.id}`,
        },
        (payload) => {
          console.log('Payment change detected:', payload)
          router.refresh()
        }
      )
      .subscribe()

    const receiptsChannel = supabase
      .channel(`member-receipts-${memberData.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'receipts',
          filter: `member_id=eq.${memberData.id}`,
        },
        (payload) => {
          console.log('Receipt change detected:', payload)
          router.refresh()
        }
      )
      .subscribe()

    const memberChannel = supabase
      .channel(`member-updates-${memberData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'members',
          filter: `id=eq.${memberData.id}`,
        },
        (payload) => {
          console.log('Member update detected:', payload)
          if (payload.new) {
            setMemberData(payload.new as Member)
          }
          router.refresh()
        }
      )
      .subscribe()

    const tabsChannel = supabase
      .channel(`member-tabs-${memberData.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'member_tabs',
          filter: `member_id=eq.${memberData.id}`,
        },
        (payload) => {
          console.log('Member tab change detected:', payload)
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(paymentsChannel)
      supabase.removeChannel(receiptsChannel)
      supabase.removeChannel(memberChannel)
      supabase.removeChannel(tabsChannel)
    }
  }, [memberData?.id, router])

  // Calculate total paid from completed payments only (member sees full amount paid)
  // Always use recalculated value from actual completed payments - don't fall back to database value
  const recalculatedTotalPaid = calculateCompletedPaymentsDisplayAmount(payments)
  const displayTotalPaid = recalculatedTotalPaid

  const refreshMemberData = async () => {
    setIsRefreshing(true)
    try {
      router.refresh()
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data: freshMember } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (freshMember) {
        setMemberData(freshMember)
      }
    } catch (error) {
      console.error('Error refreshing member data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!memberData) {
    return <div>Loading...</div>
  }

  // Calculate unread count after early return check
  const unreadCount = unreadNotificationCount > 0
    ? unreadNotificationCount
    : (notifications || []).filter(n => !n.is_read).length

  if (typeof window !== 'undefined') {
    console.log('Member Dashboard - Tabs received:', tabs)
    console.log('Member Dashboard - Tabs count:', tabs?.length || 0)
    console.log('Member Dashboard - Notifications received:', notifications)
    console.log('Member Dashboard - Notifications count:', notifications?.length || 0)
    console.log('Member Dashboard - Unread count:', unreadCount)
  }

  const handleDeleteNotification = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) {
      return
    }

    setDeletingNotificationId(notificationId)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        throw new Error(`Failed to delete notification: ${error.message}`)
      }

      setNotifications(notifications.filter(n => n.id !== notificationId))
      router.refresh()
    } catch (error: any) {
      alert(`Error deleting notification: ${error.message}`)
    } finally {
      setDeletingNotificationId(null)
    }
  }

  const handleDownloadReceipt = async (pdfUrl: string | null | undefined, receiptNumber: string | null | undefined, storagePath?: string | null) => {
    try {
      // Early validation
      if (!receiptNumber) {
        console.error('Receipt download failed - missing receipt number')
        alert('Receipt number is not available. Please contact support.')
        return
      }

      const supabase = createClient()

      // Step 1: Get storage path - prioritize storagePath, then extract from pdfUrl
      let path = storagePath || null
      if (!path && pdfUrl) {
        // Try to extract path from public URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/receipts/org_id/receipt_number.pdf
        const match = pdfUrl.match(/\/receipts\/(.+)$/)
        if (match) {
          path = match[1]
        }
      }

      // Step 2: Generate public URL - prioritize pdfUrl, then generate from path
      let publicUrl = pdfUrl || null
      if (!publicUrl && path) {
        const { data: { publicUrl: generatedUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
        publicUrl = generatedUrl || null
      }

      // Step 3: If we have no path and no URL, we can't proceed
      if (!path && !publicUrl) {
        alert('Receipt URL is not available. The receipt may not have been generated yet. Please contact support.')
        console.error('Receipt download failed - missing both path and URL:', { pdfUrl, storagePath, receiptNumber })
        return
      }

      const triggerDownload = (blob: Blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${receiptNumber}.pdf`
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        // Delay revoking URL to ensure download starts
        setTimeout(() => {
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }, 100)
      }

      if (path) {
        // Method 1: Try direct download from Supabase storage
        const { data: downloadData, error: downloadError } = await supabase
          .storage
          .from('receipts')
          .download(path)

        if (downloadData && !downloadError && downloadData.size > 0) {
          triggerDownload(downloadData)
          return
        }

        if (downloadData && downloadData.size === 0) {
          console.log('Downloaded blob is empty, trying alternative methods')
        }

        console.log('Direct download failed, trying signed URL:', downloadError?.message)

        // Method 2: Use signed URL for download
        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from('receipts')
          .createSignedUrl(path, 60) // 60 seconds expiry

        if (signedUrlData?.signedUrl && !signedUrlError) {
          const response = await fetch(signedUrlData.signedUrl)
          if (response.ok) {
            const blob = await response.blob()
            if (blob.size > 0) {
              triggerDownload(blob)
              return
            } else {
              console.log('Blob from signed URL is empty')
            }
          } else {
            console.log('Failed to fetch signed URL:', response.status, response.statusText)
          }
        } else {
          console.log('Signed URL creation failed:', signedUrlError?.message)
        }
      }

      // Method 3: Try direct download from public URL (already generated above if needed)
      if (publicUrl && publicUrl.startsWith('http')) {
        try {
          const response = await fetch(publicUrl)
          if (response.ok) {
            const blob = await response.blob()
            if (blob.size > 0) {
              triggerDownload(blob)
              return
            } else {
              console.log('Blob from public URL is empty')
            }
          } else {
            console.log('Failed to fetch public URL:', response.status, response.statusText)
          }
        } catch (fetchError) {
          console.error('Error fetching public URL:', fetchError)
        }
      }

      // Final fallback: open in new tab (only if URL is valid)
      if (publicUrl && publicUrl.startsWith('http')) {
        console.log('All download methods failed, opening in new tab')
        window.open(publicUrl, '_blank')
      } else {
        alert('Unable to download receipt. The receipt URL is invalid. Please contact support.')
        console.error('Invalid PDF URL:', pdfUrl, 'Storage path:', path)
      }
    } catch (error) {
      console.error('Error downloading receipt:', error)
      // Fallback: try to generate public URL from storage path if pdfUrl is missing
      let fallbackUrl = pdfUrl
      if (!fallbackUrl && storagePath) {
        const supabase = createClient()
        const { data: { publicUrl: generatedUrl } } = supabase.storage.from('receipts').getPublicUrl(storagePath)
        fallbackUrl = generatedUrl
      }

      // Fallback: open in new tab (only if URL is valid)
      if (fallbackUrl && fallbackUrl.startsWith('http')) {
        window.open(fallbackUrl, '_blank')
      } else {
        alert('An error occurred while downloading the receipt. Please contact support.')
      }
    }
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Header with Better Design */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-b-2xl shadow-xl w-full">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="relative p-6 sm:p-8 md:p-10">
          <div className="flex flex-col items-center justify-center gap-8">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="space-y-4">
                <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight">
                  {memberData.full_name}
                </h1>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center justify-center gap-2.5 text-primary-100/90 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full w-fit mx-auto">
                    <Sparkles className="h-4 w-4 text-primary-200" />
                    <p className="text-xs sm:text-sm font-semibold tracking-wide uppercase">Member Dashboard</p>
                  </div>
                  <p className="text-sm sm:text-base text-primary-200/90 font-mono tracking-[0.3em] uppercase opacity-80">ID: {memberData.membership_id}</p>
                </div>
              </div>
            </div>

            {/* Actions are now in the Sidebar/Header */}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        {tabs && tabs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className="border border-gray-200 rounded-xl p-5 hover:border-primary-300 hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => setSelectedTab(tab)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-gray-900 text-lg">{tab.tab_name}</h3>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${tab.tab_type === 'payment'
                        ? 'bg-primary-100 text-primary-700 border border-primary-200'
                        : 'bg-primary-50 text-primary-600 border border-primary-100'
                        }`}>
                        {tab.tab_type === 'payment' ? 'Payment' : 'Donation'}
                      </span>
                    </div>
                    {tab.description && (
                      <p className="text-sm text-gray-600 mb-4 leading-relaxed">{tab.description}</p>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTab(tab)
                      }}
                      className={`w-full px-4 py-2.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md ${tab.tab_type === 'payment'
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                        }`}
                    >
                      {tab.tab_type === 'payment' ? 'Pay Now' : 'Donate Here'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid - Enhanced Design */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Status Card */}
          <div className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-primary-200 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-5">
                <div className="p-3.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</p>
                <p className="text-3xl font-bold text-gray-900 capitalize">{memberData.status}</p>
              </div>
            </div>
          </div>

          {/* Total Paid Card */}
          <Link
            href="/member/payment-history"
            className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-green-200 transition-all duration-300 overflow-hidden cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-5">
                <div className="p-3.5 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      refreshMemberData()
                    }}
                    disabled={isRefreshing}
                    className="p-1.5 text-gray-300 hover:text-green-600 disabled:opacity-50 transition-colors"
                    title="Refresh data"
                  >
                    <svg
                      className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-green-600 transition-colors" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Paid</p>
                <p className="text-3xl font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">{formatCurrency(displayTotalPaid)}</p>
              </div>
            </div>
          </Link>

          {/* Unpaid Balance Card */}
          <div className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-orange-200 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-5">
                <div className="p-3.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Unpaid Balance</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(memberData.unpaid_balance || 0)}</p>
              </div>
            </div>
          </div>

          {/* Last Payment Card */}
          <Link
            href="/member/payment-history"
            className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-300 overflow-hidden cursor-pointer"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="flex items-center justify-between mb-5">
                <div className="p-3.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Last Payment</p>
                <p className="text-3xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {payments[0] ? format(new Date(payments[0].payment_date), 'MMM dd') : 'N/A'}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Payment History - Enhanced */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <FileText className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">Recent transactions</p>
              </div>
            </div>
            {payments.length > 3 && (
              <Link href="/member/payment-history" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1.5">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          <div className="p-6">
            {payments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-600 font-semibold mb-1">No payments yet</p>
                <p className="text-sm text-gray-400">Payments will appear here once processed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.slice(0, 3).map((payment) => (
                  <div
                    key={payment.id}
                    className="border border-gray-200 rounded-xl p-4 sm:p-5 hover:bg-primary-50/50 hover:border-primary-300 transition-all cursor-pointer group"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3">
                          <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                          </div>
                          <p className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {formatCurrency(getMemberDisplayAmount(payment.amount))}
                          </p>
                          <span className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-semibold ${payment.payment_status === 'completed'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : payment.payment_status === 'processing'
                              ? 'bg-primary-50 text-primary-700 border border-primary-200'
                              : payment.payment_status === 'failed'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                            {payment.payment_status || 'pending'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 font-mono mb-2 font-semibold">Reference: {payment.reference_number || 'N/A'}</p>
                        <p className="text-xs text-gray-500 mb-3 font-medium flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                        </p>
                        {payment.description && (
                          <p className="text-sm text-gray-700 mt-2">{payment.description}</p>
                        )}
                      </div>
                      {payment.receipt && payment.receipt.receipt_number && (
                        payment.receipt.pdf_url || payment.receipt.pdf_storage_path ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (payment.receipt?.receipt_number && (payment.receipt.pdf_url || payment.receipt.pdf_storage_path)) {
                                handleDownloadReceipt(
                                  payment.receipt.pdf_url || null,
                                  payment.receipt.receipt_number,
                                  payment.receipt.pdf_storage_path || null
                                )
                              }
                            }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-all border border-primary-100 sm:border-0"
                            title="Download Receipt"
                          >
                            <Download className="h-4 w-4" />
                            <span className="text-sm font-semibold">Receipt</span>
                          </button>
                        ) : (
                          <span
                            className="w-full sm:w-auto flex items-center justify-center gap-2 text-gray-400 cursor-not-allowed border border-gray-100 sm:border-0 px-4 py-2"
                            title="Receipt URL is not available. The receipt may not have been generated yet. Please contact support."
                          >
                            <Download className="h-4 w-4" />
                            <span className="text-sm font-medium">Receipt</span>
                          </span>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notifications Section - Always Display */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Bell className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
            </div>
            {(notifications?.length || 0) > 5 && (
              <Link href="/member/notifications" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1.5">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          <div className="p-6">
            {!notifications || notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-semibold mb-1">No notifications</p>
                <p className="text-sm text-gray-400">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={`border rounded-xl p-4 transition-all ${!notification.is_read
                      ? 'border-primary-300 bg-primary-50/50'
                      : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-primary-600 rounded-full"></span>
                          )}
                          <h3 className={`font-semibold ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                            {notification.title || 'Notification'}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(notification.created_at), 'MMM dd, yyyy h:mm a')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        disabled={deletingNotificationId === notification.id}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Delete notification"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedTab && memberData && (
          <MemberPaymentForm
            memberId={memberData.id}
            tabName={selectedTab.tab_name}
            tabType={selectedTab.tab_type}
            monthlyCost={selectedTab.monthly_cost}
            onSuccess={() => {
              setSelectedTab(null)
              router.refresh()
            }}
            onCancel={() => setSelectedTab(null)}
          />
        )}
      </div>
    </div>
  )
}

