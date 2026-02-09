import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { getOrganizationAbbreviation } from '@/lib/utils/organization'

export default async function AdminNavbar() {
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

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-center gap-2 text-xl font-semibold text-gray-900 hover:text-gray-700">
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
              <span>{organization?.name || 'KNS MultiRail Pay'}</span>
            </Link>
            <div className="hidden md:flex gap-6">
              <Link href="/admin" className="text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-primary-600 pb-4 -mb-4 transition-colors">
                Dashboard
              </Link>
              <Link href="/admin/members" className="text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-primary-600 pb-4 -mb-4 transition-colors">
                Members
              </Link>
              <Link href="/admin/payments" className="text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-primary-600 pb-4 -mb-4 transition-colors">
                Payments
              </Link>
              <Link href="/admin/payment-tabs" className="text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-primary-600 pb-4 -mb-4 transition-colors">
                Payment Tabs
              </Link>
              <Link href="/admin/messages" className="text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-primary-600 pb-4 -mb-4 transition-colors">
                Messages
              </Link>
              <Link href="/admin/settings" className="text-sm font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-primary-600 pb-4 -mb-4 transition-colors">
                Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

