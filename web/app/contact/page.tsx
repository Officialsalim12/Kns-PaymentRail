import Link from 'next/link'
import { Building2, Phone, Mail, MessageCircle, Facebook, Twitter, Linkedin, Instagram, Github } from 'lucide-react'

export default function ContactPage() {
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
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-primary-50 py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Get in <span className="text-primary-600">Touch</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {/* Email Card */}
            <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-primary-300 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-600 transition-colors">
                <Mail className="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
              <a 
                href="mailto:info@knsmultirail.com" 
                className="text-gray-600 hover:text-primary-600 transition-colors block"
              >
                info@knsmultirail.com
              </a>
            </div>

            {/* Phone Card 1 */}
            <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-primary-300 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-600 transition-colors">
                <Phone className="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone</h3>
              <a 
                href="tel:+23277287881" 
                className="text-gray-600 hover:text-primary-600 transition-colors block"
              >
                +232 77 287 881
              </a>
            </div>

            {/* Phone Card 2 */}
            <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-primary-300 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-600 transition-colors">
                <Phone className="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone</h3>
              <a 
                href="tel:+23279594218" 
                className="text-gray-600 hover:text-primary-600 transition-colors block"
              >
                +232 79 594 218
              </a>
            </div>

            {/* WhatsApp Card */}
            <div className="bg-white p-6 rounded-xl border-2 border-gray-100 hover:border-green-400 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-500 transition-colors">
                <MessageCircle className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp</h3>
              <a 
                href="https://wa.me/23277287881" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-green-600 transition-colors block"
              >
                +232 77 287 881
              </a>
            </div>
          </div>

          {/* Social Media Section */}
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Connect With Us
              </h2>
              <p className="text-lg text-gray-600">
                Follow us on social media to stay updated with the latest news and updates
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <a
                href="https://www.facebook.com/knsmultirail"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border-2 border-gray-100 hover:border-[#1877F2] hover:shadow-lg transition-all group"
              >
                <Facebook className="w-8 h-8 text-[#1877F2] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-gray-700">Facebook</span>
              </a>

              <a
                href="https://twitter.com/knsmultirail"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border-2 border-gray-100 hover:border-[#1DA1F2] hover:shadow-lg transition-all group"
              >
                <Twitter className="w-8 h-8 text-[#1DA1F2] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-gray-700">Twitter</span>
              </a>

              <a
                href="https://www.linkedin.com/company/knsmultirail"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border-2 border-gray-100 hover:border-[#0077B5] hover:shadow-lg transition-all group"
              >
                <Linkedin className="w-8 h-8 text-[#0077B5] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-gray-700">LinkedIn</span>
              </a>

              <a
                href="https://www.instagram.com/knsmultirail"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border-2 border-gray-100 hover:border-[#E4405F] hover:shadow-lg transition-all group"
              >
                <Instagram className="w-8 h-8 text-[#E4405F] mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-gray-700">Instagram</span>
              </a>

              <a
                href="https://github.com/knsmultirail"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border-2 border-gray-100 hover:border-gray-800 hover:shadow-lg transition-all group"
              >
                <Github className="w-8 h-8 text-gray-800 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-gray-700">GitHub</span>
              </a>
            </div>
          </div>
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
