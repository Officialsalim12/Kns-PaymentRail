import { requireOrgAdmin } from '@/lib/auth'
import AdminSidebar from '@/components/admin/Sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireOrgAdmin()
  const supabase = await createClient()

  // Get organization details including logo
  const organizationId = user.profile?.organization_id
  let organization = null
  if (organizationId) {
    // Try to fetch with logo_url first, fallback to all columns if it fails
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()
    
    if (error) {
      // Silently handle error - organization might not have logo_url column yet
      // This will be resolved once migration is run
    }
    
    if (data) {
      // Extract only the fields we need
      organization = {
        name: data.name,
        logo_url: data.logo_url || null
      }
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <AdminSidebar organization={organization} />
      
      {/* Main content area */}
      <div className="lg:ml-64">
        {/* Main content */}
        <main className="px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 bg-gradient-to-br from-primary-50/30 via-white to-primary-50/30 min-h-screen">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

