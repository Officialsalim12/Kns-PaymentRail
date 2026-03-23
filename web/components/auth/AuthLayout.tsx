'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface AuthLayoutProps {
    children: React.ReactNode
    title: string
    subtitle?: string
    imageSrc?: string // Optional image for the left side
    /**
     * Top "Back to Home" in header (mobile + desktop). Default false — use bottom link instead.
     * Set true only if you need the legacy top placement.
     */
    showTopBackLink?: boolean
    /** Hide the shared bottom "Back to Home" (rare; e.g. custom footer) */
    hideBottomBackLink?: boolean
}

export default function AuthLayout({
    children,
    title,
    subtitle,
    imageSrc,
    showTopBackLink = false,
    hideBottomBackLink = false,
}: AuthLayoutProps) {
    return (
        <div className="min-h-screen flex bg-white relative">
            {/* Left Interface - Branding/Visual */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-primary-900 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-800 to-primary-950" />

                {/* Abstract Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    {imageSrc ? (
                        <Image
                            src={imageSrc}
                            alt=""
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                        </svg>
                    )}
                </div>

                <div className="relative z-10 w-full flex flex-col justify-between p-12">
                    <div className="h-0" />

                    <div className="space-y-6">
                        {/* Marketing copy used on auth flows (login/register/get-started) */}
                        <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
                            Subscriptions &amp; Fundraising for <br />
                            Growing Organizations
                        </h1>
                        <p className="text-primary-200 text-lg max-w-md">
                            Manage subscription payments, memberships, and fundraising in one secure platform.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-primary-300">
                        <span>© 2026 Fundflow</span>
                        <span>•</span>
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                    </div>
                </div>
            </div>

            {/* Right Interface — no Fundflow logo here (logo only on landing + super admin) */}
            <div className="flex-1 flex flex-col justify-center px-4 pb-12 pt-8 sm:px-6 sm:pt-10 lg:flex-none lg:w-1/2 lg:py-12 xl:px-24 bg-white relative">
                {showTopBackLink && (
                    <div className="hidden lg:block absolute top-8 right-8">
                        <Link
                            href="/"
                            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 group"
                        >
                            <span>Back to Home</span>
                        </Link>
                    </div>
                )}

                <div className="mx-auto w-full max-w-sm lg:w-96">
                    {showTopBackLink && (
                        <div className="mb-10 flex justify-end lg:hidden">
                            <Link
                                href="/"
                                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors inline-flex items-center gap-1 rounded-lg py-2 px-1"
                            >
                                <span>← Back to Home</span>
                            </Link>
                        </div>
                    )}

                    <div className="mb-8">
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
                        {subtitle && (
                            <p className="mt-2 text-sm text-gray-600">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {children}

                    {!hideBottomBackLink && (
                        <div className="mt-8 border-t border-gray-100 pt-6 text-center">
                            <Link
                                href="/"
                                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Home
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
