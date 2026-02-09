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
  const [mobileTab, setMobileTab] = useState<'summary' | 'organizations'>('summary')

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
    <div className="space-y-8 pb-20 md:pb-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-b-2xl md:rounded-2xl shadow-xl">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="relative p-7 sm:p-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-6">
              <div className="space-y-2">
                <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                  Super Admin
                </h1>
                <p className="text-blue-100 font-medium tracking-wide">System Management & Control</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden px-4">
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setMobileTab('summary')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mobileTab === 'summary' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
          >
            Summary
          </button>
          <button
            onClick={() => setMobileTab('organizations')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mobileTab === 'organizations' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
          >
            Organizations
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 md:mx-0 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Summary Tab Content */}
      <div className={`${mobileTab === 'summary' ? 'block' : 'hidden md:block'} space-y-8 px-4 md:px-0`}>
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Total Organizations Card */}
          <Link
            href="/super-admin/organizations"
            className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col items-center text-center"
          >
            <div className="p-3.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300 mb-4">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Organizations</p>
            <p className="text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{stats.totalOrganizations}</p>
          </Link>

          {/* Pending Approvals Card */}
          <Link
            href="/super-admin/organizations?filter=pending"
            className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-orange-200 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col items-center text-center"
          >
            <div className="p-3.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300 mb-4">
              <Clock className="h-6 w-6 text-white" />
            </div>
            {stats.pendingApprovals > 0 && (
              <span className="mb-2 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {stats.pendingApprovals} Pending
              </span>
            )}
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Approvals</p>
            <p className="text-3xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{stats.pendingApprovals}</p>
          </Link>

          {/* Total Users Card */}
          <Link
            href="/super-admin/users"
            className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-green-200 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col items-center text-center"
          >
            <div className="p-3.5 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300 mb-4">
              <Users className="h-6 w-6 text-white" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Users</p>
            <p className="text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{stats.totalUsers}</p>
          </Link>
        </div>

        {/* System Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Link
            href="/super-admin/activity-logs"
            className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between hover:border-primary-200 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-50 rounded-xl text-primary-600 group-hover:scale-110 transition-transform">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">System Activity Logs</h3>
                <p className="text-xs text-gray-500">Monitor all administrative actions</p>
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-primary-600 transition-colors" />
          </Link>

          <div className="bg-primary-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg shadow-primary-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
            <div className="relative">
              <h3 className="text-base font-bold">Quick Insight</h3>
              <p className="text-xs text-blue-100 mt-1">
                {stats.pendingApprovals > 0
                  ? `${stats.pendingApprovals} organizations are waiting for your approval.`
                  : "All organizations are currently processed."}
              </p>
            </div>
            <Shield className="h-10 w-10 text-white/20 relative shrink-0" />
          </div>
        </div>
      </div>

      {/* Organizations List Tab */}
      <div className={`${mobileTab === 'organizations' ? 'block' : 'hidden md:block'} px-4 md:px-0`}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Manage Organizations ({organizations.length})</h2>
          </div>

          <div className="overflow-x-auto">
            {organizations.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No organizations found</p>
              </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="md:hidden divide-y divide-gray-50">
                  {organizations.map((org) => (
                    <div key={org.id} className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900">{org.name}</h3>
                          <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">{org.organization_type}</p>
                        </div>
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${org.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                            org.status === 'pending' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                              'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                          {org.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-[11px]">
                        <div>
                          <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mb-0.5">Admin Email</p>
                          <p className="text-gray-900 break-all">{org.admin_email}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mb-0.5">Members</p>
                          <p className="text-gray-900 font-bold">{org.memberCount ?? 0}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Link href={`/super-admin/organizations/${org.id}`} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-50 text-gray-700 text-xs font-bold rounded-xl active:scale-95 transition-all">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Link>
                        {org.status === 'pending' && (
                          <button onClick={() => handleStatusChange(org.id, 'approved')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-50 text-green-700 text-xs font-bold rounded-xl active:scale-95 transition-all">
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                        {org.status === 'approved' && (
                          <button onClick={() => handleStatusChange(org.id, 'suspended')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 text-red-700 text-xs font-bold rounded-xl active:scale-95 transition-all">
                            <XCircle className="h-3.5 w-3.5" /> Suspend
                          </button>
                        )}
                        <button onClick={() => setDeleteConfirm(org.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl active:scale-95 transition-all">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View */}
                <table className="hidden md:table min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Organization</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Type</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Admin Email</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Members</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {organizations.map((org) => (
                      <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{org.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 uppercase font-medium">{org.organization_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{org.admin_email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{org.memberCount ?? 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${org.status === 'approved' ? 'bg-green-50 text-green-700' :
                              org.status === 'pending' ? 'bg-orange-50 text-orange-700' :
                                'bg-red-50 text-red-700'
                            }`}>
                            {org.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-3">
                            <Link href={`/super-admin/organizations/${org.id}`} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                              <Eye className="h-4 w-4" />
                            </Link>
                            {org.status === 'pending' && (
                              <button onClick={() => handleStatusChange(org.id, 'approved')} className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-all">
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                            {org.status === 'approved' && (
                              <button onClick={() => handleStatusChange(org.id, 'suspended')} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all">
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => setDeleteConfirm(org.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Organization?</h3>
              <p className="text-sm text-gray-500">
                This action is irreversible. All data associated with this organization will be permanently removed.
              </p>
            </div>
            <div className="p-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={loading === deleteConfirm}
                className="flex-1 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {loading === deleteConfirm ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
