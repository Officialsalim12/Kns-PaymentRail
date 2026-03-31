'use client'

import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/currency'
import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { createSecurePendingPayment } from '@/app/actions/member-payments'
import { getSiteUrl } from '@/lib/url'

interface Obligation {
  id: string
  tab_id?: string
  amount_due: number
  amount_paid: number
  status: string
  due_date: string
}

interface Props {
  memberId: string
  tabId?: string
  tabName: string
  tabType: 'payment' | 'donation' | 'obligation'
  monthlyCost: number | null
  obligations?: Obligation[]
  onSuccess: () => void
  onCancel: () => void
}

export default function MemberPaymentForm({ 
  memberId, 
  tabId,
  tabName, 
  tabType, 
  monthlyCost, 
  obligations = [],
  onSuccess, 
  onCancel 
}: Props) {
  const router = useRouter()
  const isSubmitting = useRef(false)
  const [formData, setFormData] = useState({
    paymentType: tabType === 'donation' ? 'donation' : tabType === 'payment' ? 'monthly' : 'one-time',
    months: tabType === 'payment' && monthlyCost ? '1' : '1',
    weeks: '1',
    amount: tabType === 'obligation' && monthlyCost ? monthlyCost.toString() : '',
    payment_date: new Date().toISOString().split('T')[0],
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Calculate outstanding obligations for this specific tab
  const tabObligations = tabId 
    ? obligations.filter(ob => ob.tab_id === tabId && ob.status !== 'paid')
    : []
  
  const unpaidCount = tabObligations.length
  const isSubscriptionTab = tabName.toLowerCase().includes('subscription') || tabName.toLowerCase().includes('dues')
  const isFlexible = tabType === 'donation' || tabType === 'obligation' // 'obligation' type here usually means manual entry one-time dues

  const calculateTotal = () => {
    if (formData.paymentType === 'monthly' && monthlyCost) {
      const months = parseInt(formData.months) || 0
      return (monthlyCost * months).toFixed(2)
    }
    if (formData.paymentType === 'weekly' && monthlyCost) {
      const weeks = parseInt(formData.weeks) || 0
      return (monthlyCost * weeks).toFixed(2)
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

      // Create a fresh, secure pending payment (prevents ID collisions and data leakage).
      const { payment_id } = await createSecurePendingPayment({
        memberId,
        amount: paymentAmount,
        description: paymentDescription,
        paymentType: formData.paymentType,
        quantity: formData.paymentType === 'monthly' ? parseInt(formData.months) : 
                  formData.paymentType === 'weekly' ? parseInt(formData.weeks) : 1
      })

      const paymentId = payment_id

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
            successUrl: `${getSiteUrl()}/api/handler/payment-success?payment_id=${paymentId}`,
            cancelUrl: `${getSiteUrl()}/api/handler/payment-cancelled?payment_id=${paymentId}`,
            metadata: {
              payment_id: paymentId,
              organization_id: member.organization_id,
              member_id: memberId,
              tab_name: tabName,
              tab_type: tabType,
              payment_type: formData.paymentType,
              // Only include quantity/price info for recurring-style payments (monthly/weekly)
              ...((formData.paymentType === 'monthly' || formData.paymentType === 'weekly') && monthlyCost ? {
                months: formData.paymentType === 'monthly' ? formData.months : "0",
                weeks: formData.paymentType === 'weekly' ? formData.weeks : "0",
                quantity: formData.paymentType === 'monthly' ? formData.months : formData.weeks,
                unit_price: monthlyCost.toString(),
                monthly_cost: monthlyCost.toString(),
              } : {}),
            },
          },
        }
      )

      if (checkoutError) {
        try {
          await supabase.from('payments').delete().eq('id', paymentId)
        } catch (e) { }
        throw new Error(checkoutError.message || 'Failed to create checkout')
      }

      if (!checkoutData?.checkoutSession) {
        try {
          await supabase.from('payments').delete().eq('id', paymentId)
        } catch (e) { }
        throw new Error('Invalid checkout session')
      }

      if (checkoutData.checkoutSession.url) {
        window.location.href = checkoutData.checkoutSession.url
      } else {
        // Clean up the payment if checkout URL is missing
        try {
          await supabase
            .from('payments')
            .delete()
            .eq('id', paymentId)
        } catch (cleanupError) {
          console.error('Error cleaning up payment after checkout failure:', cleanupError)
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
              {tabType === 'payment' ? 'Checkout' : tabType === 'obligation' ? 'Pay Balance' : 'Donation'}
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
              <div className="space-y-4">
                {!(tabName.toLowerCase().includes('subscription') || tabName.toLowerCase().includes('dues')) && (
                  <div>
                    <label htmlFor="paymentType" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                      Payment Type *
                    </label>
                    <select
                      id="paymentType"
                      className="w-full px-5 py-3.5 text-base border border-gray-100 bg-gray-50/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600 appearance-none cursor-pointer font-bold transition-all"
                      value={formData.paymentType}
                      onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                    >
                      <option value="monthly">Monthly Pay</option>
                      <option value="weekly">Weekly Pay</option>
                      <option value="one-time">One-Time Pay</option>
                    </select>
                  </div>
                )}

                {isSubscriptionTab && unpaidCount > 1 && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, months: unpaidCount.toString(), weeks: unpaidCount.toString() })}
                    className="w-full py-2 bg-orange-50 text-orange-700 text-xs font-bold rounded-xl border border-orange-100 hover:bg-orange-100 transition-all active:scale-[0.98]"
                  >
                    Pay All Owed ({unpaidCount} {formData.paymentType === 'monthly' ? 'Months' : 'Weeks'})
                  </button>
                )}

                {formData.paymentType === 'monthly' && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="months" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Duration (Months) *
                      </label>
                      {isSubscriptionTab && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${unpaidCount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {unpaidCount > 0 ? `${unpaidCount} Months Owed` : 'Paid Up'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <select
                        id="months"
                        required
                        className="w-full px-5 py-3.5 text-base border border-gray-100 bg-gray-50/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600 appearance-none cursor-pointer font-bold transition-all"
                        value={formData.months}
                        onChange={(e) => setFormData({ ...formData, months: e.target.value })}
                      >
                        {Array.from({ length: isSubscriptionTab ? Math.max(1, unpaidCount) : 12 }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num.toString()}>
                            {num} {num === 1 ? 'Month' : 'Months'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {formData.paymentType === 'weekly' && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="weeks" className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Duration (Weeks) *
                      </label>
                      {isSubscriptionTab && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${unpaidCount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          {unpaidCount > 0 ? `${unpaidCount} Weeks Owed` : 'Paid Up'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <select
                        id="weeks"
                        required
                        className="w-full px-5 py-3.5 text-base border border-gray-100 bg-gray-50/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600 appearance-none cursor-pointer font-bold transition-all"
                        value={formData.weeks}
                        onChange={(e) => setFormData({ ...formData, weeks: e.target.value })}
                      >
                        {Array.from({ length: isSubscriptionTab ? Math.max(1, unpaidCount) : 12 }, (_, i) => i + 1).map((num) => (
                          <option key={num} value={num.toString()}>
                            {num} {num === 1 ? 'Week' : 'Weeks'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {formData.paymentType === 'one-time' && (
                  <div>
                    <label htmlFor="amount" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                      Amount to Pay *
                    </label>
                    <input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      className="w-full px-5 py-3.5 text-base border border-gray-100 bg-gray-50/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600 font-bold transition-all"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                )}

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
                  <span>
                    {formData.paymentType === 'monthly' ? `${formData.months} × ${formatCurrency(monthlyCost)}` : 
                     formData.paymentType === 'weekly' ? `${formData.weeks} × ${formatCurrency(monthlyCost)}` : 
                     formatCurrency(parseFloat(totalAmount))}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-2">
                {tabType === 'donation' ? 'Donation Amount *' : 'Amount to Pay *'}
              </label>
              <div className="relative">
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="w-full pl-4 pr-12 py-3 text-sm sm:text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-bold"
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
              {loading ? 'Processing...' : `Confirm ${tabType === 'donation' ? 'Donation' : 'Payment'}`}
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

