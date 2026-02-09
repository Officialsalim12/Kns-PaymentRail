'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Building2, ArrowLeft, CheckCircle, XCircle, Trash2, Eye } from 'lucide-react'
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
}

interface Props {
  organizations: Organization[]
  filter?: string
}

export default function OrganizationsList({ organizations: initialOrgs, filter }: Props) {
  const router = useRouter()
  const [organizations, setOrganizations] = useState(initialOrgs)
  const [loading, setLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/super-admin"
          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-blue-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {filter === 'pending' ? 'Pending Organizations' : 'All Organizations'}
          </h1>
          <p className="text-sm text-blue-600 mt-1">
            {filter === 'pending' 
              ? 'Review and approve pending organization requests'
              : 'Manage all organizations on the platform'
            }
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

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

      {/* Organizations List */}
      <div className="bg-white rounded-lg shadow-sm border border-blue-200 overflow-hidden">
        <div className="p-6 border-b border-blue-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {filter === 'pending' ? 'Pending Organizations' : 'All Organizations'} ({organizations.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          {organizations.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No organizations found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-blue-200">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Admin Email</th>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-md ${
                        org.status === 'approved' ? 'bg-green-100 text-green-800' :
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
          )}
        </div>
      </div>
    </div>
  )
}
