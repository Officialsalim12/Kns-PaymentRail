import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import MemberDirectory from '@/components/member/MemberDirectory'

export default async function MemberDirectoryPage() {
  const user = await requireRole(['member', 'org_admin'])
  const supabase = await createClient()

  // Find this member's organization
  const { data: memberRecord } = await supabase
    .from('members')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const organizationId = memberRecord?.organization_id || user.profile?.organization_id

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <p className="text-sm text-gray-500">
          We could not determine your organization. Please contact your administrator.
        </p>
      </div>
    )
  }

  // Load other members in the same organization (with linked user), excluding the current member
  const { data: members } = await supabase
    .from('members')
    .select(
      `
        id,
        full_name,
        membership_id,
        status,
        users:user_id (
          profile_photo_url,
          bio,
          admission_date,
          show_public_profile
        )
      `,
    )
    .eq('organization_id', organizationId)
    .not('user_id', 'is', null)
    .neq('user_id', user.id)
    .order('full_name', { ascending: true })

  const initialMembers = (members || []).filter((m: any) => m.id) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <p className="text-sm text-gray-500 mt-1">
          Meet other members in your organization.
        </p>
      </div>

      <MemberDirectory initialMembers={initialMembers as any} />
    </div>
  )
}

