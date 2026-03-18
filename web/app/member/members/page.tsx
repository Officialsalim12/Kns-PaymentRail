import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import NextImage from 'next/image'

const normalizeDateInputValue = (value: string | null | undefined) => {
  if (!value) return ''
  // Accept ISO timestamp or date; keep YYYY-MM-DD
  if (value.length >= 10) return value.slice(0, 10)
  return value
}

const formatDateForDisplay = (value: string | null | undefined) => {
  if (!value) return null
  const normalized = normalizeDateInputValue(value)
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return normalized
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left">
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Member</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Membership ID</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Bio</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                    Admission date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleMembers.map((member: any) => {
                  const statusDot =
                    member.status === 'active'
                      ? 'bg-green-500'
                      : member.status === 'inactive'
                      ? 'bg-gray-400'
                      : member.status === 'suspended'
                      ? 'bg-red-500'
                      : 'bg-amber-500'

                  const isPublic = member.users?.show_public_profile ?? true
                  const bio = isPublic ? member.users?.bio : null
                  const admissionDate = isPublic ? member.users?.admission_date : null

                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div className="relative w-10 h-10 rounded-full bg-primary-50 overflow-hidden flex items-center justify-center">
                            {member.users?.profile_photo_url ? (
                              <NextImage
                                src={member.users.profile_photo_url}
                                alt={member.full_name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-semibold text-primary-700">{member.full_name?.[0] || '?'}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="grid grid-cols-[0.5rem_1fr] gap-x-2">
                              <span className={`mt-1.5 h-2 w-2 rounded-full ${statusDot}`} />
                              <p className="text-sm font-semibold text-gray-900 truncate">{member.full_name}</p>
                              <span />
                              <p className="text-[11px] text-gray-500 font-mono uppercase tracking-widest truncate">
                                Member
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-mono text-gray-700">{member.membership_id}</span>
                      </td>

                      <td className="px-4 py-3">
                        {bio ? (
                          <p className="text-xs text-gray-600 line-clamp-2 whitespace-pre-line min-w-[260px]">
                            {bio}
                          </p>
                        ) : (
                          <span className="text-xs text-gray-400">{isPublic ? '—' : 'Hidden'}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {admissionDate ? (
                          <span className="text-xs text-gray-700">
                            {formatDateForDisplay(admissionDate) || admissionDate}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">{isPublic ? '—' : 'Hidden'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

