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
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-primary-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">KNS MultiRail</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/organization/register"
                className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-primary-50 py-24 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight px-2 sm:px-0">
              Modern Payments for{' '}
              <span className="text-primary-600">Growing Organizations</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
              Sierra Leone's most reliable payment management platform, offering an endtoend solution that boosts payment performance and streamlines finances. We help organizations grow revenue and retain members.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 sm:px-0">
              <Link
                href="/organization/register"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-all border-2 border-gray-200 hover:border-gray-300"
              >
                Company Contact
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators - Partner */}
      <section className="py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-500 uppercase tracking-wider mb-6">Powered by</p>
            <div className="flex justify-center items-center">
              <div className="text-2xl font-bold text-gray-900">
                Monime
              </div>
              <span className="mx-4 text-gray-400">•</span>
              <p className="text-sm text-gray-600">
                Integrated Payment Gateway
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Take Charge Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Take charge of your organization
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Accept payments, manage finances, grow your revenue. Join us during our pilot phase and help shape the future of payment management.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100">
              <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Member Management</h3>
              <p className="text-gray-600">
                Efficiently manage your organization's members with approval workflows, rolebased access control, and comprehensive member profiles.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100">
              <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Payment Tracking</h3>
              <p className="text-gray-600">
                Track all payments in realtime with comprehensive history, status monitoring, detailed analytics, and payment tab management.
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100">
              <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Automated Receipts</h3>
              <p className="text-gray-600">
                Automatically generate professional PDF receipts for all transactions with secure storage and easy access for members.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Delight members with seamless payments
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Give your members the gift of modern, frictionless, painless payments. Integrate KNS MultiRail once and let them pay you however they want.
            </p>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-2xl p-12 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Accept payments through multiple channels
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {[
                { name: 'Card', icon: '💳' },
                { name: 'Bank Account', icon: '🏦' },
                { name: 'Bank Transfer', icon: '🔄' },
                { name: 'Mobile Money', icon: '📱' },
              ].map((method, idx) => (
                <div key={idx} className="text-center p-6 rounded-lg bg-gray-50 hover:bg-primary-50 transition-colors">
                  <div className="text-4xl mb-3">{method.icon}</div>
                  <div className="font-semibold text-gray-900">{method.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose KNS MultiRail?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to manage payments and members efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Building2,
                title: 'MultiTenant Architecture',
                description: 'Complete data isolation and security for each organization',
              },
              {
                icon: Shield,
                title: 'RoleBased Access Control',
                description: 'Granular permissions for Super Admins, Org Admins, and Members',
              },
              {
                icon: Lock,
                title: 'Secure & Scalable',
                description: 'Built on enterprise-grade infrastructure with bank-level security',
              },
            ].map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-6 p-6 rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors">
                <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h4>
                  <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Badge */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Enterprise-Grade Security
          </h2>
          <p className="text-xl text-primary-100 leading-relaxed">
            KNS MultiRail meets the highest possible global standards of data security and protection. Our policies move through constant iteration and undergo rigorous testing to ensure we proactively mitigate any potential threats to your payment and member data.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <div id="faq">
        <FAQ />
      </div>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            We are your partner for growth
          </h2>
          <p className="text-xl text-primary-100 mb-10">
            Let us help you grow your organization
          </p>
          <Link
            href="/organization/register"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-primary-600 bg-white hover:bg-gray-50 rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
            <div>
              <div className="flex items-center mb-4">
                <Building2 className="w-8 h-8 text-primary-400 mr-2" />
                <span className="text-xl font-bold text-white">KNS MultiRail</span>
              </div>
              <p className="text-sm text-gray-400">
                KNS MultiRail helps thousands of organizations collect payments, manage members, and track transactions. Built for Sierra Leone.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="hover:text-white transition-colors">Payment Management</Link></li>
                <li><Link href="#features" className="hover:text-white transition-colors">Member Management</Link></li>
                <li><Link href="#features" className="hover:text-white transition-colors">Receipt Generation</Link></li>
                <li><Link href="#features" className="hover:text-white transition-colors">Analytics</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>

          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
