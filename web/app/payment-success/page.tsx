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

        const paymentId = searchParams.get('payment_id')

        // Sync payment status if payment_id is provided
        if (paymentId) {
          setSyncing(true)
          try {
            const { data, error } = await invokeEdgeFunction(
              supabase,
              'sync-payment-status',
              {
                body: { paymentId },
              }
            )

            if (error) {
              console.error('Error syncing payment:', error)
            } else if (data?.success) {
              console.log('Payment synced successfully:', data)
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
  }, [mounted, router, searchParams])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="main-container max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-100 transition-all duration-500 hover:shadow-2xl">
          <div className="bg-green-600 p-8 text-white text-center relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <CheckCircle className="h-20 w-20 mx-auto mb-4 animate-bounce" />
            <h1 className="text-3xl font-extrabold tracking-tight">Payment Successful!</h1>
            <p className="mt-2 text-green-50 opacity-90 font-medium">Thank you for your transaction</p>
          </div>

          <div className="p-8 text-center">
            {syncing ? (
              <div className="py-8">
                <Loader2 className="h-10 w-10 animate-spin text-primary-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Securely syncing your payment status...</p>
                <p className="text-sm text-gray-400 mt-1">This will only take a moment</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 inline-block w-full">
                  <p className="text-sm text-blue-600 font-bold uppercase tracking-wider mb-2">Transaction Completed</p>
                  <p className="text-gray-600 leading-relaxed font-medium">
                    Your payment has been processed successfully. Your receipt and transaction history will be available in your dashboard shortly.
                  </p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      const path = dashboardPath && dashboardPath.startsWith('/') ? dashboardPath : '/admin'
                      router.push(path)
                    }}
                    className="w-full px-6 py-4 bg-primary-600 text-white rounded-xl font-bold text-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-primary-200 transform hover:-translate-y-0.5 active:scale-[0.98]"
                  >
                    Go to Dashboard
                  </button>
                  <p className="text-sm text-gray-400 animate-pulse">
                    Redirecting automatically in a few seconds...
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500 font-medium">
            <span>Powered by KNS MultiRail</span>
            <span>Ref: {searchParams.get('payment_id')?.substring(0, 8) || 'N/A'}</span>
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

