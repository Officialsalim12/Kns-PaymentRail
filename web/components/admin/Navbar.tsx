'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'

interface AdminNavbarProps {
  organization: {
    id: string
    name: string
    logo_url: string | null
  } | null
}

export default function AdminNavbar({ organization }: AdminNavbarProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [isOpen])

  const navLinks = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/members', label: 'Members' },
    { href: '/admin/payments', label: 'Payments' },
    { href: '/admin/payment-tabs', label: 'Payment Tabs' },
    { href: '/admin/messages', label: 'Messages' },
    { href: '/admin/settings', label: 'Settings' },
  ]

  const getOrganizationAbbreviation = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-center gap-2 text-xl font-semibold text-gray-900 hover:text-gray-700">
              {organization?.logo_url ? (
                <Image
                  src={organization.logo_url}
                  alt={organization.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain rounded-lg"
                />
              ) : (
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">
                    {organization?.name ? getOrganizationAbbreviation(organization.name) : 'K'}
                  </span>
                </div>
              )}
              <span className="hidden sm:inline">{organization?.name || 'KNS MultiRail Pay'}</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-primary-600 pb-4 -mb-4 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 -mr-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-all active:scale-90"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 top-16 h-[calc(100vh-64px)] bg-white z-40 transition-all duration-300 md:hidden ${isOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-4 invisible pointer-events-none'
          }`}
      >
        <div className="flex flex-col h-full p-6 space-y-2 overflow-y-auto">
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-colors py-3 px-4 rounded-lg"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </nav>
  )
}

