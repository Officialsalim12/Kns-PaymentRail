import Link from 'next/link'
import { Building2 } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-gray-300 py-8 sm:py-10 md:py-12 lg:py-16">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8 lg:mb-12">
                    <div className="sm:col-span-2 lg:col-span-1">
                        <div className="flex items-center mb-2 sm:mb-3 md:mb-4">
                            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary-400 mr-1.5 sm:mr-2 flex-shrink-0" />
                            <span className="text-base sm:text-lg md:text-xl font-bold text-white">KNS MultiRail</span>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                            KNS MultiRail helps thousands of organizations collect payments, manage members, and track transactions. Built for Sierra Leone.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base">Products</h4>
                        <ul className="space-y-1 sm:space-y-1.5 md:space-y-2 text-xs sm:text-sm">
                            <li>Payment Management</li>
                            <li>Member Management</li>
                            <li>Receipt Generation</li>
                            <li>Analytics</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base">Company</h4>
                        <ul className="space-y-1 sm:space-y-1.5 md:space-y-2 text-xs sm:text-sm">
                            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                            <li><Link href="#faq" className="hover:text-white transition-colors">FAQ</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-4 sm:pt-6 md:pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                    <div className="flex flex-wrap justify-center sm:justify-start gap-3 sm:gap-4 md:gap-6">
                        <Link href="/privacy" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors">
                            Privacy
                        </Link>
                        <Link href="/terms" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors">
                            Terms
                        </Link>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 text-center sm:text-right">
                        © {new Date().getFullYear()} KNS MultiRail. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}
