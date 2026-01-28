'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Building2,
    Users,
    ShieldCheck,
    Activity,
    LogOut,
    User as UserIcon,
    X,
    Menu,
    Bell,
    Settings
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SuperAdminSidebarProps {
    userFullName?: string
    profilePhotoUrl?: string | null
    unreadNotificationCount?: number
    isOpen?: boolean
    onClose?: () => void
}

export default function SuperAdminSidebar({
    userFullName = 'Super Admin',
    profilePhotoUrl = null,
    unreadNotificationCount = 0,
    isOpen = false,
    onClose
}: SuperAdminSidebarProps) {
    const pathname = usePathname()
    const router = useRouter()

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const menuItems = [
        { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/super-admin/organizations', label: 'Organizations', icon: Building2 },
        { href: '/super-admin/users', label: 'Users', icon: Users },
        { href: '/super-admin/password-resets', label: 'Password Resets', icon: ShieldCheck },
        { href: '/super-admin/activity-logs', label: 'Activity Logs', icon: Activity },
    ]

    const isActive = (href: string) => {
        if (href === '/super-admin') {
            return pathname === '/super-admin'
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
          fixed top-0 left-0 h-full w-64 sm:w-72 bg-white border-r border-gray-100 z-50 shadow-xl
          transform transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo/Header */}
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <Link href="/super-admin" className="flex items-center gap-3 group" onClick={onClose}>
                            <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                                <ShieldCheck className="text-white h-6 w-6" />
                            </div>
                            <div>
                                <span className="text-lg font-bold text-gray-900 block leading-none">KNS MultiRail</span>
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1 block">Super Admin</span>
                            </div>
                        </Link>
                        <button onClick={onClose} className="lg:hidden p-2 text-gray-400 hover:text-gray-900 transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                        {menuItems.map((item) => {
                            const Icon = item.icon
                            const active = isActive(item.href)
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`
                    flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group
                    ${active
                                            ? 'bg-blue-50 text-blue-700 font-bold shadow-sm border border-blue-100'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                                        }
                  `}
                                >
                                    <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}`} />
                                    <span className="text-sm">{item.label}</span>
                                    {active && <div className="ml-auto w-1.5 h-5 bg-blue-600 rounded-full" />}
                                </Link>
                            )
                        })}
                    </nav>

                </div>
            </aside>
        </>
    )
}
