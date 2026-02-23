import Image from 'next/image'

const solutions = [
    {
        title: 'Faith-Based Organizations',
        description: 'Perfect for churches and mosques to manage offerings, tithes, building project donations, or department contributions. Bring transparency and ease to your community\'s generous giving.',
        image: '/faith-preview.jpg',
        alt: 'Churches and Mosques',
    },
    {
        title: 'Donations for Any Cause',
        description: 'Whether you\'re raising funds for a local charity or a global initiative, our platform provides a seamless way to collect and manage donations of any type, ensuring every cent makes a difference.',
        image: '/donation-preview.jpg',
        alt: 'Donations of any type',
    },
    {
        title: 'Community Crowdfunding',
        description: 'Empower your community projects with robust crowdfunding tools. Manage multiple contributions effectively and keep your donors updated on the progress of your shared goals.',
        image: '/community-crownfunding.jpg',
        alt: 'Crowdfunding donations',
    },
    {
        title: 'Institutional Contributions',
        description: 'Ideal for offices and institutions to manage monthly or yearly staff contributions, event funds, or internal collections with automated tracking and reporting.',
        image: '/Institution-contribution.jpg',
        alt: 'Office and Institutional contributions',
    },
]

export default function Solutions() {
    return (
        <section className="py-20 sm:py-24 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                        Solutions for Every Organization
                    </h2>
                    <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
                        Discover how KNS MultiRail can transform your daily financial operations and empower your community.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
                    {solutions.map((solution, index) => (
                        <div key={index} className="group flex flex-col items-center text-center">
                            <div className="relative w-full aspect-[4/3] overflow-hidden transition-transform duration-500 group-hover:scale-[1.02] mb-8">
                                <Image
                                    src={solution.image}
                                    alt={solution.alt}
                                    fill
                                    className="object-contain"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">{solution.title}</h3>
                            <p className="text-gray-600 leading-relaxed max-w-md">
                                {solution.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
