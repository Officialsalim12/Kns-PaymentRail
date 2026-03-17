import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import NextImage from 'next/image'

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
          show_public_profile
        )
      `,
    )
    .eq('organization_id', organizationId)
    .not('user_id', 'is', null)
    .neq('user_id', user.id)
    .order('full_name', { ascending: true })

  const visibleMembers = (members || []).filter((m: any) => m.id) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <p className="text-sm text-gray-500 mt-1">
          Meet other members in your organization.
        </p>
      </div>

      {visibleMembers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-500">
          No members to show yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleMembers.map((member: any) => {
            const statusFrame =
              member.status === 'active'
                ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-white'
                : member.status === 'inactive'
                ? 'ring-2 ring-gray-400 ring-offset-2 ring-offset-white'
                : member.status === 'suspended'
                ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-white'
                : 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white'

            return (
              <div
                key={member.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center text-center hover:shadow-sm transition-shadow"
              >
                <div
                  className={`w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center overflow-hidden mb-3 ${statusFrame}`}
                >
                  {member.users?.profile_photo_url ? (
                    <NextImage
                      src={member.users.profile_photo_url}
                      alt={member.full_name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-primary-700">
                      {member.full_name?.[0] || '?'}
                    </span>
                  )}
                </div>
              <p className="text-sm font-semibold text-gray-900">{member.full_name}</p>
              <p className="text-[11px] text-gray-400 font-mono uppercase tracking-widest mt-0.5">
                ID: {member.membership_id}
              </p>
                {member.users?.bio && (member.users.show_public_profile ?? true) && (
                  <p className="mt-2 text-xs text-gray-600 line-clamp-3 whitespace-pre-line">
                    {member.users.bio}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

