import { Shield } from 'lucide-react'

export default function Security() {
    return (
        <section className="py-8 sm:py-10 md:py-12 lg:py-14 xl:py-16 bg-primary-600">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-white/20 rounded-full mb-3 sm:mb-4 md:mb-6">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3 md:mb-4 px-1 sm:px-2">
                    Enterprise-Grade Security
                </h2>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-primary-100 leading-relaxed px-2 sm:px-3">
                    KNS MultiRail meets the highest possible global standards of data security and protection. Our policies move through constant iteration and undergo rigorous testing to ensure we proactively mitigate any potential threats to your payment and member data.
                </p>
            </div>
        </section>
    )
}
