import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import AdminNavbar from './Navbar'

type Organization = {
  id: string
  name: string
  logo_url: string | null
}

export default async function AdminNavbarWrapper() {
  const user = await requireAuth()
  const supabase = await createClient()

  const organizationId = user.profile?.organization_id
  let organization: Organization | null = null

  if (organizationId) {
    const { data } = await supabase
      .from('organizations')
      .select('id, name, logo_url')
      .eq('id', organizationId)
      .single()

    if (data) {
      organization = {
        id: data.id,
        name: data.name,
        logo_url: data.logo_url ?? null,
      }
    }
  }

  return <AdminNavbar organization={organization} />
}
