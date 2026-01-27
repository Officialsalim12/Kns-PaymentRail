'use client'

import Link from 'next/link'
import { Building2, ChevronRight, Phone, Mail, MessageCircle, Facebook, Twitter, Linkedin, Instagram, Github, MapPin, Clock, Send, HelpCircle } from 'lucide-react'
import { useState } from 'react'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitStatus('success')
      setFormData({ name: '', email: '', subject: '', message: '' })
    }, 1000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link href="/" className="flex items-center">
              <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 mr-1.5 sm:mr-2" />
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">KNS MultiRail</span>
            </Link>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/login"
                className="text-xs sm:text-base text-gray-700 hover:text-gray-900 font-medium transition-colors px-1"
              >
                Sign In
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

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Contact Us</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200 py-8 sm:py-10 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
              Get in Touch
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed px-2">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Contact Information Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Contact Information</h2>

              <div className="space-y-6">
                {/* Email */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Email</h3>
                  </div>
                  <a
                    href="mailto:info@knsmultirail.com"
                    className="text-primary-600 hover:text-primary-700 text-sm ml-12 block mt-1"
                  >
                    info@knsmultirail.com
                  </a>
                </div>

                {/* Phone 1 */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Phone</h3>
                  </div>
                  <a
                    href="tel:+23277287881"
                    className="text-primary-600 hover:text-primary-700 text-sm ml-12 block mt-1"
                  >
                    +232 77 287 881
                  </a>
                </div>

                {/* Phone 2 */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Phone</h3>
                  </div>
                  <a
                    href="tel:+23279594218"
                    className="text-primary-600 hover:text-primary-700 text-sm ml-12 block mt-1"
                  >
                    +232 79 594 218
                  </a>
                </div>

                {/* WhatsApp */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">WhatsApp</h3>
                  </div>
                  <a
                    href="https://wa.me/23277287881"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 text-sm ml-12 block mt-1"
                  >
                    +232 77 287 881
                  </a>
                </div>

                {/* Business Hours */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Business Hours</h3>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1 ml-8">
                    <p>Monday - Friday: 9:00 AM - 5:00 PM</p>
                    <p>Saturday: 10:00 AM - 2:00 PM</p>
                    <p>Sunday: Closed</p>
                  </div>
                </div>

                {/* Location */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Location</h3>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">
                    Sierra Leone
                  </p>
                </div>
              </div>

              {/* Quick Links */}
              <div className="mt-6 sm:mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
                <div className="space-y-3 sm:space-y-2">
                  <Link
                    href="/privacy"
                    className="flex items-center text-sm text-gray-600 hover:text-primary-600 transition-colors py-1"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Privacy Policy
                  </Link>
                  <Link
                    href="/terms"
                    className="flex items-center text-sm text-gray-600 hover:text-primary-600 transition-colors py-1"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Terms of Service
                  </Link>
                  <Link
                    href="/#faq"
                    className="flex items-center text-sm text-gray-600 hover:text-primary-600 transition-colors py-1"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Frequently Asked Questions
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6 md:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Send us a Message</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Fill out the form below and we'll get back to you as soon as possible.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="billing">Billing Question</option>
                    <option value="partnership">Partnership Opportunity</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                {submitStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      Thank you for your message! We'll get back to you soon.
                    </p>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                      Something went wrong. Please try again later.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Social Media Section */}
        <div className="mt-8 sm:mt-10 md:mt-12">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sm:p-8">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Connect With Us</h2>
              <p className="text-sm sm:text-base text-gray-600 px-2">
                Follow us on social media to stay updated with the latest news and updates
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 max-w-4xl mx-auto">
              <a
                href="https://www.facebook.com/knsmultirail"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-[#1877F2] hover:shadow-lg transition-all group"
              >
                <Facebook className="w-6 h-6 sm:w-8 sm:h-8 text-[#1877F2] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">Facebook</span>
              </a>

              <a
                href="https://twitter.com/knsmultirail"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-[#1DA1F2] hover:shadow-lg transition-all group"
              >
                <Twitter className="w-6 h-6 sm:w-8 sm:h-8 text-[#1DA1F2] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">Twitter</span>
              </a>

              <a
                href="https://www.linkedin.com/company/knsmultirail"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-[#0077B5] hover:shadow-lg transition-all group"
              >
                <Linkedin className="w-6 h-6 sm:w-8 sm:h-8 text-[#0077B5] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">LinkedIn</span>
              </a>

              <a
                href="https://www.instagram.com/knsmultirail"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-[#E4405F] hover:shadow-lg transition-all group"
              >
                <Instagram className="w-6 h-6 sm:w-8 sm:h-8 text-[#E4405F] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">Instagram</span>
              </a>

              <a
                href="https://github.com/knsmultirail"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-800 hover:shadow-lg transition-all group"
              >
                <Github className="w-6 h-6 sm:w-8 sm:h-8 text-gray-800 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium text-gray-700">GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-10 sm:py-12 md:py-16 mt-8 sm:mt-12 md:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8 md:mb-12">
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
