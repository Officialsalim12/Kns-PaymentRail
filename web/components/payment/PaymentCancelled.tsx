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
          }
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-4 relative overflow-hidden text-slate-900">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-50 rounded-full blur-[100px] opacity-60" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-50 rounded-full blur-[100px] opacity-60" />

      <div className="w-full max-w-xl relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/20 backdrop-blur-sm overflow-hidden transition-all duration-700 hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)]">
          
          {/* Header Section */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-12 text-white text-center relative overflow-hidden">
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
            
            <div className="relative z-10">
              <div className="inline-flex p-4 rounded-full bg-white/10 backdrop-blur-md mb-6 animate-in zoom-in-50 duration-500">
                <XCircle className="h-16 w-16 text-white" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight mb-2">Payment Cancelled</h1>
              <p className="text-amber-50/90 text-lg font-medium">No charges were made to your account</p>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-10 text-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-gray-50/80 rounded-3xl p-8 border border-gray-100 group transition-all hover:bg-white hover:shadow-lg hover:shadow-gray-100/50">
                <div className="text-left space-y-4">
                  <p className="text-slate-600 font-medium leading-relaxed">
                    The payment process was interrupted. This could be due to a manual cancellation or a timeout from the payment provider.
                  </p>
                  <div className="h-px bg-gray-200/50 w-full" />
                  <p className="text-sm text-slate-500 font-medium">
                    Don't worry, you can always return to your dashboard or attempt the payment again whenever you're ready.
                  </p>
                </div>
              </div>

              {paymentId && (
                <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                  <span>Reference ID</span>
                  <span className="text-gray-900 font-mono tracking-normal lowercase">{paymentId.substring(0, 12)}...</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="flex-1 px-8 py-5 bg-slate-100 text-slate-700 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all active:scale-[0.98] border border-slate-200/50"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={handleGoToDashboard}
                  className="flex-1 px-8 py-5 bg-primary-600 text-white rounded-2xl font-black text-lg hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/20 hover:shadow-primary-600/40 hover:-translate-y-1 active:scale-[0.98]"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="bg-gray-50/50 px-10 py-6 border-t border-gray-100/50 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-300 flex items-center justify-center gap-3">
              <span className="w-8 h-px bg-gray-200" />
              Secure Checkout via Fundflow
              <span className="w-8 h-px bg-gray-200" />
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

