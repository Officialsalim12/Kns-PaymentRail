'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Receipt,
  History,
  Bell,
  Wallet,
  Menu,
  X,
  Settings,
  LogOut,
  User as UserIcon
} from 'lucide-react'
import { getOrganizationAbbreviation } from '@/lib/utils/organization'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface MemberSidebarProps {
  organization?: {
    name: string
    logo_url?: string | null
  } | null
  userFullName?: string
  profilePhotoUrl?: string | null
  unreadNotificationCount?: number
  isOpen?: boolean
  onClose?: () => void
}

export default function MemberSidebar({
  organization = null,
  userFullName = 'Member',
  profilePhotoUrl = null,
  unreadNotificationCount = 0,
  isOpen = false,
  onClose
}: MemberSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const menuItems = [
    { href: '/member', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/member/receipts', label: 'Receipts', icon: Receipt },
    { href: '/member/payment-history', label: 'Payment History', icon: History },
    { href: '/member/notifications', label: 'Notifications', icon: Bell, hiddenOnDesktop: true },
    { href: '/member/payments', label: 'Payments', icon: Wallet },
  ]

  const isActive = (href: string) => {
    if (href === '/member') {
      return pathname === '/member'
    }
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-all duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-40 shadow-xl
          transform transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <Link href="/member" className="flex items-center gap-2" onClick={onClose}>
              {organization?.logo_url ? (
                <Image
                  src={organization.logo_url}
                  alt={organization.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">
                    {organization?.name ? getOrganizationAbbreviation(organization.name) : 'K'}
                  </span>
                </div>
              )}
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                {organization?.name || 'KNS MultiRail'}
              </span>
            </Link>
            <button onClick={onClose} className="lg:hidden p-2 text-gray-400 hover:text-gray-900 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${active
                      ? 'bg-primary-50 text-primary-700 font-bold border border-primary-100/50 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600'
                    }
                    ${item.hiddenOnDesktop ? 'hidden' : ''}
                  `}
                >
                  <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${active ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-600'}`} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}
          </nav>
          {/* Sidebar Sign Out (Mobile) */}
          <div className="lg:hidden p-4 border-t border-gray-50 mt-auto">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-red-600 hover:bg-red-50 w-full group"
            >
              <LogOut className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm font-semibold">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
