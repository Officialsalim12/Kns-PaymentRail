'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  MessageSquare, 
  Settings, 
  Menu, 
  X,
  FileText,
  CreditCard
} from 'lucide-react'
import { getOrganizationAbbreviation } from '@/lib/utils/organization'

interface AdminSidebarProps {
  organization?: {
    name: string
    logo_url?: string | null
  } | null
}

export default function AdminSidebar({ organization = null }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/members', label: 'Members', icon: Users },
    { href: '/admin/payments', label: 'Payments', icon: Wallet },
    { href: '/admin/payment-tabs', label: 'Payment Tabs', icon: CreditCard },
    { href: '/admin/reports', label: 'Reports', icon: FileText },
    { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white border border-primary-200 text-primary-600 shadow-sm"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-40 shadow-sm
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-100">
            <Link href="/admin" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
              {organization?.logo_url && organization.logo_url.trim() !== '' ? (
                <img
                  src={organization.logo_url}
                  alt={organization.name || 'Organization'}
                  className="h-8 w-8 object-contain rounded-lg"
                  onError={(e) => {
                    // Fallback to abbreviation if image fails to load
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">
                    {organization?.name ? getOrganizationAbbreviation(organization.name) : 'K'}
                  </span>
                </div>
              )}
              <span className="text-xl font-semibold text-gray-900">
                {organization?.name || 'KNS MultiRail'}
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${active
                      ? 'bg-primary-50 text-primary-700 font-medium border border-primary-200'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-600'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
