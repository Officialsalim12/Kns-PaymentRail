'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Building2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  Lock,
  Sparkles,
  ArrowUpRight,
  Shield,
  Activity,
  User,
  Settings,
  LogOut,
  Bell
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  organization_type: string
  admin_email: string
  status: string
  created_at: string
  memberCount?: number
}

interface Stats {
  totalOrganizations: number
  pendingApprovals: number
  totalUsers: number
  pendingPasswordResets: number
}

interface Props {
  organizations: Organization[]
  stats: Stats
  userFullName?: string
  profilePhotoUrl?: string | null
  unreadNotificationCount?: number
}

export default function SuperAdminDashboard({
  organizations: initialOrgs,
  stats,
  userFullName = 'Super Admin',
  profilePhotoUrl = null,
  unreadNotificationCount = 0
}: Props) {
  const router = useRouter()
  const [organizations, setOrganizations] = useState(initialOrgs)
  const [loading, setLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  const handleStatusChange = async (orgId: string, newStatus: 'approved' | 'suspended') => {
    setLoading(orgId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus })
        .eq('id', orgId)

      if (error) {
        throw error
      }

      setOrganizations(orgs =>
        orgs.map(org => org.id === orgId ? { ...org, status: newStatus } : org)
      )
      router.refresh()
    } catch (err) {
      console.error('Error updating organization status:', err)
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (orgId: string) => {
    setLoading(orgId)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId)

      if (error) {
        throw error
      }

      // Remove from local state
      setOrganizations(orgs => orgs.filter(org => org.id !== orgId))
      setDeleteConfirm(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete organization')
      console.error('Error deleting organization:', err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="relative p-7 sm:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-6">
              <div className="space-y-2">
                <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                  Super Admin Dashboard
                </h1>
              </div>
            </div>

            {/* Actions removed as they are now in the global Navbar */}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Organization</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this organization? This action cannot be undone and will permanently remove all associated data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={loading === deleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === deleteConfirm ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Organizations Card */}
        <Link
          href="/super-admin/organizations"
          className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-300 overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div className="p-3.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Organizations</p>
              <p className="text-3xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{stats.totalOrganizations}</p>
            </div>
          </div>
        </Link>

        {/* Pending Approvals Card */}
        <Link
          href="/super-admin/organizations?filter=pending"
          className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-orange-200 transition-all duration-300 overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div className="p-3.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <Clock className="h-6 w-6 text-white" />
              </div>
              {stats.pendingApprovals > 0 && (
                <div className="flex items-center gap-2">
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-full border border-orange-200">
                    {stats.pendingApprovals}
                  </span>
                  <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-orange-600 transition-colors" />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pending Approvals</p>
              <p className="text-3xl font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">{stats.pendingApprovals}</p>
              <p className="text-xs text-gray-500 font-medium">Requires attention</p>
            </div>
          </div>
        </Link>

        {/* Total Users Card */}
        <Link
          href="/super-admin/users"
          className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-green-200 transition-all duration-300 overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div className="p-3.5 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-white" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-green-600 transition-colors" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">{stats.totalUsers}</p>
            </div>
          </div>
        </Link>

        {/* Password Resets Card */}
        <Link
          href="/super-admin/password-resets"
          className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-purple-200 transition-all duration-300 overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div className="p-3.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <Lock className="h-6 w-6 text-white" />
              </div>
              {stats.pendingPasswordResets > 0 && (
                <div className="flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full border border-purple-200">
                    {stats.pendingPasswordResets}
                  </span>
                  <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-purple-600 transition-colors" />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password Resets</p>
              <p className="text-3xl font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">{stats.pendingPasswordResets}</p>
              <p className="text-xs text-gray-500 font-medium">Pending requests</p>
            </div>
          </div>
        </Link>

        {/* Activity Logs Card */}
        <Link
          href="/super-admin/activity-logs"
          className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-orange-200 transition-all duration-300 overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-5">
              <div className="p-3.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-orange-600 transition-colors" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Activity Logs</p>
              <p className="text-3xl font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">View</p>
              <p className="text-xs text-gray-500 font-medium">System activity</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-lg shadow-sm border border-blue-200 overflow-hidden">
        <div className="p-6 border-b border-blue-200">
          <h2 className="text-lg font-semibold text-gray-900">Organizations ({organizations.length})</h2>
        </div>

        <div className="overflow-x-auto">
          {organizations.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No organizations found</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4 p-4">
                {organizations.map((org) => (
                  <div key={org.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">{org.name}</h3>
                        <p className="text-xs text-primary-600 font-semibold mt-0.5">{org.organization_type}</p>
                      </div>
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-lg flex-shrink-0 uppercase tracking-wider ${org.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                        org.status === 'pending' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                        {org.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[11px] sm:text-xs">
                      <div className="col-span-2">
                        <p className="text-gray-400 font-bold uppercase tracking-widest mb-0.5 text-[9px]">Admin Email</p>
                        <p className="text-gray-900 break-words font-medium">{org.admin_email}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest mb-0.5 text-[9px]">Members</p>
                        <p className="font-bold text-gray-900">{org.memberCount ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest mb-0.5 text-[9px]">Created</p>
                        <p className="text-gray-900 font-medium">{format(new Date(org.created_at), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                      <Link
                        href={`/super-admin/organizations/${org.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all font-bold text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                      {org.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(org.id, 'approved')}
                          disabled={loading === org.id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-all disabled:opacity-50 font-bold text-xs"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Approve
                        </button>
                      )}
                      {org.status === 'approved' && (
                        <button
                          onClick={() => handleStatusChange(org.id, 'suspended')}
                          disabled={loading === org.id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg transition-all disabled:opacity-50 font-bold text-xs"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Suspend
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteConfirm(org.id)}
                        disabled={loading === org.id}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                        title="Delete organization"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <table className="min-w-full divide-y divide-blue-200">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Organization</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Admin Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Members</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-blue-200">
                    {organizations.map((org) => (
                      <tr key={org.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {org.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {org.organization_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {org.admin_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {org.memberCount ?? 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-md ${org.status === 'approved' ? 'bg-green-100 text-green-800' :
                            org.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                            {org.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(org.created_at), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/super-admin/organizations/${org.id}`}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Link>
                            <div className="flex items-center gap-2">
                              {org.status === 'pending' && (
                                <button
                                  onClick={() => handleStatusChange(org.id, 'approved')}
                                  disabled={loading === org.id}
                                  className="flex items-center gap-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Approve
                                </button>
                              )}
                              {org.status === 'approved' && (
                                <button
                                  onClick={() => handleStatusChange(org.id, 'suspended')}
                                  disabled={loading === org.id}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Suspend
                                </button>
                              )}
                              {org.status === 'suspended' && (
                                <button
                                  onClick={() => handleStatusChange(org.id, 'approved')}
                                  disabled={loading === org.id}
                                  className="flex items-center gap-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Reactivate
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => setDeleteConfirm(org.id)}
                              disabled={loading === org.id}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                              title="Delete organization"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
