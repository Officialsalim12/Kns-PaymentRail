const methods = [
    { name: 'Card', icon: '💳' },
    { name: 'Bank Account', icon: '🏦' },
    { name: 'Bank Transfer', icon: '🔄' },
    { name: 'Mobile Money', icon: '📱' },
]

export default function PaymentMethods() {
    return (
        <section id="features" className="py-16 sm:py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
                        Delight members with seamless collections
                    </h2>
                    <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
                        Give your members a modern, frictionless way to pay subscriptions and support fundraisers. Integrate Fundflow once and let them contribute however they want.
                    </p>
                </div>

                <div className="bg-white rounded-2xl p-8 sm:p-12 border border-gray-200">
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 sm:mb-12 text-center">
                        Collect through multiple channels
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                        {methods.map((method, idx) => (
                            <div key={idx} className="text-center p-4 sm:p-6 rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors">
                                <div className="text-2xl sm:text-4xl mb-2 sm:mb-4">{method.icon}</div>
                                <div className="text-xs sm:text-base font-semibold text-gray-900 break-words">{method.name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
