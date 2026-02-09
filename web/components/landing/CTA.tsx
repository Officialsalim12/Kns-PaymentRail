import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function CTA() {
    return (
        <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-gradient-to-br from-primary-600 to-primary-700">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 text-center">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2 sm:mb-3 md:mb-4 px-1 sm:px-2">
                    We are your partner for growth
                </h2>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-primary-100 mb-4 sm:mb-6 md:mb-8 lg:mb-10 px-2 sm:px-3">
                    Let us help you grow your organization
                </p>
                <Link
                    href="/organization/register"
                    className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 lg:px-8 py-1.5 sm:py-2 md:py-3 lg:py-4 text-xs sm:text-sm md:text-base font-semibold text-primary-600 bg-white hover:bg-gray-50 rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                    Get Started
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </Link>
            </div>
        </section>
    )
}
