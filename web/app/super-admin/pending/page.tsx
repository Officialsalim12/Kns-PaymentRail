import { requireSuperAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function SuperAdminPendingPage() {
  const user = await requireSuperAdmin()
  const supabase = await createClient()

  // Pending organizations
  const { data: pendingOrganizations } = await supabase
    .from('organizations')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  // Pending password reset requests for all admins
  const { data: pendingPasswordResets } = await supabase
    .from('password_reset_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const hasAnyPending =
    (pendingOrganizations && pendingOrganizations.length > 0) ||
    (pendingPasswordResets && pendingPasswordResets.length > 0)

  return (
    <div className="w-full min-w-0 max-w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pending Items</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of all pending organizations and critical admin requests across the platform.
        </p>
      </div>

      {!hasAnyPending && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
          <p>No pending items at the moment.</p>
        </div>
      )}

      {pendingOrganizations && pendingOrganizations.length > 0 && (
        <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-blue-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Pending Organizations ({pendingOrganizations.length})
            </h2>
            <Link
              href="/super-admin/organizations?filter=pending"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-blue-50">
            {pendingOrganizations.map((org) => (
              <div key={org.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{org.name}</p>
                  <p className="text-xs text-gray-500">{org.organization_type}</p>
                </div>
                <Link
                  href={`/super-admin/organizations/${org.id}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingPasswordResets && pendingPasswordResets.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-orange-200">
            <h2 className="text-sm font-semibold text-gray-900">
              Pending Admin Password Reset Requests ({pendingPasswordResets.length})
            </h2>
          </div>
          <div className="divide-y divide-orange-50">
            {pendingPasswordResets.map((req) => (
              <div key={req.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{req.user_name}</p>
                  <p className="text-xs text-gray-500">{req.user_email}</p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-600">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

