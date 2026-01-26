import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import LoginForm from '@/components/auth/LoginForm'
import AuthLayout from '@/components/auth/AuthLayout'
import Link from 'next/link'

export default async function LoginPage() {
  const user = await getCurrentUser()

  if (user) {
    const role = user.profile?.role
    if (role === 'super_admin') {
      redirect('/super-admin')
    } else if (role === 'org_admin') {
      redirect('/admin')
    } else if (role === 'member') {
      redirect('/member')
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Enter your details to access your account"
    >
      <LoginForm />

      <div className="mt-6 text-center text-sm">
        <span className="text-gray-500">Don't have an account? </span>
        <div className="mt-2 space-y-2">
          <Link href="/member-register" className="block font-medium text-primary-600 hover:text-primary-500">
            Register as a Member
          </Link>
          <Link href="/organization/register" className="block font-medium text-primary-600 hover:text-primary-500">
            Register an Organization
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
