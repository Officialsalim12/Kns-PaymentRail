'use client'

import { Bell, Settings, LogOut, User as UserIcon, Menu } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface DashboardHeaderProps {
    userFullName?: string
    profilePhotoUrl?: string | null
    unreadNotificationCount?: number
    role: 'admin' | 'member' | 'super_admin'
    onMenuClick?: () => void
    leftContent?: React.ReactNode
}

export default function DashboardHeader({
    userFullName = 'User',
    profilePhotoUrl = null,
    unreadNotificationCount = 0,
    role,
    onMenuClick,
    leftContent
}: DashboardHeaderProps) {
    const router = useRouter()

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const getNotificationHref = () => {
        switch (role) {
            case 'admin': return '/admin/notifications'
            case 'member': return '/member/notifications'
            case 'super_admin': return '/super-admin/password-resets'
            default: return '#'
        }
    }

    const getSettingsHref = () => {
        switch (role) {
            case 'admin': return '/admin/settings'
            case 'member': return '/profile'
            case 'super_admin': return '/profile'
            default: return '#'
        }
    }

    const getRoleBadge = () => {
        switch (role) {
            case 'admin': return 'Administrator'
            case 'member': return 'Member'
            case 'super_admin': return 'Super Admin'
            default: return ''
        }
    }

    return (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100/50 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8 xl:px-12 py-3 sm:py-4">
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Menu/Mobile Toggle and Branding/Title */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        {onMenuClick && (
                            <button
                                onClick={onMenuClick}
                                className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-all active:scale-95"
                                aria-label="Toggle menu"
                            >
                                <Menu className="h-6 w-6" />
                            </button>
                        )}

                        {leftContent && (
                            <div className="flex items-center gap-2">
                                {leftContent}
                            </div>
                        )}
                    </div>

                    {/* Right: Quick Actions & Profile */}
                    <div className="flex items-center gap-1 sm:gap-3">
                        {/* Quick Actions Group */}
                        <div className="flex items-center gap-0.5 sm:gap-2 mr-1 sm:mr-2 border-r border-gray-100 pr-1 sm:pr-2">
                            <Link
                                href={getNotificationHref()}
                                className="relative p-1.5 sm:p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all group"
                                title="Notifications"
                            >
                                <Bell className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                                {unreadNotificationCount > 0 && (
                                    <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold px-1 rounded-full min-w-[14px] sm:min-w-[17px] h-3.5 sm:h-4 flex items-center justify-center shadow-lg border-2 border-white ring-red-200">
                                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                                    </span>
                                )}
                            </Link>

                            <Link
                                href={getSettingsHref()}
                                className="p-1.5 sm:p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all group"
                                title="Settings"
                            >
                                <Settings className="h-4 w-4 sm:h-5 sm:w-5 group-hover:rotate-45 transition-transform" />
                            </Link>

                            <button
                                onClick={handleSignOut}
                                className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
                                title="Sign Out"
                            >
                                <LogOut className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>

                        {/* User Profile */}
                        <div className="flex items-center gap-2 sm:gap-3 pl-0.5 sm:pl-2">
                            <div className="hidden sm:flex flex-col items-end max-w-[120px]">
                                <p className="text-sm font-bold text-gray-900 leading-none truncate w-full text-right">{userFullName}</p>
                                <p className="text-[10px] font-semibold text-gray-400 mt-1 uppercase tracking-wider">{getRoleBadge()}</p>
                            </div>

                            <Link href={getSettingsHref()} className="relative shrink-0 group">
                                <div className="absolute -inset-0.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
                                <div className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-xl overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-100">
                                    {profilePhotoUrl ? (
                                        <img
                                            src={profilePhotoUrl}
                                            alt={userFullName}
                                            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="h-full w-full bg-primary-50 flex items-center justify-center">
                                            <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
                                        </div>
                                    )}
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
