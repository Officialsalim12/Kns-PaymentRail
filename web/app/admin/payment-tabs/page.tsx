import { requireOrgAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import PaymentTabsManagement from '@/components/admin/PaymentTabsManagement'

export default async function PaymentTabsPage() {
  const user = await requireOrgAdmin()
  const supabase = await createClient()

  const organizationId = user.profile?.organization_id

  if (!organizationId) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Organization ID not found. Please contact support.
        </div>
      </div>
    )
  }

  // Get all payment tabs for the organization with member information
  const { data: tabs } = await supabase
    .from('member_tabs')
    .select(`
      *,
      member:members(full_name, membership_id)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  return <PaymentTabsManagement organizationId={organizationId} initialTabs={tabs || []} />
}
