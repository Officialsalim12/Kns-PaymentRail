import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import OrganizationsList from '@/components/super-admin/OrganizationsList'

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  await requireSuperAdmin()
  const supabase = await createClient()

  // Get organizations based on filter
  let query = supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false })

  if (searchParams.filter === 'pending') {
    query = query.eq('status', 'pending')
  }

  const { data: organizations } = await query

  return <OrganizationsList organizations={organizations || []} filter={searchParams.filter} />
}
