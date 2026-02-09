'use client'

import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/currency'
import { invokeEdgeFunction } from '@/lib/supabase/functions'

interface Props {
  memberId: string
  tabName: string
  tabType: 'payment' | 'donation'
  monthlyCost: number | null
  onSuccess: () => void
  onCancel: () => void
}

export default function MemberPaymentForm({ memberId, tabName, tabType, monthlyCost, onSuccess, onCancel }: Props) {
  const router = useRouter()
  const isSubmitting = useRef(false)
  const [formData, setFormData] = useState({
    months: tabType === 'payment' && monthlyCost ? '1' : '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const calculateTotal = () => {
    if (tabType === 'payment' && monthlyCost && formData.months) {
      const months = parseInt(formData.months) || 0
      return (monthlyCost * months).toFixed(2)
    }
    return formData.amount
  }

  const totalAmount = calculateTotal()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent double submissions via the ref
    if (isSubmitting.current) return

    setError(null)
    setLoading(true)
    isSubmitting.current = true

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('organization_id')
        .eq('id', memberId)
        .single()

      if (memberError || !member) {
        throw new Error('Member not found')
      }

      const paymentDescription = tabName

      const paymentAmount = tabType === 'payment' && monthlyCost && formData.months
        ? parseFloat(totalAmount)
        : parseFloat(formData.amount)

      if (!paymentAmount || isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error('Please enter a valid payment amount')
      }

      // Check for an existing pending payment for the same member, amount, and description
      // created within the last 5 minutes to prevent duplicates
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('member_id', memberId)
        .eq('amount', paymentAmount)
        .eq('description', paymentDescription)
        .eq('payment_status', 'pending')
        .eq('organization_id', member.organization_id)
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      let paymentId: string

      if (existingPayment) {
        console.log('Reusing existing pending payment:', existingPayment.id)
        paymentId = existingPayment.id
      } else {
        // Insert new pending payment record
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            organization_id: member.organization_id,
            member_id: memberId,
            amount: paymentAmount,
            payment_date: new Date().toISOString(),
            payment_method: 'online',
            description: paymentDescription,
            created_by: user.id,
            payment_status: 'pending',
          })
          .select()
          .single()

        if (paymentError) {
          throw new Error(paymentError.message)
        }

        paymentId = payment.id
      }

      const { data: checkoutData, error: checkoutError } = await invokeEdgeFunction<{
        success: boolean
        checkoutSession?: {
          id: string
          url: string
        }
        error?: string
      }>(
        supabase,
        'create-monime-checkout',
        {
          body: {
            paymentId: paymentId,
            amount: paymentAmount,
            currency: 'SLE',
            description: paymentDescription,
            successUrl: typeof window !== 'undefined'
              ? `${window.location.origin}/payment-success?payment_id=${paymentId}`
              : `/payment-success?payment_id=${paymentId}`,
            cancelUrl: typeof window !== 'undefined'
              ? `${window.location.origin}/payment-cancelled?payment_id=${paymentId}`
              : `/payment-cancelled?payment_id=${paymentId}`,
            metadata: {
              payment_id: paymentId,
              organization_id: member.organization_id,
              member_id: memberId,
              tab_name: tabName,
              tab_type: tabType,
              ...(tabType === 'payment' && monthlyCost && formData.months ? {
                months: formData.months,
                monthly_cost: monthlyCost.toString(),
                quantity: formData.months,
                unit_price: monthlyCost.toString(),
              } : {}),
            },
          },
        }
      )

      if (checkoutError) {
        // Only delete if we JUST created it (not if we reused an existing one)
        if (!existingPayment) {
          try {
            await supabase.from('payments').delete().eq('id', paymentId)
          } catch (e) { }
        }
        throw new Error(checkoutError.message || 'Failed to create checkout')
      }

      if (!checkoutData?.checkoutSession) {
        if (!existingPayment) {
          try {
            await supabase.from('payments').delete().eq('id', paymentId)
          } catch (e) { }
        }
        throw new Error('Invalid checkout session')
      }

      if (checkoutData.checkoutSession.url) {
        window.location.href = checkoutData.checkoutSession.url
      } else {
        // Clean up the payment if checkout URL is missing and we just created it
        if (!existingPayment) {
          try {
            await supabase
              .from('payments')
              .delete()
              .eq('id', paymentId)
          } catch (cleanupError) {
            console.error('Error cleaning up payment after checkout failure:', cleanupError)
          }
        }
        throw new Error('Checkout session URL not received')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
      isSubmitting.current = false
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-md w-full animate-in slide-in-from-bottom duration-300">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-3xl sm:rounded-t-2xl">
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">
              {tabType === 'payment' ? 'Checkout' : 'Donation'}
            </h3>
            <p className="text-xs text-gray-500 font-medium mt-0.5">{tabName}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 rounded-xl transition-all"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {tabType === 'payment' && monthlyCost ? (
            <>
              <div>
                <label htmlFor="months" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Duration *
                </label>
                <div className="relative">
                  <select
                    id="months"
                    required
                    className="w-full px-5 py-3.5 text-base border border-gray-100 bg-gray-50/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600 appearance-none cursor-pointer font-bold transition-all"
                    value={formData.months}
                    onChange={(e) => setFormData({ ...formData, months: e.target.value })}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                      <option key={num} value={num.toString()}>
                        {num} {num === 1 ? 'Month' : 'Months'}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                    <span className="text-xs font-bold uppercase tracking-widest">Select</span>
                  </div>
                </div>
                <p className="mt-2.5 text-xs text-primary-600 font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-pulse"></span>
                  Unit Price: {formatCurrency(monthlyCost)}
                </p>
              </div>
              <div className="bg-primary-50/50 rounded-2xl p-6 border border-primary-100/50">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Total Payable</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-gray-900 leading-none">
                      {formatCurrency(parseFloat(totalAmount))}
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-primary-100/50 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>Breakdown</span>
                  <span>{formData.months} × {formatCurrency(monthlyCost)}</span>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-2">
                Amount to Pay *
              </label>
              <div className="relative">
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="w-full pl-4 pr-12 py-3 text-sm sm:text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <span className="text-gray-500 sm:text-sm font-bold">SLE</span>
                </div>
              </div>
            </div>
          )}

          {/* Hidden Date - Auto Stamped */}
          <input
            type="hidden"
            name="payment_date"
            value={new Date().toISOString().split('T')[0]}
          />

          <div className="flex flex-col gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-primary-100 hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : `Confirm ${tabType === 'payment' ? 'Payment' : 'Donation'}`}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

