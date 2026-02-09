import { Users, CreditCard, FileText } from 'lucide-react'

const features = [
    {
        icon: Users,
        title: 'Member Management',
        description: "Efficiently manage your organization's members with approval workflows, role-based access control, and comprehensive member profiles.",
    },
    {
        icon: CreditCard,
        title: 'Payment Tracking',
        description: 'Track all payments in real-time with comprehensive history, status monitoring, detailed analytics, and payment tab management.',
    },
    {
        icon: FileText,
        title: 'Automated Receipts',
        description: 'Automatically generate professional PDF receipts for all transactions with secure storage and easy access for members.',
    },
]

export default function Features() {
    return (
        <section className="py-16 sm:py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
                        Take charge of your organization
                    </h2>
                    <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
                        Accept payments, manage finances, grow your revenue. Join us during our pilot phase and help shape the future of payment management.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className={`text-center p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-white border border-primary-100 ${index === 2 ? 'sm:col-span-2 lg:col-span-1' : ''
                                }`}
                        >
                            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <feature.icon className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                            <p className="text-base text-gray-600">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
