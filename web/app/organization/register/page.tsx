import OrganizationRegistrationForm from '@/components/organization/RegistrationForm'
import Link from 'next/link'

export default function OrganizationRegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-left">
          <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create Admin Account & Register Organization
          </h2>
          <p className="mt-2 text-center text-base text-gray-600">
            Sign up as an admin and register your organization for approval
          </p>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <OrganizationRegistrationForm />
        </div>
      </div>
    </div>
  )
}

