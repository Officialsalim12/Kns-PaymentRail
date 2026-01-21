import SuperAdminRegistrationForm from '@/components/super-admin/RegistrationForm'

export default function SuperAdminRegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">KNS MultiRail</h1>
          <h2 className="mt-2 text-xl font-medium text-gray-600">
            Super Admin Registration
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Create the initial Super Admin account to manage organizations and approvals.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <SuperAdminRegistrationForm />
        </div>
      </div>
    </div>
  )
}

