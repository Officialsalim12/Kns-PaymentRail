'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { invokeEdgeFunction } from '@/lib/supabase/functions'

interface Member {
  id: string
  full_name: string
  membership_id: string
}

interface Props {
  members: Member[]
  onSuccess: (paymentId: string) => void
  onCancel: () => void
}

export default function PaymentForm({ members, onSuccess, onCancel }: Props) {
  const router = useRouter()
  const isSubmitting = useRef(false)
  const [formData, setFormData] = useState({
    member_id: '',
    amount: '',
    balance: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'afrimoney',
    description: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) {
        throw new Error('Organization not found')
      }

      const balanceToAdd = formData.balance && parseFloat(formData.balance) > 0
        ? parseFloat(formData.balance)
        : 0

      const paymentDescription = balanceToAdd > 0
        ? (formData.description
          ? `${formData.description} [BALANCE_ADDED:${balanceToAdd}]`
          : `[BALANCE_ADDED:${balanceToAdd}]`)
        : formData.description

      const paymentAmount = parseFloat(formData.amount)

      if (!paymentAmount || isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error('Please enter a valid payment amount')
      }

      // Check for an existing pending payment for the same member, amount, and description
      // created within the last 5 minutes to prevent duplicates
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('member_id', formData.member_id)
        .eq('amount', paymentAmount)
        .eq('description', paymentDescription)
        .eq('payment_status', 'pending')
        .eq('organization_id', profile.organization_id)
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
            organization_id: profile.organization_id,
            member_id: formData.member_id,
            amount: paymentAmount,
            payment_date: new Date().toISOString(),
            payment_method: formData.payment_method,
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
            description: paymentDescription || `Payment for member`,
            successUrl: typeof window !== 'undefined'
              ? `${window.location.origin}/payment-success?payment_id=${paymentId}`
              : `/payment-success?payment_id=${paymentId}`,
            cancelUrl: typeof window !== 'undefined'
              ? `${window.location.origin}/payment-cancelled?payment_id=${paymentId}`
              : `/payment-cancelled?payment_id=${paymentId}`,
            metadata: {
              payment_id: paymentId,
              organization_id: profile.organization_id,
              member_id: formData.member_id,
            },
          },
        }
      )

      if (checkoutError) {
        // Only delete if we JUST created it (not if we reused an existing one)
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
        throw new Error(checkoutError.message || 'Failed to create checkout session')
      }

      if (!checkoutData?.checkoutSession) {
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
        throw new Error('Failed to create checkout session: Invalid response from payment service')
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
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Create Payment</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <label htmlFor="member_id" className="block text-sm font-medium text-gray-700">
            Member *
          </label>
          <select
            id="member_id"
            name="member_id"
            required
            className="mt-1 block w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            value={formData.member_id}
            onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
          >
            <option value="">Select a member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.membership_id})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Payment Amount *
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="mt-1 block w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />
          <p className="mt-1 text-xs text-gray-500">Amount for this payment</p>
        </div>

        <div>
          <label htmlFor="balance" className="block text-sm font-medium text-gray-700">
            Add to Balance (Optional)
          </label>
          <input
            id="balance"
            name="balance"
            type="number"
            step="0.01"
            min="0"
            className="mt-1 block w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={formData.balance}
            onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-gray-500">Additional balance to add to member's account (separate from payment amount)</p>
        </div>

        <div>
          <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700">
            Payment Date *
          </label>
          <input
            id="payment_date"
            name="payment_date"
            type="date"
            required
            className="mt-1 block w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={formData.payment_date}
            onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700">
            Payment Method *
          </label>
          <select
            id="payment_method"
            name="payment_method"
            required
            className="mt-1 block w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
          >
            <option value="afrimoney">Afrimoney</option>
            <option value="orangemoney">Orangemoney</option>
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="mt-1 block w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm sm:text-base font-medium transition-colors"
          >
            {loading ? 'Creating...' : 'Create Payment'}
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
  )
}

