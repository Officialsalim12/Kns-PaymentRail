import SuperAdminRegistrationForm from '@/components/super-admin/RegistrationForm'

export default function SuperAdminRegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-6 sm:space-y-8">
        <div>
          <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900 px-2">
            Super Admin Registration
          </h2>
          <p className="mt-2 text-center text-sm sm:text-base text-gray-600 px-2">
            Create a super admin account to manage organizations and users
          </p>
        </div>
        <SuperAdminRegistrationForm />
      </div>
    </div>
  )
}

