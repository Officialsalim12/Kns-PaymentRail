import { requireRole } from '@/lib/auth'
import MemberSidebar from '@/components/member/Sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole(['member', 'org_admin', 'super_admin'])
  const supabase = await createClient()

  // Get member info
  const { data: member } = await supabase
    .from('members')
    .select('full_name, organization_id')
    .eq('user_id', user.id)
    .single()

  // Get organization details including logo
  const organizationId = member?.organization_id || user.profile?.organization_id
  let organization = null
  if (organizationId) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()
    
    if (!error && data) {
      organization = {
        id: data.id,
        name: data.name,
        logo_url: data.logo_url || null
      }
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <MemberSidebar organization={organization || null} />
      
      {/* Main content area */}
      <div className="lg:ml-64">
        {/* Main content */}
        <main className="bg-gradient-to-br from-primary-50/30 via-white to-primary-50/30 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}

