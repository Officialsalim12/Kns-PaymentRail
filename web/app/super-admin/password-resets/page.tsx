import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import PasswordResetManagement from '@/components/super-admin/PasswordResetManagement'

export default async function PasswordResetRequestsPage() {
  await requireSuperAdmin()
  const supabase = await createClient()

  // Get all password reset requests
  const { data: requests } = await supabase
    .from('password_reset_requests')
    .select('*')
    .order('created_at', { ascending: false })

  return <PasswordResetManagement requests={requests || []} />
}
