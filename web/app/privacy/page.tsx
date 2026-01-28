'use client'

import Link from 'next/link'
import { Building2, ChevronRight, FileText, Shield, Lock, Eye, Database, Users, Mail, Phone } from 'lucide-react'
import { useState } from 'react'

const sections = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'information-we-collect', title: 'Information We Collect' },
  { id: 'how-we-use', title: 'How We Use Your Information' },
  { id: 'data-security', title: 'Data Security and Isolation' },
  { id: 'data-sharing', title: 'Data Sharing and Disclosure' },
  { id: 'your-rights', title: 'Your Rights' },
  { id: 'data-retention', title: 'Data Retention' },
  { id: 'children-privacy', title: "Children's Privacy" },
  { id: 'changes', title: 'Changes to This Privacy Policy' },
  { id: 'contact', title: 'Contact Us' },
]

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('introduction')

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
            <span className="text-gray-900 font-medium">Privacy Policy</span>
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
                    href="/terms"
                    className="flex items-center text-xs sm:text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Terms of Service
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
                    <Shield className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">Privacy Policy</h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                  KNS MultiRail ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our multitenant payment management platform.
                </p>
              </div>

              {/* Content Sections */}
              <div className="prose prose-lg max-w-none">
                <section id="introduction" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-primary-600" />
                    1. Introduction
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      At KNS MultiRail, we understand the importance of privacy and are committed to protecting your personal information. This Privacy Policy describes how we collect, use, share, and protect your information when you use our platform.
                    </p>
                    <p>
                      By using KNS MultiRail, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
                    </p>
                  </div>
                </section>

                <section id="information-we-collect" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Database className="w-6 h-6 text-primary-600" />
                    2. Information We Collect
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Personal Information</h3>
                      <p className="mb-3">We collect information that you provide directly to us, including:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Name, email address, and contact information</li>
                        <li>Organization details and registration information</li>
                        <li>Payment and transaction data</li>
                        <li>Member information and profiles</li>
                        <li>Account credentials and authentication information</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Automatically Collected Information</h3>
                      <p className="mb-3">We may automatically collect certain information about your device and usage patterns, including:</p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>IP address and browser type</li>
                        <li>Device information and operating system</li>
                        <li>Usage data and access logs</li>
                        <li>Cookies and similar tracking technologies</li>
                        <li>Referral sources and navigation patterns</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section id="how-we-use" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Eye className="w-6 h-6 text-primary-600" />
                    3. How We Use Your Information
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>We use the information we collect to:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Provide, maintain, and improve our services</li>
                      <li>Process payments and manage transactions</li>
                      <li>Manage member accounts and organizations</li>
                      <li>Send administrative information and updates</li>
                      <li>Respond to your inquiries and provide customer support</li>
                      <li>Detect, prevent, and address technical issues and security threats</li>
                      <li>Comply with legal obligations and enforce our terms</li>
                      <li>Analyze usage patterns to improve user experience</li>
                    </ul>
                  </div>
                </section>

                <section id="data-security" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-primary-600" />
                    4. Data Security and Isolation
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      KNS MultiRail uses a multitenant architecture where each organization's data is completely isolated and secure. Your organization's data, including member information, payment records, and receipts, is private to your organization only and is not accessible by other organizations using the platform.
                    </p>
                    <p>
                      We implement industry-standard security measures to protect your information, including:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>End-to-end encryption for sensitive data</li>
                      <li>Secure data storage with regular backups</li>
                      <li>Access controls and authentication mechanisms</li>
                      <li>Regular security audits and vulnerability assessments</li>
                      <li>Compliance with industry security standards</li>
                    </ul>
                    <p className="mt-4">
                      However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
                    </p>
                  </div>
                </section>

                <section id="data-sharing" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Sharing and Disclosure</h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Payment Gateway Providers:</strong> With our payment partners and other processors to facilitate transactions</li>
                      <li><strong>Legal Requirements:</strong> When required by law or to comply with legal processes, court orders, or government requests</li>
                      <li><strong>Protection of Rights:</strong> To protect our rights, privacy, safety, or property, or that of our users</li>
                      <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                      <li><strong>With Your Consent:</strong> When you have explicitly authorized us to share your information</li>
                    </ul>
                  </div>
                </section>

                <section id="your-rights" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights</h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>You have the following rights regarding your personal information:</p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li><strong>Access:</strong> Request access to and review your personal information</li>
                      <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                      <li><strong>Deletion:</strong> Request deletion of your information (subject to legal and contractual obligations)</li>
                      <li><strong>Opt-out:</strong> Opt-out of certain communications and marketing materials</li>
                      <li><strong>Data Portability:</strong> Request a copy of your data in a portable format</li>
                      <li><strong>Objection:</strong> Object to certain processing activities</li>
                    </ul>
                    <p className="mt-4">
                      To exercise these rights, please contact us using the information provided in the Contact Us section.
                    </p>
                  </div>
                </section>

                <section id="data-retention" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
                    </p>
                    <p>
                      When determining retention periods, we consider:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>The nature and sensitivity of the information</li>
                      <li>Legal and regulatory requirements</li>
                      <li>The purposes for which we process the information</li>
                      <li>Whether we can achieve those purposes through other means</li>
                    </ul>
                  </div>
                </section>

                <section id="children-privacy" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
                    </p>
                    <p>
                      If we become aware that we have collected personal information from a child without parental consent, we will take steps to delete such information from our servers.
                    </p>
                  </div>
                </section>

                <section id="changes" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to This Privacy Policy</h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of any material changes by:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Posting the new Privacy Policy on this page</li>
                      <li>Updating the "Last updated" date</li>
                      <li>Sending you an email notification (for significant changes)</li>
                      <li>Displaying a prominent notice on our platform</li>
                    </ul>
                    <p className="mt-4">
                      We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
                    </p>
                  </div>
                </section>

                <section id="contact" className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Mail className="w-6 h-6 text-primary-600" />
                    10. Contact Us
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p>
                      If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
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
