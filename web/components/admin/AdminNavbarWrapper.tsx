import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import AdminNavbar from './Navbar'

export default async function AdminNavbarWrapper() {
    const user = await requireAuth()
    const supabase = await createClient()

    // Get organization details including logo
    const organizationId = user.profile?.organization_id
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

    return <AdminNavbar organization={organization} />
}
