import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import LogoutButton from '@/components/auth/LogoutButton'
import Link from 'next/link'
import Image from 'next/image'
import { User, Bell } from 'lucide-react'
import { getOrganizationAbbreviation } from '@/lib/utils/organization'

export default async function MemberNavbar() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Get member info
  const { data: member } = await supabase
    .from('members')
    .select('full_name, organization_id')
    .eq('user_id', user.id)
    .single()

  // Get organization details including logo
  const organizationId = member?.organization_id || user.profile?.organization_id
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

  // Profile photo is stored in users table, not members table
  const profilePhotoUrl = user.profile?.profile_photo_url || null

  // Get unread notification count
  const { count: notificationCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  return (
    <nav className="bg-white shadow-sm border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2">
            {organization?.logo_url ? (
              <Image
                src={organization.logo_url}
                alt={organization.name}
                width={32}
                height={32}
                className="h-8 w-8 object-contain rounded-lg"
              />
            ) : (
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">
                  {organization?.name ? getOrganizationAbbreviation(organization.name) : 'K'}
                </span>
              </div>
            )}
            <h1 className="text-xl font-semibold text-gray-900">
              {organization?.name || 'KNS MultiRail'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Notification button */}
            <Link
              href="/member#notifications"
              className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Bell className="h-5 w-5" />
              {notificationCount && notificationCount > 0 && (
                <span className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </Link>

            <Link
              href="/profile"
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-blue-200 relative">
                {profilePhotoUrl ? (
                  <Image
                    src={profilePhotoUrl}
                    alt={member?.full_name || 'Member'}
                    width={32}
                    height={32}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                  />
                ) : null}
                {!profilePhotoUrl && (
                  <User className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <span className="hidden sm:block">{member?.full_name || 'Member'}</span>
            </Link>
            <div className="hidden sm:block">
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

