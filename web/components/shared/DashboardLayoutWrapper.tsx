'use client'

import React, { useState, useEffect, cloneElement } from 'react'
import { usePathname } from 'next/navigation'
import DashboardHeader from './DashboardHeader'

interface DashboardLayoutWrapperProps {
    children: React.ReactNode
    sidebar: React.ReactElement
    userFullName?: string
    profilePhotoUrl?: string | null
    unreadNotificationCount?: number
    role: 'admin' | 'member' | 'super_admin'
    leftHeaderContent?: React.ReactNode
}

export default function DashboardLayoutWrapper({
    children,
    sidebar,
    userFullName,
    profilePhotoUrl,
    unreadNotificationCount,
    role,
    leftHeaderContent
}: DashboardLayoutWrapperProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const pathname = usePathname()

    // Close sidebar when navigating on mobile
    useEffect(() => {
        setIsSidebarOpen(false)
    }, [pathname])

    // Prevent scroll when sidebar is open on mobile
    useEffect(() => {
        if (isSidebarOpen) {
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
    }, [isSidebarOpen])

    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col">
            <DashboardHeader
                role={role}
                userFullName={userFullName}
                profilePhotoUrl={profilePhotoUrl}
                unreadNotificationCount={unreadNotificationCount}
                onMenuClick={() => setIsSidebarOpen(true)}
                leftContent={leftHeaderContent}
            />

            <div className="flex flex-1 relative">
                {/* Render the sidebar and inject standard props */}
                {cloneElement(sidebar as React.ReactElement<any>, {
                    isOpen: isSidebarOpen,
                    onClose: () => setIsSidebarOpen(false)
                })}

                <main className="flex-1 lg:ml-64 min-h-[calc(100vh-64px)]">
                    <div className="py-6 sm:py-8 min-h-full">
                        <div className="main-container">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
