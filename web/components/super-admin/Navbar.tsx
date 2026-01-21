import Link from 'next/link'

export default async function SuperAdminNavbar() {
  return (
    <nav className="bg-white shadow-sm border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/super-admin" className="text-xl font-semibold text-gray-900 hover:text-gray-700">
              KNS MultiRail
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

