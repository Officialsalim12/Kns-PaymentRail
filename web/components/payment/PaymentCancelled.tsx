'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function PaymentCancelled() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [dashboardPath, setDashboardPath] = useState('/admin')
  const [mounted, setMounted] = useState(false)
  const [cleanupDone, setCleanupDone] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      if (searchParams) {
        const paymentIdParam = searchParams.get('payment_id')
        if (paymentIdParam) {
          setPaymentId(paymentIdParam)
        }
      }
    } catch (error) {
      console.error('Error reading search params:', error)
    }
  }, [searchParams])

  useEffect(() => {
    if (!mounted || !paymentId || cleanupDone) return
    
    const cleanupPayment = async () => {
      try {
        const supabase = createClient()
        
        // Check if payment exists and is still pending
        const { data: payment, error: fetchError } = await supabase
          .from('payments')
          .select('id, payment_status')
          .eq('id', paymentId)
          .maybeSingle()

        if (fetchError) {
          console.error('Error fetching payment:', fetchError)
          return
        }

        // Only delete if payment exists and is still pending (not completed)
        if (payment && payment.payment_status === 'pending') {
          // Delete related records first (foreign key constraints)
          // Delete receipt generation logs
          await supabase
            .from('receipt_generation_logs')
            .delete()
            .eq('payment_id', paymentId)

          // Delete receipts
          await supabase
            .from('receipts')
            .delete()
            .eq('payment_id', paymentId)

          // Finally delete the payment
          const { error: deleteError } = await supabase
            .from('payments')
            .delete()
            .eq('id', paymentId)

          if (deleteError) {
            console.error('Error deleting cancelled payment:', deleteError)
          } else {
            console.log('Cancelled payment deleted successfully:', paymentId)
          }
        } else if (payment && payment.payment_status !== 'pending') {
          // Payment is already completed or has another status, don't delete
          console.log('Payment already has status:', payment.payment_status, '- not deleting')
        }
      } catch (error) {
        console.error('Error during payment cleanup:', error)
      } finally {
        setCleanupDone(true)
      }
    }

    cleanupPayment()
  }, [mounted, paymentId, cleanupDone])

  useEffect(() => {
    if (!mounted) return
    const determinePath = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
          setDashboardPath(profile?.role === 'member' ? '/member' : '/admin')
        } else {
          setDashboardPath('/admin')
        }
      } catch (error) {
        console.error('Error determining dashboard path:', error)
        setDashboardPath('/admin')
      }
    }
    determinePath()
  }, [mounted])

  const handleGoBack = () => {
    try {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back()
      } else {
        const path = dashboardPath && dashboardPath.startsWith('/') ? dashboardPath : '/admin'
        router.push(path)
      }
    } catch (error) {
      console.error('Navigation error:', error)
      // Fallback to admin if navigation fails
      router.push('/admin')
    }
  }

  const handleGoToDashboard = () => {
    try {
      const path = dashboardPath && dashboardPath.startsWith('/') ? dashboardPath : '/admin'
      router.push(path)
    } catch (error) {
      console.error('Navigation error:', error)
      // Fallback to admin if navigation fails
      router.push('/admin')
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-yellow-600 mb-4">
            <XCircle className="h-16 w-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
          <p className="text-gray-600 mb-6">
            Your payment was cancelled. No charges were made. You can try again anytime.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-yellow-600 mb-4">
          <XCircle className="h-16 w-16 mx-auto" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
        <p className="text-gray-600 mb-6">
          Your payment was cancelled. No charges were made. You can try again anytime.
        </p>
        {paymentId && (
          <p className="text-sm text-gray-500 mb-6">
            Payment ID: {paymentId.substring(0, 8)}...
          </p>
        )}
        <div className="flex gap-4 justify-center">
          <button
            type="button"
            onClick={handleGoBack}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={handleGoToDashboard}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

