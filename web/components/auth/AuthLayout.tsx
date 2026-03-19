'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface AuthLayoutProps {
    children: React.ReactNode
    title: string
    subtitle?: string
    imageSrc?: string // Optional image for the left side
    largeLogo?: boolean
    matchLandingLogo?: boolean
}

export default function AuthLayout({
    children,
    title,
    subtitle,
    imageSrc,
    largeLogo = false,
    matchLandingLogo = false,
}: AuthLayoutProps) {
    const topLeftLogoBoxClassName = matchLandingLogo
        ? 'w-[245px] sm:w-[275px] md:w-[305px] lg:w-[340px] xl:w-[370px] h-[60px] sm:h-[66px] md:h-[70px] lg:h-[74px] xl:h-[80px]'
        : largeLogo
            ? 'w-[225px] sm:w-[255px] md:w-[285px] lg:w-[300px] h-[54px] sm:h-[60px] md:h-[64px] lg:h-[66px]'
            : 'w-[195px] sm:w-[225px] md:w-[255px] lg:w-[265px] h-[40px] sm:h-[42px] md:h-[48px] lg:h-[54px]'

    return (
        <div className="min-h-screen flex bg-white relative">
            {/* Consistent top-left logo for all auth screen sizes */}
            <div className="absolute top-4 left-0 z-50">
                <Link href="/" className="flex items-center">
                    {/* Fixed wrapper + `object-contain` keeps the logo non-stretched on all devices */}
                    <div className={`relative ${topLeftLogoBoxClassName}`}>
                        <Image
                            src="/fundflow-logo.png"
                            alt="Fundflow"
                            fill
                            sizes="(max-width: 1024px) 76vw, 340px"
                            className="object-contain object-left"
                            priority
                        />
                    </div>
                </Link>
            </div>

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
