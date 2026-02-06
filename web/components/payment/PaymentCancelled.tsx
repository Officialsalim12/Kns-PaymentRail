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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-white p-4">
      <div className="main-container max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-yellow-100 transition-all duration-500 hover:shadow-2xl">
          <div className="bg-yellow-600 p-8 text-white text-center relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <XCircle className="h-20 w-20 mx-auto mb-4" />
            <h1 className="text-3xl font-extrabold tracking-tight">Payment Cancelled</h1>
            <p className="mt-2 text-yellow-50 opacity-90 font-medium">Operation aborted at your request</p>
          </div>

          <div className="p-8 text-center">
            <div className="space-y-6">
              <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-100 inline-block w-full">
                <p className="text-sm text-yellow-700 font-bold uppercase tracking-wider mb-2">Notice</p>
                <p className="text-gray-600 leading-relaxed font-medium">
                  Your payment was cancelled. No charges were made to your account. You can return to your dashboard or try making the payment again.
                </p>
              </div>

              {paymentId && (
                <p className="text-xs text-gray-400 font-medium">
                  Reference ID: <span className="font-mono">{paymentId.substring(0, 8)}...</span>
                </p>
              )}

              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-[0.98]"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={handleGoToDashboard}
                  className="flex-1 px-6 py-4 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg hover:shadow-primary-200 transform hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center text-xs text-gray-400 font-medium">
            Powered by KNS MultiRail Secure Payments
          </div>
        </div>
      </div>
    </div>
  )
}

