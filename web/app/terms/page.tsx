'use client'

import Link from 'next/link'
import { Building2, ChevronRight, FileText, Shield, Lock, Scale, AlertTriangle, Users, Mail, Phone, Gavel } from 'lucide-react'
import { useState } from 'react'

const sections = [
  { id: 'acceptance', title: 'Acceptance of Terms' },
  { id: 'description', title: 'Description of Service' },
  { id: 'user-accounts', title: 'User Accounts and Registration' },
  { id: 'user-roles', title: 'User Roles and Responsibilities' },
  { id: 'payment-processing', title: 'Payment Processing' },
  { id: 'data-privacy', title: 'Data Privacy and Security' },
  { id: 'prohibited', title: 'Prohibited Activities' },
  { id: 'intellectual-property', title: 'Intellectual Property' },
  { id: 'limitation-liability', title: 'Limitation of Liability' },
  { id: 'termination', title: 'Termination' },
  { id: 'changes', title: 'Changes to Terms' },
  { id: 'governing-law', title: 'Governing Law' },
  { id: 'contact', title: 'Contact Information' },
]

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('acceptance')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link href="/" className="flex items-center">
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 mr-1.5 sm:mr-2" />
              <span className="text-lg sm:text-2xl font-bold text-gray-900">KNS MultiRail</span>
            </Link>
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Link
                href="/login"
                className="text-sm sm:text-base text-gray-700 hover:text-gray-900 font-semibold transition-colors px-1"
              >
                Sign In
              </Link>
              <Link
                href="/organization/register"
                className="px-4 py-2 sm:px-5 py-2.5 text-sm sm:text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm hover:shadow-md whitespace-nowrap"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-600 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
            <span className="text-gray-900 font-medium">Terms of Service</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-20 bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
              <h2 className="text-xs font-semibold text-gray-900 mb-4 uppercase tracking-wide">On This Page</h2>
              <nav className="space-y-1 max-h-[30vh] lg:max-h-none overflow-y-auto lg:overflow-visible pr-2 lg:pr-0">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={() => setActiveSection(section.id)}
                    className={`block px-3 py-2 text-xs sm:text-sm rounded-md transition-colors ${activeSection === section.id
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    {section.title}
                  </a>
                ))}
              </nav>

              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3">Related</h3>
                <div className="space-y-2">
                  <Link
                    href="/privacy"
                    className="flex items-center text-xs sm:text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Privacy Policy
                  </Link>
                  <Link
                    href="/contact"
                    className="flex items-center text-xs sm:text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Us
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 sm:p-8 lg:p-12">
              {/* Header */}
              <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Gavel className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Terms of Service</h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                  Please read these Terms of Service carefully before using KNS MultiRail. By accessing and using our platform, you agree to be bound by these terms and conditions.
                </p>
              </div>

              {/* Content Sections */}
              <div className="prose prose-lg max-w-none">
                <section id="acceptance" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Scale className="w-6 h-6 text-primary-600" />
                    1. Acceptance of Terms
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      By accessing and using KNS MultiRail ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                    </p>
                    <p>
                      These Terms of Service constitute a legally binding agreement between you and KNS MultiRail. Your use of the Platform indicates your acceptance of these terms.
                    </p>
                  </div>
                </section>

                <section id="description" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary-600" />
                    2. Description of Service
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      KNS MultiRail is a multitenant payment management platform that enables organizations to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Manage member registrations and profiles</li>
                      <li>Process and track payments</li>
                      <li>Generate receipts for transactions</li>
                      <li>Monitor payment analytics and reports</li>
                      <li>Maintain secure, isolated data environments</li>
                    </ul>
                    <p className="mt-4">
                      The Platform integrates with leading payment gateways to facilitate payment processing. We reserve the right to modify, suspend, or discontinue any aspect of the service at any time.
                    </p>
                  </div>
                </section>

                <section id="user-accounts" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary-600" />
                    3. User Accounts and Registration
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">3.1 Account Creation</h3>
                      <p className="mb-3">To use the Platform, you must:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Provide accurate, current, and complete information during registration</li>
                        <li>Maintain and update your information to keep it accurate</li>
                        <li>Maintain the security of your password and account</li>
                        <li>Accept responsibility for all activities under your account</li>
                        <li>Be at least 18 years of age or have parental consent</li>
                        <li>Comply with all applicable laws and regulations</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">3.2 Organization Approval</h3>
                      <p>
                        Organization registrations are subject to approval by super administrators. We reserve the right to approve or reject any organization registration at our sole discretion. We may also suspend or terminate accounts that violate these terms.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">3.3 Account Security</h3>
                      <p>
                        You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account or any other breach of security.
                      </p>
                    </div>
                  </div>
                </section>

                <section id="user-roles" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">4. User Roles and Responsibilities</h2>
                  <div className="text-gray-700 leading-relaxed space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 Super Administrators</h3>
                      <p>
                        Super administrators have the authority to approve or reject organization registrations and manage platform-wide settings. They are responsible for maintaining the integrity and security of the platform.
                      </p>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Organization Administrators</h3>
                      <p>Organization administrators are responsible for:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Managing their organization's member accounts</li>
                        <li>Creating and managing payment tabs</li>
                        <li>Approving member registration requests</li>
                        <li>Maintaining accurate organization information</li>
                        <li>Ensuring compliance with applicable laws and regulations</li>
                        <li>Protecting member data and privacy</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Members</h3>
                      <p>Members are responsible for:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Providing accurate information during registration</li>
                        <li>Making payments in accordance with their organization's requirements</li>
                        <li>Maintaining the security of their account</li>
                        <li>Complying with their organization's policies</li>
                        <li>Reporting any suspicious activity or security concerns</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section id="payment-processing" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Payment Processing</h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      KNS MultiRail integrates with third-party payment gateways to process payments. By using our payment services, you agree to:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Comply with all applicable payment processing regulations</li>
                      <li>Provide accurate payment information</li>
                      <li>Accept that payment processing is subject to the terms and conditions of our payment partners</li>
                      <li>Understand that we are not responsible for payment gateway failures or issues</li>
                      <li>Authorize us to process payments on your behalf</li>
                      <li>Accept that all transactions are final unless otherwise stated</li>
                    </ul>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-yellow-800 font-medium mb-1">Payment Disclaimer</p>
                          <p className="text-sm text-yellow-700">
                            We are not responsible for payment processing errors, delays, or failures that occur outside of our control. All disputes regarding payments should be directed to the payment gateway provider.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section id="data-privacy" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-primary-600" />
                    6. Data Privacy and Security
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      Your use of the Platform is also governed by our <Link href="/privacy" className="text-primary-600 hover:text-primary-700 font-medium">Privacy Policy</Link>. We implement multitenant architecture to ensure data isolation between organizations. However, you are responsible for:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Maintaining the confidentiality of your account credentials</li>
                      <li>Notifying us immediately of any unauthorized access</li>
                      <li>Complying with data protection regulations applicable to your organization</li>
                      <li>Ensuring that member data is collected and used in accordance with applicable laws</li>
                      <li>Implementing appropriate security measures for your organization's data</li>
                    </ul>
                  </div>
                </section>

                <section id="prohibited" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-primary-600" />
                    7. Prohibited Activities
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>You agree not to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Use the Platform for any illegal or unauthorized purpose</li>
                      <li>Violate any laws in your jurisdiction</li>
                      <li>Transmit any viruses, malware, or harmful code</li>
                      <li>Attempt to gain unauthorized access to the Platform or other organizations' data</li>
                      <li>Interfere with or disrupt the Platform's operation</li>
                      <li>Use automated systems to access the Platform without permission</li>
                      <li>Impersonate any person or entity</li>
                      <li>Collect or harvest information about other users</li>
                      <li>Engage in any fraudulent or deceptive practices</li>
                      <li>Reverse engineer or attempt to extract source code</li>
                    </ul>
                    <p className="mt-4">
                      Violation of these prohibitions may result in immediate termination of your account and legal action.
                    </p>
                  </div>
                </section>

                <section id="intellectual-property" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Intellectual Property</h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      The Platform and its original content, features, and functionality are owned by KNS MultiRail and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                    </p>
                    <p>
                      You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our Platform without our prior written consent.
                    </p>
                  </div>
                </section>

                <section id="limitation-liability" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Limitation of Liability</h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      To the maximum extent permitted by law, KNS MultiRail shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Platform.
                    </p>
                    <p>
                      Our total liability to you for all claims arising from or related to the use of the Platform shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 mt-4 border border-gray-200">
                      <p className="text-sm text-gray-600">
                        <strong>Note:</strong> Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above limitations may not apply to you.
                      </p>
                    </div>
                  </div>
                </section>

                <section id="termination" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination</h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      We may terminate or suspend your account and access to the Platform immediately, without prior notice or liability, for any reason, including if you breach the Terms of Service.
                    </p>
                    <p>Upon termination:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Your right to use the Platform will immediately cease</li>
                      <li>We may delete or deactivate your account and all related information</li>
                      <li>You remain responsible for all charges incurred up to the date of termination</li>
                      <li>All provisions of these Terms that by their nature should survive termination shall survive</li>
                    </ul>
                  </div>
                </section>

                <section id="changes" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Changes to Terms</h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                    </p>
                    <p>
                      By continuing to access or use the Platform after those revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, please stop using the Platform.
                    </p>
                  </div>
                </section>

                <section id="governing-law" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Governing Law</h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      These Terms shall be governed by and construed in accordance with the laws of Sierra Leone, without regard to its conflict of law provisions.
                    </p>
                    <p>
                      Any disputes arising from or relating to these Terms or the Platform shall be subject to the exclusive jurisdiction of the courts of Sierra Leone.
                    </p>
                  </div>
                </section>

                <section id="contact" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Mail className="w-6 h-6 text-primary-600" />
                    13. Contact Information
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      If you have any questions about these Terms of Service, please contact us:
                    </p>
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <ul className="space-y-3">
                        <li className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-primary-600" />
                          <a href="mailto:info@knsmultirail.com" className="text-primary-600 hover:text-primary-700 font-medium">
                            info@knsmultirail.com
                          </a>
                        </li>
                        <li className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-primary-600" />
                          <a href="tel:+23277287881" className="text-primary-600 hover:text-primary-700 font-medium">
                            +232 77 287 881
                          </a>
                        </li>
                        <li className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-primary-600" />
                          <Link href="/contact" className="text-primary-600 hover:text-primary-700 font-medium">
                            Visit our Contact Page
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16 mt-16">
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
                <li>Payment Management</li>
                <li>Member Management</li>
                <li>Receipt Generation</li>
                <li>Analytics</li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/#faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                Terms
              </Link>
            </div>
            <p className="text-sm text-gray-400 mt-4 md:mt-0">
              © {new Date().getFullYear()} KNS MultiRail. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
