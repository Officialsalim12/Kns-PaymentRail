'use client'

import { useState } from 'react'
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
    setError(null)
    setLoading(true)

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
            paymentId: payment.id,
            amount: paymentAmount,
            currency: 'SLE',
            description: paymentDescription,
            successUrl: typeof window !== 'undefined'
              ? `${window.location.origin}/payment-success?payment_id=${payment.id}`
              : `/payment-success?payment_id=${payment.id}`,
            cancelUrl: typeof window !== 'undefined'
              ? `${window.location.origin}/payment-cancelled?payment_id=${payment.id}`
              : `/payment-cancelled?payment_id=${payment.id}`,
            metadata: {
              payment_id: payment.id,
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
        try {
          await supabase.from('payments').delete().eq('id', payment.id)
        } catch (e) { }
        throw new Error(checkoutError.message || 'Failed to create checkout')
      }

      if (!checkoutData?.checkoutSession) {
        try {
          await supabase.from('payments').delete().eq('id', payment.id)
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
            .eq('id', payment.id)
        } catch (cleanupError) {
          console.error('Error cleaning up payment after checkout failure:', cleanupError)
        }
        throw new Error('Checkout session URL not received')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full my-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 pr-2">
            {tabType === 'payment' ? 'Pay Now' : 'Donate Here'} - {tabName}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
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
                <label htmlFor="months" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Number of Months *
                </label>
                <select
                  id="months"
                  required
                  className="w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  value={formData.months}
                  onChange={(e) => setFormData({ ...formData, months: e.target.value })}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                    <option key={num} value={num.toString()}>
                      {num} {num === 1 ? 'Month' : 'Months'}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs sm:text-sm text-gray-500">
                  Monthly cost: {formatCurrency(monthlyCost)}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                  <span className="text-lg sm:text-xl font-bold text-blue-700">
                    {formatCurrency(parseFloat(totalAmount))}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 break-words">
                  {formData.months} {parseInt(formData.months || '0') === 1 ? 'month' : 'months'} × {formatCurrency(monthlyCost)}
                </p>
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1.5">
                Amount *
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          )}

          <div>
            <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-1.5">
              Payment Date *
            </label>
            <input
              id="payment_date"
              type="date"
              required
              className="w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm sm:text-base font-medium transition-colors"
            >
              {loading ? 'Processing...' : tabType === 'payment' ? 'Submit Payment' : 'Submit Donation'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm sm:text-base font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

