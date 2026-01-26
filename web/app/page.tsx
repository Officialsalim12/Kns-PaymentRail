import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { 
  Users, 
  CreditCard, 
  FileText, 
  Shield, 
  Zap, 
  CheckCircle2,
  ArrowRight,
  Building2,
  Lock
} from 'lucide-react'
import FAQ from '@/components/shared/FAQ'

export default async function HomePage() {
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
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12 sm:h-14 md:h-16">
            <div className="flex items-center min-w-0 flex-1">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary-600 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 truncate">KNS MultiRail</span>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-4 flex-shrink-0 ml-2">
              <Link
                href="/login"
                className="text-xs sm:text-sm md:text-base text-gray-700 hover:text-gray-900 font-medium transition-colors px-1 sm:px-2 md:px-0"
              >
                Sign In
              </Link>
              <Link
                href="/organization/register"
                className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-1.5 md:py-2 text-[10px] sm:text-xs md:text-sm font-semibold text-primary-600 hover:text-primary-700 bg-white hover:bg-primary-50 border border-primary-300 hover:border-primary-400 rounded-md sm:rounded-lg transition-all whitespace-nowrap shadow-sm hover:shadow"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-primary-50 py-8 sm:py-12 md:py-16 lg:py-20 xl:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4 lg:mb-6 leading-tight px-1 sm:px-2 md:px-0">
              Modern Payments for{' '}
              <span className="text-primary-600">Growing Organizations</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-600 mb-4 sm:mb-6 md:mb-8 lg:mb-10 max-w-3xl mx-auto leading-relaxed px-2 sm:px-3 md:px-4">
              Sierra Leone's most reliable payment management platform, offering an end-to-end solution that boosts payment performance and streamlines finances. We help organizations grow revenue and retain members.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 md:gap-4 justify-center items-stretch sm:items-center px-3 sm:px-4 md:px-0">
              <Link
                href="/organization/register"
                className="w-full sm:w-auto px-3 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 text-xs sm:text-sm md:text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 sm:gap-2"
              >
                Get Started
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto px-3 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 text-xs sm:text-sm md:text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-all border-2 border-gray-200 hover:border-gray-300"
              >
                Company Contact
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators - Partner */}
      <section className="py-8 sm:py-10 md:py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-500 uppercase tracking-wider mb-4 sm:mb-6">Powered by</p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-0">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                Monime
              </div>
              <span className="hidden sm:inline mx-3 md:mx-4 text-gray-400">•</span>
              <p className="text-xs sm:text-sm text-gray-600">
                Integrated Payment Gateway
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Take Charge Section */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4 px-1 sm:px-2">
              Take charge of your organization
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-2 sm:px-3 md:px-4">
              Accept payments, manage finances, grow your revenue. Join us during our pilot phase and help shape the future of payment management.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8 max-w-5xl mx-auto">
            <div className="text-center p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-primary-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-6">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2 md:mb-3">Member Management</h3>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">
                Efficiently manage your organization's members with approval workflows, role-based access control, and comprehensive member profiles.
              </p>
            </div>

            <div className="text-center p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-primary-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-6">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2 md:mb-3">Payment Tracking</h3>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">
                Track all payments in real-time with comprehensive history, status monitoring, detailed analytics, and payment tab management.
              </p>
            </div>

            <div className="text-center p-4 sm:p-6 md:p-8 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100 sm:col-span-2 lg:col-span-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-primary-600 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-6">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-1.5 sm:mb-2 md:mb-3">Automated Receipts</h3>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">
                Automatically generate professional PDF receipts for all transactions with secure storage and easy access for members.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4 px-1 sm:px-2">
              Delight members with seamless payments
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-2 sm:px-3 md:px-4">
              Give your members the gift of modern, frictionless, painless payments. Integrate KNS MultiRail once and let them pay you however they want.
            </p>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 lg:p-12 border border-gray-200">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 md:mb-8 text-center">
              Accept payments through multiple channels
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
              {[
                { name: 'Card', icon: '💳' },
                { name: 'Bank Account', icon: '🏦' },
                { name: 'Bank Transfer', icon: '🔄' },
                { name: 'Mobile Money', icon: '📱' },
              ].map((method, idx) => (
                <div key={idx} className="text-center p-3 sm:p-4 md:p-6 rounded-lg bg-gray-50 hover:bg-primary-50 transition-colors">
                  <div className="text-2xl sm:text-3xl md:text-4xl mb-1.5 sm:mb-2 md:mb-3">{method.icon}</div>
                  <div className="text-xs sm:text-sm md:text-base font-semibold text-gray-900 break-words">{method.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-8 sm:py-12 md:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4 px-1 sm:px-2">
              Why Choose KNS MultiRail?
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-2 sm:px-3 md:px-4">
              Everything you need to manage payments and members efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Building2,
                title: 'Multi-Tenant Architecture',
                description: 'Complete data isolation and security for each organization',
              },
              {
                icon: Shield,
                title: 'Role-Based Access Control',
                description: 'Granular permissions for Super Admins, Org Admins, and Members',
              },
              {
                icon: Lock,
                title: 'Secure & Scalable',
                description: 'Built on enterprise-grade infrastructure with bank-level security',
              },
            ].map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">{benefit.title}</h4>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Badge */}
      <section className="py-8 sm:py-10 md:py-12 lg:py-14 xl:py-16 bg-primary-600">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-white/20 rounded-full mb-3 sm:mb-4 md:mb-6">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3 md:mb-4 px-1 sm:px-2">
            Enterprise-Grade Security
          </h2>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-primary-100 leading-relaxed px-2 sm:px-3">
            KNS MultiRail meets the highest possible global standards of data security and protection. Our policies move through constant iteration and undergo rigorous testing to ensure we proactively mitigate any potential threats to your payment and member data.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <div id="faq">
        <FAQ />
      </div>

      {/* CTA Section */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gradient-to-br from-primary-600 to-primary-700">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2 sm:mb-3 md:mb-4 px-1 sm:px-2">
            We are your partner for growth
          </h2>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-primary-100 mb-4 sm:mb-6 md:mb-8 lg:mb-10 px-2 sm:px-3">
            Let us help you grow your organization
          </p>
          <Link
            href="/organization/register"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 lg:px-8 py-1.5 sm:py-2 md:py-3 lg:py-4 text-xs sm:text-sm md:text-base font-semibold text-primary-600 bg-white hover:bg-gray-50 rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            Get Started
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 sm:py-10 md:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8 lg:mb-12">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center mb-2 sm:mb-3 md:mb-4">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary-400 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="text-base sm:text-lg md:text-xl font-bold text-white">KNS MultiRail</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                KNS MultiRail helps thousands of organizations collect payments, manage members, and track transactions. Built for Sierra Leone.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base">Products</h4>
              <ul className="space-y-1 sm:space-y-1.5 md:space-y-2 text-xs sm:text-sm">
                <li>Payment Management</li>
                <li>Member Management</li>
                <li>Receipt Generation</li>
                <li>Analytics</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base">Company</h4>
              <ul className="space-y-1 sm:space-y-1.5 md:space-y-2 text-xs sm:text-sm">
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>

          </div>

          <div className="border-t border-gray-800 pt-4 sm:pt-6 md:pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <div className="flex flex-wrap justify-center sm:justify-start gap-3 sm:gap-4 md:gap-6">
              <Link href="/privacy" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors">
                Terms
              </Link>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 text-center sm:text-right">
              © {new Date().getFullYear()} KNS MultiRail. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
