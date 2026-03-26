'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { invokeEdgeFunction } from '@/lib/supabase/functions'

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [dashboardPath, setDashboardPath] = useState('/admin')
  const [mounted, setMounted] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Safely get payment_id
  const paymentId = searchParams?.get('payment_id')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const handlePaymentSuccess = async () => {
      try {
        let supabase
        try {
          supabase = createClient()
        } catch (clientError: any) {
          console.error('Failed to create Supabase client:', clientError)
          // Set default path and redirect if client creation fails
          setDashboardPath('/admin')
          redirectTimerRef.current = setTimeout(() => {
            router.push('/admin')
          }, 3000)
          return
        }

        // const paymentId = searchParams.get('payment_id') // Already got this safely above

        // Sync payment status if payment_id is provided
        if (paymentId) {
          setSyncing(true)
          try {
            // Retry a few times because some providers finalize asynchronously.
            for (let attempt = 1; attempt <= 3; attempt++) {
              const { data, error } = await invokeEdgeFunction(
                supabase,
                'sync-payment-status',
                {
                  body: { paymentId },
                }
              )

              if (error) {
                console.error(`Error syncing payment (attempt ${attempt}):`, error)
              }

              const status =
                (data as any)?.paymentStatus ||
                (data as any)?.monimePaymentStatus ||
                null

              if (status === 'completed' || (data as any)?.success) {
                break
              }

              if (attempt < 3) {
                await new Promise((resolve) => setTimeout(resolve, 1500))
              }
            }
          } catch (syncError) {
            console.error('Error syncing payment status:', syncError)
          } finally {
            setSyncing(false)
          }
        }

        const { data: { user } } = await supabase.auth.getUser()

        let determinedPath = '/admin' // Default path

        if (user) {
          try {
            const { data: profile } = await supabase
              .from('users')
              .select('role')
              .eq('id', user.id)
              .single()

            if (profile?.role === 'member') {
              determinedPath = '/member'
            } else {
              determinedPath = '/admin'
            }
          } catch (profileError) {
            console.error('Error fetching user profile:', profileError)
            // Default to admin if profile fetch fails
            determinedPath = '/admin'
          }
        }

        // Set the dashboard path
        setDashboardPath(determinedPath)

        // Clear any existing timer
        if (redirectTimerRef.current) {
          clearTimeout(redirectTimerRef.current)
        }

        // Set up redirect timer after path is determined
        redirectTimerRef.current = setTimeout(() => {
          const path = determinedPath && determinedPath.startsWith('/') ? determinedPath : '/admin'
          router.push(path)
        }, 3000)
      } catch (error) {
        console.error('Error handling payment success:', error)
        // Ensure we have a valid path even on error
        setDashboardPath('/admin')

        // Clear any existing timer
        if (redirectTimerRef.current) {
          clearTimeout(redirectTimerRef.current)
        }

        redirectTimerRef.current = setTimeout(() => {
          router.push('/admin')
        }, 3000)
      }
    }

    handlePaymentSuccess()

    // Cleanup function
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
        redirectTimerRef.current = null
      }
    }
  }, [mounted, router, searchParams, paymentId])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-green-50 rounded-full blur-[100px] opacity-60" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-50 rounded-full blur-[100px] opacity-60" />

      <div className="w-full max-w-xl relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/20 backdrop-blur-sm overflow-hidden transition-all duration-700 hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)]">
          
          {/* Header Section */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-12 text-white text-center relative overflow-hidden">
            {/* Abstract Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 transform -skew-x-12 translate-x-[-100%] animate-[shimmer_3s_infinite]" />
            
            <div className="relative z-10">
              <div className="inline-flex p-4 rounded-full bg-white/10 backdrop-blur-md mb-6 animate-in zoom-in-50 duration-500">
                <CheckCircle className="h-16 w-16 text-white" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight mb-2">Payment Successful</h1>
              <p className="text-green-50/90 text-lg font-medium">Thank you for your transaction with Fundflow</p>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-10 text-center">
            {syncing ? (
              <div className="py-12 flex flex-col items-center">
                <div className="relative">
                  <Loader2 className="h-14 w-14 animate-spin text-primary-600" />
                  <div className="absolute inset-0 h-14 w-14 animate-ping bg-primary-100 rounded-full opacity-30" />
                </div>
                <p className="text-gray-900 font-bold text-xl mt-8">Finalizing your payment...</p>
                <p className="text-gray-500 mt-2 max-w-[280px] mx-auto text-sm leading-relaxed">
                  We're securely syncing your transaction details to your organization's dashboard.
                </p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-gray-50/80 rounded-3xl p-8 border border-gray-100 group transition-all hover:bg-white hover:shadow-lg hover:shadow-gray-100/50">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Order Reference</span>
                    <span className="text-sm font-mono font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                      #{paymentId?.substring(0, 8).toUpperCase() || 'FUND-XXXX'}
                    </span>
                  </div>
                  <div className="text-left space-y-4">
                    <p className="text-gray-600 font-medium leading-relaxed">
                      Your contribution has been successfully processed. An official digital receipt has been generated and sent to your email.
                    </p>
                    <div className="h-px bg-gray-200/50 w-full" />
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span>Funds will be visible in your dashboard shortly</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      router.push(dashboardPath || '/admin')
                    }}
                    className="w-full px-8 py-5 bg-primary-600 text-white rounded-2xl font-black text-lg hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/20 hover:shadow-primary-600/40 hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    Go to Dashboard
                  </button>
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
                    <p className="text-sm text-gray-400 font-medium">
                      Automatic redirect in <span className="text-gray-500 font-bold">3 seconds</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Section */}
          <div className="bg-gray-50/50 px-10 py-6 border-t border-gray-100/50 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-300 flex items-center justify-center gap-3">
              <span className="w-8 h-px bg-gray-200" />
              Powered by Fundflow Secure Payments
              <span className="w-8 h-px bg-gray-200" />
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}

