import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function Hero() {
    return (
        <section className="relative bg-gradient-to-br from-primary-50 via-white to-primary-50 pt-28 pb-10 sm:pt-32 sm:pb-16 md:pt-40 md:pb-20 lg:pt-48 lg:pb-24 xl:pt-56 xl:pb-32 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-4 sm:mb-6 leading-tight">
                        Modern Payments for <br className="hidden sm:block" />
                        <span className="text-primary-600">Growing Organizations</span>
                    </h1>
                    <p className="text-sm sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-10 max-w-3xl mx-auto leading-relaxed px-2">
                        Sierra Leone&apos;s most reliable payment management platform, offering an end-to-end solution that boosts payment performance and streamlines finances. We help organizations grow revenue and retain members.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-2 sm:px-0">
                        <Link
                            href="/organization/register"
                            className="w-full sm:w-auto px-6 py-2.5 sm:py-3 text-sm sm:text-lg font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                            Get Started
                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Link>
                        <Link
                            href="/contact"
                            className="w-full sm:w-auto px-6 py-2.5 sm:py-3 text-sm sm:text-lg font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-all border-2 border-gray-200 hover:border-gray-300"
                        >
                            Company Contact
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
