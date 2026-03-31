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
  /**
   * Left margin for `<main>` at `lg+` — must match the fixed sidebar width.
   * Default `lg:ml-64` matches `w-64` sidebars (admin/member). Super admin uses `w-72 sm:w-80`, so pass `lg:ml-80`.
   */
  mainOffsetClassName?: string
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
  mainOffsetClassName = 'lg:ml-64',
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

        <main
          className={`flex-1 w-full min-h-[calc(100vh-64px)] min-w-0 transition-all duration-300 text-[color:var(--org-text-color)] ${mainOffsetClassName}`}
        >
          <div className="min-h-full w-full max-w-full px-4 sm:px-0 py-4 sm:py-8">
            <div className="main-container w-full max-w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
