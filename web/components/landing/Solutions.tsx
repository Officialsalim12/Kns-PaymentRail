import Image from 'next/image'

// Available solution categories for different organization types

const solutions = [
    {
        title: 'Interfaith Foundations & Councils',
        description: 'Perfect for churches and mosques to manage offerings, tithes, building project donations, or department contributions. Bring transparency and ease to your community\'s generous giving.',
        image: '/faith-preview.jpg',
        alt: 'Churches and Mosques',
    },
    {
        title: 'Change Lives Through Donations',
        description: 'Whether you\'re raising funds for a local charity or a global initiative, our platform provides a seamless way to collect and manage donations of any type, ensuring every cent makes a difference.',
        image: '/donation-preview.jpg',
        alt: 'Donations of any type',
    },
    {
        title: 'Crowdfunding',
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
        <section className="py-20 sm:py-24 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-20">
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">
                            Solutions
                        </span>
                        <span className="text-gray-600 mx-3">for</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-800">
                            Every
                        </span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">
                            Organization
                        </span>
                    </h2>
                    <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4 leading-relaxed">
                        Discover how KNS MultiRail can transform your daily financial operations and empower your community with cutting-edge payment solutions.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {solutions.map((solution, index) => (
                        <div 
                            key={index} 
                            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-700 overflow-hidden border border-gray-100"
                        >
                            <div className="relative bg-white rounded-2xl overflow-hidden">
                                <div className="relative h-96 lg:h-[28rem] overflow-hidden">
                                    <Image
                                        src={solution.image}
                                        alt={solution.alt}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                                        style={{ objectPosition: 'center 20%' }}
                                    />
                                </div>
                                
                                <div className="p-8 lg:p-10">
                                    <div className="flex items-center mb-4">
                                        <div className="w-8 h-0.5 bg-blue-600 rounded-full"></div>
                                        <div className="w-2 h-2 bg-blue-600 rounded-full ml-2"></div>
                                    </div>
                                    
                                    <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                                        {solution.title}
                                    </h3>
                                    
                                    <p className="text-gray-600 leading-relaxed text-base lg:text-lg">
                                        {solution.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
