'use client'

import React, { useState, useEffect, cloneElement } from 'react'
import type { CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import DashboardHeader from './DashboardHeader'

interface DashboardTheme {
  primary?: string
  background?: string
  sidebarBg?: string
  text?: string
}

interface DashboardLayoutWrapperProps {
  children: React.ReactNode
  sidebar: React.ReactElement
  userFullName?: string
  profilePhotoUrl?: string | null
  unreadNotificationCount?: number
  role: 'admin' | 'member' | 'super_admin'
  leftHeaderContent?: React.ReactNode
  theme?: DashboardTheme
}

export default function DashboardLayoutWrapper({
  children,
  sidebar,
  userFullName,
  profilePhotoUrl,
  unreadNotificationCount,
  role,
  leftHeaderContent,
  theme,
}: DashboardLayoutWrapperProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

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

  const style: CSSProperties & Record<string, string> = {
    '--org-primary-color': theme?.primary ?? '#0ea5e9',
    '--org-bg-color': theme?.background ?? '#f9fafb',
    '--org-sidebar-bg-color': theme?.sidebarBg ?? '#020617',
    '--org-text-color': theme?.text ?? '#0f172a',
  }

  return (
    <div className="min-h-screen flex flex-col" style={style}>
      <DashboardHeader
        role={role}
        userFullName={userFullName}
        profilePhotoUrl={profilePhotoUrl}
        unreadNotificationCount={unreadNotificationCount}
        onMenuClick={() => setIsSidebarOpen(true)}
        leftContent={leftHeaderContent}
      />

      <div className="flex flex-1 relative bg-[color:var(--org-bg-color)]">
        {cloneElement(sidebar as React.ReactElement<any>, {
          isOpen: isSidebarOpen,
          onClose: () => setIsSidebarOpen(false),
        })}

        <main className="flex-1 lg:ml-64 min-h-[calc(100vh-64px)] transition-all duration-300 min-w-0 text-[color:var(--org-text-color)]">
          <div className="py-4 sm:py-8 min-h-full">
            <div className="main-container">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
