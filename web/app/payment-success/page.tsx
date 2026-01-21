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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-green-600 mb-4">
          <CheckCircle className="h-16 w-16 mx-auto" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        {syncing ? (
          <div className="mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600 mx-auto mb-2" />
            <p className="text-gray-600">Updating payment status...</p>
          </div>
        ) : (
          <p className="text-gray-600 mb-4">
            Your payment has been processed successfully. Your receipt will be available in your dashboard shortly.
          </p>
        )}
        <p className="text-gray-600 mt-6 mb-4">Redirecting to dashboard...</p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            // Always validate path before navigation
            const path = dashboardPath && dashboardPath.startsWith('/') ? dashboardPath : '/admin'
            try {
              router.push(path)
            } catch (error) {
              console.error('Navigation error:', error)
              // Fallback to admin if navigation fails
              router.push('/admin')
            }
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors cursor-pointer"
        >
          Go to Dashboard Now
        </button>
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

