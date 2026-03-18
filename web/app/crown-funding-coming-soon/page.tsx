import Image from 'next/image'
import Link from 'next/link'

import AuthLayout from '@/components/auth/AuthLayout'

export default function CrownFundingComingSoonPage() {
  return (
    <AuthLayout
      title="Coming soon"
      subtitle="Crown Funding will be available soon."
    >
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden border border-gray-100 bg-black">
          <Image
            src="/crown-funding-coming-soon.png"
            alt="Coming soon"
            fill
            className="object-contain"
            priority
          />
        </div>

        <p className="text-sm text-gray-600">
          We&apos;re preparing the Crown Funding experience. In the meantime, you can set up an organization subscription.
        </p>

        <Link
          href="/get-started"
          className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold transition-colors active:scale-[0.99]"
        >
          Back to Get Started
        </Link>
      </div>
    </AuthLayout>
  )
}

