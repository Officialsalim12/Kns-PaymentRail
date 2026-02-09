'use client'

import { Suspense } from 'react'
import PaymentCancelled from '@/components/payment/PaymentCancelled'
import { Loader2 } from 'lucide-react'

export default function PaymentCancelledPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentCancelled />
    </Suspense>
  )
}

