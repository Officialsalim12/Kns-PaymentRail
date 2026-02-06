'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log error to monitoring service in production
        console.error('[Global Error]:', error)
    }, [error])

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Something went wrong</h1>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        We encountered an unexpected error. Our team has been notified and is working to fix it.
                    </p>
                </div>

                <div className="space-y-3 pt-4">
                    <button
                        onClick={reset}
                        className="w-full py-3 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-all text-sm uppercase tracking-widest"
                    >
                        Try Again
                    </button>

                    <Link
                        href="/"
                        className="block w-full py-3 bg-white text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all border border-gray-200 text-sm uppercase tracking-widest"
                    >
                        Go to Home
                    </Link>
                </div>

                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left">
                        <p className="text-xs font-mono text-gray-700 break-all">
                            {error.message}
                        </p>
                        {error.digest && (
                            <p className="text-xs text-gray-500 mt-2">
                                Error ID: {error.digest}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
