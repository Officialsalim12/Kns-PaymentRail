import OrganizationRegistrationForm from '@/components/organization/RegistrationForm'
import Link from 'next/link'

export default function OrganizationRegisterPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Images */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900">
        <div className="absolute inset-0 flex flex-col">
          <div className="relative h-1/2 w-full">
            <img
              src="/organization-preview.jpg"
              alt="Registration Preview 1"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>
          <div className="relative h-1/2 w-full">
            <img
              src="/donation-preview.jpg"
              alt="Registration Preview 2"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 overflow-y-auto">
        <div className="max-w-xl w-full space-y-6 sm:space-y-8">
          <div className="text-left">
            <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
          <div>
            <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900 px-2">
              Create Admin Account & Register Organization
            </h2>
            <p className="mt-2 text-center text-sm sm:text-base text-gray-600 px-2">
              Sign up as an admin and register your organization for approval
            </p>
          </div>
          <OrganizationRegistrationForm />
        </div>
      </div>
    </div>
  )
}

