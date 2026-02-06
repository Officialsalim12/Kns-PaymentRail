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
  const [mobileTab, setMobileTab] = useState<'overview' | 'history' | 'notifications'>('overview')
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
            }
          }
        }
      }

      // Method 3: Try direct download from public URL
      if (publicUrl && publicUrl.startsWith('http')) {
        try {
          const response = await fetch(publicUrl)
          if (response.ok) {
            const blob = await response.blob()
            if (blob.size > 0) {
              triggerDownload(blob)
              return
            }
          }
        } catch (fetchError) {
          console.error('Error fetching public URL:', fetchError)
        }
      }

      // Final fallback: open in new tab
      if (publicUrl && publicUrl.startsWith('http')) {
        window.open(publicUrl, '_blank')
      } else {
        alert('Unable to download receipt. Please contact support.')
      }
    } catch (error) {
      console.error('Error downloading receipt:', error)
      alert('An error occurred while downloading the receipt.')
    }
  }

  // Handle inactive/pending account restrictions
  if (memberData.status !== 'active') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Account Inactive</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Your account is currently restricted. This usually happens when payments are overdue for more than 3 months.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Unpaid Balance</p>
            <p className="text-3xl font-black text-gray-900">{formatCurrency(memberData.unpaid_balance || 0)}</p>
          </div>

          <p className="text-xs text-gray-400 font-medium italic">
            Your dashboard will unlock automatically once the balance is cleared.
          </p>

          <div className="space-y-3">
            {tabs && tabs.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left px-2 mb-1">Select a service to pay:</p>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab)}
                    className="w-full p-4 bg-white border border-gray-200 rounded-2xl flex items-center justify-between group hover:border-primary-600 hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <div className="text-left">
                      <p className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{tab.tab_name}</p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                        {tab.tab_type === 'payment' ? 'Monthly Service' : 'Donation'}
                      </p>
                    </div>
                    <div className="p-2 bg-gray-50 group-hover:bg-primary-50 rounded-lg transition-colors">
                      <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-orange-50 border border-orange-100 rounded-2xl text-left">
                <p className="text-sm text-orange-700 font-bold">No payment tabs found.</p>
                <p className="text-xs text-orange-600 mt-1">Please reach out to your administrator to assign a payment plan to your account.</p>
              </div>
            )}

            <div className="pt-4">
              <button
                onClick={handleSignOut}
                className="w-full py-3 bg-white text-gray-400 font-bold rounded-2xl hover:bg-gray-50 transition-all border border-gray-100 text-xs uppercase tracking-widest"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {selectedTab && (
          <MemberPaymentForm
            memberId={memberData.id}
            tabName={selectedTab.tab_name}
            tabType={selectedTab.tab_type}
            monthlyCost={selectedTab.monthly_cost}
            onSuccess={() => {
              setSelectedTab(null)
              refreshMemberData()
            }}
            onCancel={() => setSelectedTab(null)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-b-2xl shadow-xl w-full">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="relative p-6 sm:p-8 md:p-10">
          <div className="flex flex-col items-center justify-center gap-4">
            <h1 className="text-2xl xs:text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight text-center">
              {memberData.full_name}
            </h1>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-2 text-primary-100/90 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <Sparkles className="h-3.5 w-3.5 text-primary-200" />
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Member Dashboard</p>
              </div>
              <p className="text-[10px] sm:text-sm text-primary-200/90 font-mono tracking-widest opacity-80">ID: {memberData.membership_id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden px-4">
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setMobileTab('overview')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mobileTab === 'overview' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setMobileTab('history')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mobileTab === 'history' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
          >
            History
          </button>
          <button
            onClick={() => setMobileTab('notifications')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all relative ${mobileTab === 'notifications' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
          >
            Alerts
            {unreadCount > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Overview Tab (or all on Desktop) */}
          <div className={`${mobileTab === 'overview' ? 'block' : 'hidden md:block'} space-y-8`}>
            {/* Payment Tabs Section */}
            {tabs && tabs.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {tabs.map((tab) => (
                      <div
                        key={tab.id}
                        className="border border-gray-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                        onClick={() => setSelectedTab(tab)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-gray-900 text-base line-clamp-1">{tab.tab_name}</h3>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg shrink-0 ${tab.tab_type === 'payment'
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-primary-50 text-primary-600'
                            }`}>
                            {tab.tab_type === 'payment' ? 'Pay' : 'Give'}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedTab(tab)
                          }}
                          className="w-full mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-all"
                        >
                          {tab.tab_type === 'payment' ? 'Pay Now' : 'Donate'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center">
                <div className="p-2.5 bg-primary-500 rounded-lg mb-3">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                <p className="text-xl font-bold text-gray-900 capitalize">{memberData.status}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center">
                <div className="p-2.5 bg-green-500 rounded-lg mb-3">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Paid</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(displayTotalPaid)}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center">
                <div className="p-2.5 bg-orange-500 rounded-lg mb-3">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Unpaid</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(memberData.unpaid_balance || 0)}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center">
                <div className="p-2.5 bg-blue-500 rounded-lg mb-3">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Pay</p>
                <p className="text-xl font-bold text-gray-900">
                  {payments[0] ? format(new Date(payments[0].payment_date), 'MMM dd') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* History Tab (or all on Desktop) */}
          <div className={`${mobileTab === 'history' ? 'block' : 'hidden md:block'}`}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary-600" />
                  <h2 className="text-lg font-bold text-gray-900">Payment History</h2>
                </div>
                <Link href="/member/payment-history" className="text-xs font-bold text-primary-600 hover:text-primary-700">View All</Link>
              </div>
              <div className="p-5">
                {payments.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-gray-400 font-medium">No payments found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.slice(0, mobileTab === 'history' ? 10 : 3).map((payment) => (
                      <div key={payment.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-all group">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-bold text-gray-900">{formatCurrency(getMemberDisplayAmount(payment.amount))}</p>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-500 truncate mr-4">Ref: {payment.reference_number || 'N/A'}</p>
                          {payment.receipt && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownloadReceipt(payment.receipt?.pdf_url, payment.receipt?.receipt_number, payment.receipt?.pdf_storage_path)
                              }}
                              className="text-primary-600 hover:text-primary-700 transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notifications Tab (or all on Desktop) */}
          <div className={`${mobileTab === 'notifications' ? 'block' : 'hidden md:block'}`}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-primary-600" />
                  <h2 className="text-lg font-bold text-gray-900">Alerts</h2>
                </div>
                <Link href="/member/notifications" className="text-xs font-bold text-primary-600 hover:text-primary-700">View All</Link>
              </div>
              <div className="p-5">
                {!notifications || notifications.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-gray-400 font-medium">No new alerts</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.slice(0, mobileTab === 'notifications' ? 10 : 5).map((notification) => (
                      <div key={notification.id} className={`border rounded-xl p-4 transition-all ${!notification.is_read ? 'border-primary-100 bg-primary-50/30' : 'border-gray-50 hover:bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <h3 className={`text-sm font-bold ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>{notification.title}</h3>
                          <button
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{notification.message}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{format(new Date(notification.created_at), 'MMM dd, h:mm a')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
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
  )
}

