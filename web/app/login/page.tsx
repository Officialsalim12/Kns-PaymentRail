import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import LoginForm from '@/components/auth/LoginForm'
import Link from 'next/link'
import { Building2 } from 'lucide-react'

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
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link href="/" className="flex items-center">
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 mr-1 sm:mr-2" />
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">KNS MultiRail</span>
            </Link>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/"
                className="text-sm sm:text-base text-gray-700 hover:text-gray-900 font-medium transition-colors px-2 sm:px-0"
              >
                Home
              </Link>
              <Link
                href="/organization/register"
                className="px-3 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm hover:shadow-md whitespace-nowrap"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Login Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-primary-50 py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <h2 className="text-lg sm:text-xl text-gray-600">
              Sign in to your account
            </h2>
          </div>
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
            <LoginForm />
          </div>
        </div>
      </section>
    </div>
  )
}

