'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Building2, Menu, X, ArrowRight } from 'lucide-react'

export default function LandingNavbar() {
    const [isOpen, setIsOpen] = useState(false)
    const [isScrolled, setIsScrolled] = useState(false)

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Prevent scroll when menu is open
    useEffect(() => {
        if (isOpen) {
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
    }, [isOpen])

    const navLinks = [
        { href: '#features', label: 'Features' },
        { href: '#benefits', label: 'Benefits' },
        { href: '#faq', label: 'FAQ' },
    ]

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${(isScrolled || isOpen)
                    ? 'bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm py-3'
                    : 'bg-white/50 backdrop-blur-md py-4 sm:py-5'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-10 sm:h-12">
                    {/* Logo */}
                    <Link href="/" className="flex items-center group transition-transform hover:scale-102">
                        <div className="relative flex items-center">
                            <div className="p-1.5 sm:p-2 bg-primary-600 rounded-xl shadow-lg shadow-primary-600/20 group-hover:scale-110 transition-transform">
                                <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white flex-shrink-0" />
                            </div>
                            <span className="ml-3 text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-none">
                                KNS <span className="text-primary-600">MultiRail</span>
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="text-sm font-bold text-gray-500 hover:text-primary-600 transition-colors uppercase tracking-widest"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center space-x-4">
                        <Link
                            href="/login"
                            className="text-xs sm:text-sm font-black text-gray-600 hover:text-primary-600 tracking-widest transition-all px-4 py-2 uppercase"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/organization/register"
                            className="px-5 py-2.5 sm:px-6 sm:py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 hover:-translate-y-0.5 active:scale-95"
                        >
                            Get Started
                        </Link>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 -mr-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all active:scale-90"
                        aria-label="Toggle menu"
                    >
                        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <div
                className={`fixed inset-0 top-[64px] sm:top-[84px] h-[calc(100vh-64px)] sm:h-[calc(100vh-84px)] bg-white z-40 transition-all duration-300 md:hidden ${isOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-4 invisible pointer-events-none'
                    }`}
            >
                <div className="flex flex-col h-full p-6 space-y-8 overflow-y-auto">
                    <nav className="space-y-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className="block text-2xl font-black text-gray-900 hover:text-primary-600 transition-colors py-3 border-b border-gray-50"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex flex-col space-y-4 pt-4">
                        <Link
                            href="/login"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl text-lg font-bold text-gray-900 group"
                        >
                            <span>Sign In</span>
                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="/organization/register"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-center p-5 bg-primary-600 text-white rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl shadow-primary-600/20"
                        >
                            Get Started
                        </Link>
                    </div>

                    <div className="mt-auto text-center pb-12">
                        <p className="text-gray-400 text-sm font-medium">© {new Date().getFullYear()} KNS MultiRail</p>
                    </div>
                </div>
            </div>
        </header>
    )
}
