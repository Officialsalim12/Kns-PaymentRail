import { requireSuperAdmin } from '@/lib/auth'
import SuperAdminNavbar from '@/components/super-admin/Navbar'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireSuperAdmin()

  return (
    <div className="min-h-screen bg-blue-50">
      <SuperAdminNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

