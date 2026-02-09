import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import UsersList from '@/components/super-admin/UsersList'

export default async function UsersPage() {
  await requireSuperAdmin()
  const supabase = await createClient()

  // Get all users - exclude super_admin users
  const { data: users } = await supabase
    .from('users')
    .select('*, organization:organizations(id, name)')
    .neq('role', 'super_admin')
    .order('created_at', { ascending: false })

  return <UsersList users={users || []} />
}
