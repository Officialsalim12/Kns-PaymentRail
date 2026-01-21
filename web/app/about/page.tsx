import Link from 'next/link'
import { Building2, Shield, Zap, Users, Target, Lightbulb, ArrowRight, UserPlus, FileText, CreditCard, BarChart3, Receipt, KeyRound, Lock, ClipboardCheck } from 'lucide-react'
import TeamMemberImage from '@/components/shared/TeamMemberImage'
import TeamImage from '@/components/shared/TeamImage'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Building2 className="w-8 h-8 text-primary-600 mr-2" />
              <span className="text-2xl font-bold text-gray-900">KNS MultiRail</span>
            </Link>
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
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-primary-50 py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Streamline payment management for{' '}
              <span className="text-primary-600">your organization</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              KNS MultiRail is a multitenant payment management platform that helps organizations track payments, manage members, and generate receipts all in one secure, centralized system.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/organization/register"
                className="px-8 py-4 text-base font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="px-8 py-4 text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-all border-2 border-gray-200 hover:border-gray-300"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12 mb-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">MultiTenant Architecture</h3>
              <p className="text-gray-600 leading-relaxed">
                Each organization's data is completely isolated and secure. Your members, payments, and receipts are private to your organization only.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">RoleBased Access</h3>
              <p className="text-gray-600 leading-relaxed">
                Three distinct roles Super Admin, Organization Admin, and Member each with appropriate permissions and access levels.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Member Management</h3>
              <p className="text-gray-600 leading-relaxed">
                Streamlined member registration with approval workflows, custom payment tabs, and comprehensive member profiles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">
              Our Story
            </h2>
            <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed space-y-6">
              <p>
                KNS MultiRail was founded as a startup under <strong className="text-gray-900">KNS Consultancy and College</strong> to solve a critical problem facing organizations in Sierra Leone: how to efficiently manage payments, track member contributions, and maintain accurate financial records.
              </p>
              <p>
                We recognized that many organizations struggle with manual payment tracking, scattered records, and timeconsuming receipt generation. KNS MultiRail was built to address these challenges by providing a centralized, secure platform where organizations can manage all aspects of their payment operations.
              </p>
              <p>
                Our platform integrates with Monime payment gateway, allowing organizations to accept payments through various methods while maintaining complete control over member management, payment tracking, and receipt generation. Whether you're managing monthly subscriptions, onetime payments, or donations, KNS MultiRail provides the tools you need to streamline your financial operations.
              </p>
              <p>
                Our mission is to empower organizations of all sizes from small community groups to large institutions with the technology they need to manage their finances efficiently, securely, and transparently. We believe that every organization deserves access to professional payment management tools that help them focus on their core mission rather than administrative tasks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything you need to manage payments seamlessly
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-8 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Payment Tracking</h3>
              <p className="text-gray-600 leading-relaxed">
                Track all payments in realtime with comprehensive history, status monitoring, and detailed payment records for each member.
              </p>
            </div>

            <div className="text-center p-8 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Member Management</h3>
              <p className="text-gray-600 leading-relaxed">
                Manage your organization's members with approval workflows, custom payment tabs, and rolebased access control.
              </p>
            </div>

            <div className="text-center p-8 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Receipt Generation</h3>
              <p className="text-gray-600 leading-relaxed">
                Automatically generate professional PDF receipts for all transactions with secure storage and easy access for members.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Principles Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How KNS MultiRail Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A simple, secure process designed for organizations of all sizes.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Vertical Timeline Line */}
              <div className="hidden md:block absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-200 via-primary-400 to-primary-200 rounded-full"></div>
              
              {[
                {
                  icon: ClipboardCheck,
                  title: 'Organization Registration',
                  description: 'Register your organization and set up your account. Organization admins can then start managing members and payments.',
                },
                {
                  icon: UserPlus,
                  title: 'Member Onboarding',
                  description: 'Members register and request to join your organization. Admins review and approve member applications.',
                },
                {
                  icon: FileText,
                  title: 'Create Payment Tabs',
                  description: 'Organization admins create custom payment tabs for members with specific amounts, descriptions, and payment types.',
                },
                {
                  icon: CreditCard,
                  title: 'Process Payments',
                  description: 'Members make payments through integrated payment gateway. Payments are tracked in realtime.',
                },
                {
                  icon: BarChart3,
                  title: 'Track & Monitor',
                  description: 'View comprehensive payment history, monitor payment status, and track member contributions.',
                },
                {
                  icon: Receipt,
                  title: 'Generate Receipts',
                  description: 'Automatically generate professional PDF receipts for all transactions. Members can access their receipts anytime.',
                },
                {
                  icon: KeyRound,
                  title: 'Role-Based Access',
                  description: 'Super Admins manage the platform, Organization Admins manage their organization, and Members access their payment information.',
                },
                {
                  icon: Lock,
                  title: 'Secure & Isolated',
                  description: 'Each organization\'s data is completely isolated. Your information is private and secure.',
                },
              ].map((step, idx) => {
                const Icon = step.icon
                return (
                  <div key={idx} className="relative mb-8 last:mb-0">
                    {/* Timeline Dot */}
                    <div className="hidden md:block absolute left-8 w-5 h-5 bg-primary-600 rounded-full border-4 border-white shadow-lg transform -translate-x-1/2 z-10"></div>
                    
                    {/* Content Card */}
                    <div className="ml-0 md:ml-20">
                      <div className="bg-gradient-to-br from-white via-gray-50 to-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:border-primary-300 hover:-translate-y-1">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
                            <Icon className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1 pt-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                            <p className="text-gray-600 leading-relaxed">{step.description}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Our Team</h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-4">
                KNS MultiRail is developed by a dedicated team focused on building practical solutions for organizations. Our expertise in multitenant architecture, payment processing, and secure data management allows us to create a platform that is both powerful and easy to use.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                We work closely with organizations to understand their payment management challenges and continuously improve our platform based on realworld feedback. Our team is committed to providing reliable, secure, and userfriendly payment management solutions that help organizations focus on their core mission.
              </p>
            </div>

            {/* Leadership Section */}
            <div className="mb-12">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">Leadership</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
                  <div className="text-center">
                    <TeamMemberImage
                      src="/images/team/desmond-macfoy.jpg"
                      alt="Desmond E A Macfoy"
                      fallbackIcon="users"
                    />
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Desmond E A Macfoy</h4>
                    <p className="text-primary-600 font-semibold mb-3">Founder</p>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Founder of KNS MultiRail and founder of KNS Consultancy and College. Under his visionary leadership, KNS MultiRail was conceived as a practical solution to address the payment management challenges faced by organizations.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-8 border border-gray-100">
                  <div className="text-center">
                    <TeamMemberImage
                      src="/images/team/engineer-salim.jpg"
                      alt="Engineer Salim"
                      fallbackIcon="zap"
                    />
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Engineer Salim</h4>
                    <p className="text-primary-600 font-semibold mb-3">Lead Software Engineer</p>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Lead Software Engineer at KNS, Engineer Salim brings technical expertise and leadership to the development team, ensuring the platform meets the highest standards of quality, security, and performance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Development Team Section */}
            <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-8 border border-primary-100">
              <div className="text-center">
                <TeamImage
                  src="/images/team/software-development-team.jpg"
                  alt="Software Development Team"
                />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Software Development Team</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Our talented software development team at KNS came together to bring this innovative solution to life. Through collaborative effort, technical expertise, and a deep understanding of organizational needs, they have built a platform that simplifies payment management and empowers organizations to focus on their core mission.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The team's commitment to excellence, continuous improvement, and usercentric design ensures that KNS MultiRail remains a reliable and cuttingedge solution for organizations of all sizes.
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                A startup under <strong className="text-gray-900">KNS Consultancy and College</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

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
          <div className="grid md:grid-cols-4 gap-8 mb-12">
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
                <li><Link href="/#features" className="hover:text-white transition-colors">Payment Management</Link></li>
                <li><Link href="/#features" className="hover:text-white transition-colors">Member Management</Link></li>
                <li><Link href="/#features" className="hover:text-white transition-colors">Receipt Generation</Link></li>
                <li><Link href="/#features" className="hover:text-white transition-colors">Analytics</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/#faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>

          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex space-x-6 mt-4 md:mt-0">
              <span className="text-sm text-gray-400 cursor-not-allowed">
                Privacy
              </span>
              <span className="text-sm text-gray-400 cursor-not-allowed">
                Terms
              </span>
              <span className="text-sm text-gray-400 cursor-not-allowed">
                Cookies
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
