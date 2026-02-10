'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2, Search, X, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PaymentForm from './PaymentForm'
import { formatCurrency } from '@/lib/currency'
import { useRouter } from 'next/navigation'
import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { getDisplayAmount } from '@/lib/utils/payment-display'

interface Member {
  id: string
  full_name: string
  membership_id: string
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  payment_status?: string
  reference_number: string
  description: string
  organization_id?: string
  member_id?: string
  member: {
    full_name: string
    membership_id: string
  }
}

interface Props {
  members: Member[]
  payments: Payment[]
}

export default function PaymentManagement({ members: initialMembers, payments: initialPayments }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [payments, setPayments] = useState(initialPayments)
  const [loading, setLoading] = useState(false)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [syncingPaymentId, setSyncingPaymentId] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  // Get organization ID and set up real-time subscriptions
  useEffect(() => {
    if (typeof window === 'undefined') return

    let paymentsChannel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null
    const supabase = createClient()

    const setupSubscriptions = async () => {
      // Get current user and organization ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) return

      setOrganizationId(profile.organization_id)

      // Subscribe to payment changes for this organization
      paymentsChannel = supabase
        .channel(`payment-management-${profile.organization_id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments',
            filter: `organization_id=eq.${profile.organization_id}`,
          },
          (payload) => {
            console.log('Payment change detected:', payload)
            router.refresh()
          }
        )
        .subscribe()
    }

    setupSubscriptions()

    return () => {
      if (paymentsChannel) {
        supabase.removeChannel(paymentsChannel)
      }
    }
  }, [router])

  const handlePaymentCreated = async (paymentId: string) => {
    setLoading(true)
    const supabase = createClient()
    const { data: newPayment } = await supabase
      .from('payments')
      .select('*, member:members(full_name, membership_id)')
      .eq('id', paymentId)
      .single()

    if (newPayment) {
      setPayments([newPayment, ...payments])

      // Log activity
      const { logActivityClient } = await import('@/lib/activity-log-client')
      await logActivityClient({
        user_id: '', // Will be filled by logActivityClient
        action: 'payment.created',
        entity_type: 'payment',
        entity_id: paymentId,
        organization_id: newPayment.organization_id, // Use payment's organization_id
        description: `Created payment of ${newPayment.amount} for member ${newPayment.member?.full_name || 'Unknown'}`,
        metadata: {
          amount: newPayment.amount,
          payment_method: newPayment.payment_method,
          member_id: newPayment.member_id,
        },
      })
    }

    setShowForm(false)
    setLoading(false)
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return
    }

    setDeletingPaymentId(paymentId)
    try {
      const supabase = createClient()
      const { data: payment } = await supabase
        .from('payments')
        .select('member_id, amount, description, organization_id')
        .eq('id', paymentId)
        .single()

      if (!payment) {
        throw new Error('Payment not found')
      }

      // Delete receipt generation logs first (foreign key constraint)
      const { error: logsError } = await supabase
        .from('receipt_generation_logs')
        .delete()
        .eq('payment_id', paymentId)

      if (logsError) {
        console.error('Error deleting receipt generation logs:', logsError)
      }

      // Delete receipts
      const { error: receiptError } = await supabase
        .from('receipts')
        .delete()
        .eq('payment_id', paymentId)

      if (receiptError) {
        console.error('Error deleting receipt:', receiptError)
      }

      // Finally delete the payment
      const { error: paymentError } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId)

      if (paymentError) {
        throw new Error(`Failed to delete payment: ${paymentError.message}`)
      }

      if (payment.member_id && payment.amount) {
        const { data: allRemainingPayments, error: allPaymentsError } = await supabase
          .from('payments')
          .select('amount, description, payment_status')
          .eq('member_id', payment.member_id)

        if (allPaymentsError) {
          console.error('Error fetching remaining payments:', allPaymentsError)
        } else {
          // Filter only completed payments for total_paid calculation
          const remainingPayments = allRemainingPayments?.filter(p => {
            const status = p.payment_status || (p as any).status
            return status === 'completed' || !status
          }) || []

          // Recalculate total_paid from actual completed payments
          const newTotalPaid = remainingPayments.reduce((sum, p) => {
            const amount = typeof p.amount === 'string' ? parseFloat(p.amount) : (p.amount || 0)
            return sum + amount
          }, 0)

          let newBalance = 0
          if (allRemainingPayments && allRemainingPayments.length > 0) {
            allRemainingPayments.forEach((p) => {
              if (p.description) {
                const balanceMatch = p.description.match(/\[BALANCE_ADDED:\s*([\d]+\.?[\d]*)\]/i)
                if (balanceMatch && balanceMatch[1]) {
                  const balanceAmount = parseFloat(balanceMatch[1])
                  if (!isNaN(balanceAmount)) {
                    newBalance += balanceAmount
                  }
                }
              }
            })
          }

          console.log('Recalculating member totals:', {
            memberId: payment.member_id,
            remainingPaymentsCount: remainingPayments.length,
            allPaymentsCount: allRemainingPayments?.length || 0,
            newTotalPaid,
            newBalance
          })

          const updateData: { total_paid: number; unpaid_balance?: number } = {
            total_paid: Math.max(0, newTotalPaid)
          }

          try {
            updateData.unpaid_balance = Math.max(0, newBalance)
          } catch (e) {
            console.warn('unpaid_balance column may not exist, skipping balance update')
          }

          const { error: memberUpdateError, data: updateResult } = await supabase
            .from('members')
            .update(updateData)
            .eq('id', payment.member_id)
            .select()

          if (memberUpdateError) {
            console.error('Error updating member totals:', memberUpdateError)

            // If unpaid_balance column doesn't exist, try updating only total_paid
            if (memberUpdateError.message.includes('unpaid_balance') || memberUpdateError.message.includes('schema cache')) {
              console.log('Retrying with only total_paid...')
              const { error: retryError } = await supabase
                .from('members')
                .update({ total_paid: Math.max(0, newTotalPaid) })
                .eq('id', payment.member_id)

              if (retryError) {
                alert(`Warning: Payment deleted but failed to update member total_paid: ${retryError.message}`)
              } else {
                console.log('Member total_paid updated successfully (balance column not available)')
              }
            } else {
              alert(`Warning: Payment deleted but failed to update member totals: ${memberUpdateError.message}`)
            }
          } else {
            console.log('Member totals recalculated successfully:', updateResult)
          }
        }
      }

      // Log activity
      const { logActivityClient } = await import('@/lib/activity-log-client')
      await logActivityClient({
        user_id: '', // Will be filled by logActivityClient
        action: 'payment.deleted',
        entity_type: 'payment',
        entity_id: paymentId,
        organization_id: payment.organization_id, // Use payment's organization_id
        description: `Deleted payment of ${payment.amount}${payment.description ? `: ${payment.description}` : ''}`,
        metadata: {
          amount: payment.amount,
          member_id: payment.member_id,
        },
      })

      // Remove payment from local state immediately
      setPayments(payments.filter(p => p.id !== paymentId))

      // Refresh the page to ensure database state is synced
      router.refresh()
    } catch (error: any) {
      alert(`Error deleting payment: ${error.message}`)
      // Re-fetch payments to ensure UI matches database
      router.refresh()
    } finally {
      setDeletingPaymentId(null)
    }
  }

  const handleSyncPayment = async (paymentId: string) => {
    if (!confirm('This will check the payment status from Monime and update it if completed. Continue?')) {
      return
    }

    setSyncingPaymentId(paymentId)
    try {
      const supabase = createClient()

      const { data, error } = await invokeEdgeFunction(
        supabase,
        'sync-payment-status',
        {
          body: { paymentId },
        }
      )

      if (error) {
        throw new Error(error.message || 'Failed to sync payment status')
      }

      if (data?.success) {
        // Log activity
        const { logActivityClient } = await import('@/lib/activity-log-client')
        await logActivityClient({
          user_id: '', // Will be filled by logActivityClient
          action: 'payment.synced',
          entity_type: 'payment',
          entity_id: paymentId,
          description: 'Synced payment status from Monime',
        })

        alert(data.message || 'Payment status synced successfully!')
        router.refresh()
      } else {
        throw new Error(data?.error || 'Sync failed')
      }
    } catch (error: any) {
      alert(`Error syncing payment: ${error.message}`)
    } finally {
      setSyncingPaymentId(null)
    }
  }

  // Filter payments based on search query
  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments

    const query = searchQuery.toLowerCase().trim()
    return payments.filter((payment) => {
      const memberNameMatch = payment.member.full_name?.toLowerCase().includes(query)
      const memberIdMatch = payment.member.membership_id?.toLowerCase().includes(query)
      const referenceMatch = payment.reference_number?.toLowerCase().includes(query)
      const amountMatch = payment.amount?.toString().includes(query)
      const descriptionMatch = payment.description?.toLowerCase().includes(query)

      return memberNameMatch || memberIdMatch || referenceMatch || amountMatch || descriptionMatch
    })
  }, [payments, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payment Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm sm:text-base"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          Create Payment
        </button>
      </div>

      {showForm && (
        <PaymentForm
          members={initialMembers}
          onSuccess={handlePaymentCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">All Payments</h2>
            <div className="text-xs sm:text-sm text-gray-500">
              {searchQuery ? (
                <span>
                  Showing {filteredPayments.length} of {payments.length} payments
                </span>
              ) : (
                <span>Total Payments: {payments.length}</span>
              )}
            </div>
          </div>
          {/* Search Box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by member name, ID, reference..."
              className="block w-full pl-10 pr-10 py-2 text-sm sm:text-base border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {searchQuery ? `No payments found matching "${searchQuery}"` : 'No payments yet'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4 px-4 bg-gray-50/50 py-4">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{payment.member.full_name}</h3>
                      <p className="text-[10px] text-primary-600 font-bold tracking-wider mt-0.5 uppercase">ID: {payment.member.membership_id}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${payment.payment_status === 'completed'
                      ? 'bg-green-50 text-green-700'
                      : payment.payment_status === 'processing'
                        ? 'bg-yellow-50 text-yellow-700'
                        : payment.payment_status === 'failed'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gray-50 text-gray-700'
                      }`}>
                      {payment.payment_status || 'pending'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Date</p>
                      <p className="text-gray-900">{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Amount</p>
                      <p className="font-bold text-gray-900">{formatCurrency(getDisplayAmount(payment.amount, payment.payment_status))}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Method</p>
                      <p className="text-gray-900">{payment.payment_method}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Reference</p>
                      <p className="text-gray-900 font-mono tracking-tighter truncate" title={payment.reference_number}>{payment.reference_number}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                    {payment.payment_method === 'monime' && payment.payment_status !== 'completed' && (
                      <button
                        onClick={() => handleSyncPayment(payment.id)}
                        disabled={syncingPaymentId === payment.id}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                        title="Sync payment status from Monime"
                      >
                        <RefreshCw className={`h-4 w-4 ${syncingPaymentId === payment.id ? 'animate-spin' : ''}`} />
                        {syncingPaymentId === payment.id ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePayment(payment.id)}
                      disabled={deletingPaymentId === payment.id}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                      title="Delete payment"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingPaymentId === payment.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block responsive-table-container">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Member</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{payment.member.full_name}</div>
                          <div className="text-[11px] text-gray-500 font-mono tracking-tighter">{payment.member.membership_id}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{formatCurrency(getDisplayAmount(payment.amount, payment.payment_status))}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{payment.payment_method}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${payment.payment_status === 'completed'
                            ? 'bg-green-50 text-green-700'
                            : payment.payment_status === 'processing'
                              ? 'bg-yellow-50 text-yellow-700'
                              : payment.payment_status === 'failed'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-gray-50 text-gray-700'
                            }`}>
                            {payment.payment_status || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-500 font-mono tracking-tighter max-w-[120px] truncate" title={payment.reference_number}>{payment.reference_number}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-bold">
                          <div className="flex flex-wrap gap-2">
                            {payment.payment_method === 'monime' && payment.payment_status !== 'completed' && (
                              <button
                                onClick={() => handleSyncPayment(payment.id)}
                                disabled={syncingPaymentId === payment.id}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Sync payment status from Monime"
                              >
                                <RefreshCw className={`h-4 w-4 ${syncingPaymentId === payment.id ? 'animate-spin' : ''}`} />
                                {syncingPaymentId === payment.id ? 'Syncing...' : 'Sync'}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePayment(payment.id)}
                              disabled={deletingPaymentId === payment.id}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete payment"
                            >
                              <Trash2 className="h-4 w-4" />
                              {deletingPaymentId === payment.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

