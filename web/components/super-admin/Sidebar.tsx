'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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

    interface MenuItem {
        href: string;
        label: string;
        icon: any;
        hiddenOnDesktop?: boolean;
    }

    const menuItems: MenuItem[] = [
        { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/super-admin/organizations', label: 'Organizations', icon: Building2 },
        { href: '/super-admin/users', label: 'Users', icon: Users },
        { href: '/super-admin/notifications', label: 'Notifications', icon: Bell },
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
          fixed top-0 left-0 h-full w-72 sm:w-80 bg-white border-r border-gray-100 z-50 shadow-xl
          transform transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                <div className="flex flex-col h-full">
                    <div className="border-b border-gray-50 px-3 sm:px-4 pt-5 sm:pt-6 pb-3 sm:pb-4">
                        <div className="flex items-center justify-between gap-2">
                            <Link
                                href="/super-admin"
                                className="hidden lg:flex group min-w-0 flex-1 items-center"
                                onClick={onClose}
                            >
                                <div className="relative h-[82px] w-full max-w-[320px] sm:h-[88px] sm:max-w-[360px] lg:h-[96px] lg:max-w-[420px]">
                                    <Image
                                        src="/fundflow-logo.png"
                                        alt="Fundflow"
                                        fill
                                        sizes="(max-width: 1024px) 420px, 460px"
                                        className="object-contain object-left"
                                        priority
                                    />
                                </div>
                            </Link>
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 ml-auto rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-900 lg:hidden"
                                aria-label="Close menu"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
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
                    ${item.hiddenOnDesktop ? 'hidden' : ''}
                  `}
                                >
                                    <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}`} />
                                    <span className="text-sm">{item.label}</span>
                                    {active && <div className="ml-auto w-1.5 h-5 bg-blue-600 rounded-full" />}
                                </Link>
                            )
                        })}
                    </nav>
                    {/* Sidebar Sign Out (Mobile) */}
                    <div className="lg:hidden p-4 border-t border-gray-50 mt-auto">
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 text-red-600 hover:bg-red-50 w-full group"
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
