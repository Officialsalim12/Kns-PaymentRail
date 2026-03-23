import Link from 'next/link'
import { ArrowRight, Coins, CreditCard } from 'lucide-react'
import AuthLayout from '@/components/auth/AuthLayout'

export default function GetStartedPage() {
  return (
    <AuthLayout
      title="Are You an organization or are you looking for funding?"
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <Coins className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Crown Funding</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Set up crowdfunding campaigns and collect contributions from your community.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/crown-funding-coming-soon"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold transition-colors active:scale-[0.99]"
            >
              Continue to page
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Organization Subscription */}
          <div className="rounded-2xl border border-primary-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-primary-50 border border-primary-100">
                  <CreditCard className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Organization Subscription</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Sign in (or create an account) to register your organization and manage subscriptions.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/login"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold transition-colors active:scale-[0.99]"
            >
              Continue to page
              <ArrowRight className="w-4 h-4" />
            </Link>

            <p className="mt-3 text-xs text-gray-500 text-center">
              You&apos;ll be redirected automatically based on your role after signing in.
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}

