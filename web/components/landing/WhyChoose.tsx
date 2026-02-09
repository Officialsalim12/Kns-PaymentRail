import { Shield, Lock, Building2 } from 'lucide-react'

const benefits = [
    {
        icon: Building2,
        title: 'Multi-Tenant Architecture',
        description: 'Complete data isolation and security for each organization',
    },
    {
        icon: Shield,
        title: 'Role-Based Access Control',
        description: 'Granular permissions for Super Admins, Org Admins, and Members',
    },
    {
        icon: Lock,
        title: 'Secure & Scalable',
        description: 'Built on enterprise-grade infrastructure with bank-level security',
    },
]

export default function WhyChoose() {
    return (
        <section id="benefits" className="py-16 sm:py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
                        Why Choose KNS MultiRail?
                    </h2>
                    <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
                        Everything you need to manage payments and members efficiently
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
                    {benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-start gap-4 sm:gap-6 p-6 rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors">
                            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <benefit.icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h4>
                                <p className="text-base text-gray-600 leading-relaxed">{benefit.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
