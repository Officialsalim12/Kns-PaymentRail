import { requireOrgAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import MembersManagement from '@/components/admin/MembersManagement'

// Ensure this page runs in Node runtime (not Edge) to support Supabase
export const runtime = 'nodejs'

export default async function MembersPage() {
  const user = await requireOrgAdmin()
  const supabase = await createClient()

  const organizationId = user.profile?.organization_id

  // Get all members
  const { data: members } = await supabase
    .from('members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  return <MembersManagement members={members || []} organizationId={organizationId || ''} />
}

