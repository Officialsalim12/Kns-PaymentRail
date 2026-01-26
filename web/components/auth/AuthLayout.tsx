'use client'

import React from 'react'
import Link from 'next/link'
import { Building2 } from 'lucide-react'

interface AuthLayoutProps {
    children: React.ReactNode
    title: string
    subtitle?: string
    imageSrc?: string // Optional image for the left side
}

export default function AuthLayout({ children, title, subtitle, imageSrc }: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Interface - Branding/Visual */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-primary-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-800 to-primary-950" />

                {/* Abstract Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                    </svg>
                </div>

                <div className="relative z-10 w-full flex flex-col justify-between p-12">
                    <div>
                        <Link href="/" className="flex items-center space-x-3 text-white">
                            <Building2 className="w-8 h-8" />
                            <span className="text-2xl font-bold tracking-tight">KNS MultiRail</span>
                        </Link>
                    </div>

                    <div className="space-y-6">
                        <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
                            Seamless Payments for <br />
                            Modern Organizations
                        </h1>
                        <p className="text-primary-200 text-lg max-w-md">
                            Manage your organization's payments, memberships, and financial reports in one secure platform.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-primary-300">
                        <span>© 2024 KNS Payment Rail</span>
                        <span>•</span>
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                    </div>
                </div>
            </div>

            {/* Right Interface - Form */}
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:w-1/2 xl:px-24 bg-white relative">
                {/* Desktop Home Button (Absolute positioned top right of this panel) */}
                <div className="hidden lg:block absolute top-8 right-8">
                    <Link
                        href="/"
                        className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 group"
                    >
                        <span>Back to Home</span>
                    </Link>
                </div>

                <div className="mx-auto w-full max-w-sm lg:w-96">
                    <div className="lg:hidden mb-10">
                        <Link
                            href="/"
                            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
                        >
                            <span>← Back to Home</span>
                        </Link>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
                        {subtitle && (
                            <p className="mt-2 text-sm text-gray-600">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {children}
                </div>
            </div>
        </div>
    )
}
