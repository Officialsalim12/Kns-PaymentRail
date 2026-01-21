import OrganizationRegistrationForm from '@/components/organization/RegistrationForm'

export default function OrganizationRegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create Admin Account & Register Organization
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign up as an admin and register your organization for approval
          </p>
        </div>
        <OrganizationRegistrationForm />
      </div>
    </div>
  )
}

