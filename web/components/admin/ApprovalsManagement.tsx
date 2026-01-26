'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Clock, ArrowLeft, Users, Building2, UserCog } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Member {
  id: string
  full_name: string
  membership_id: string
  email: string
  phone_number: string
  status: string
  created_at: string
  unpaid_balance?: number
}

interface Organization {
  id: string
  name: string
  status: string
}

interface AdminRequest {
  id: string
  user_name: string
  user_email: string
  user_phone: string
  status: string
}

interface PendingApprovals {
  members: Member[]
  organization: Organization[]
  adminRequests: AdminRequest[]
}

interface Props {
  pendingApprovals: PendingApprovals
  approvedMembers: Member[]
  organizationId: string
}

export default function ApprovalsManagement({
  pendingApprovals,
  approvedMembers,
  organizationId,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending')
  const [approveModal, setApproveModal] = useState<{ memberId: string; memberName: string } | null>(null)
  const [initialBalance, setInitialBalance] = useState<string>('0')

  // Set up real-time subscriptions for member and organization changes
  useEffect(() => {
    if (typeof window === 'undefined' || !organizationId) return

    const supabase = createClient()

    // Subscribe to member changes for this organization
    const membersChannel = supabase
      .channel(`approvals-members-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('Member change detected in approvals:', payload)
          router.refresh()
        }
      )
      .subscribe()

    // Subscribe to organization changes
    const orgChannel = supabase
      .channel(`approvals-org-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('Organization change detected:', payload)
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(membersChannel)
      supabase.removeChannel(orgChannel)
    }
  }, [organizationId, router])

  const updateMemberStatus = async (memberId: string, newStatus: string, balance?: number) => {
    setLoading(memberId)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get member details before update
      const { data: member } = await supabase
        .from('members')
        .select('full_name, membership_id, organization_id, user_id')
        .eq('id', memberId)
        .single()

      const updateData: { status: string; unpaid_balance?: number } = { status: newStatus }
      
      if (newStatus === 'active' && balance !== undefined) {
        updateData.unpaid_balance = balance
      }
      
      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId)

      if (error) throw error

      // Send notification to member if approved
      if (newStatus === 'active' && member?.user_id) {
        await supabase
          .from('notifications')
          .insert({
            organization_id: organizationId,
            recipient_id: member.user_id,
            member_id: memberId,
            title: 'Membership Approved',
            message: `Your membership request has been approved! You can now access all member features.`,
            type: 'approval',
          })
      }

      // Send notification to member if rejected
      if (newStatus === 'inactive' && member?.user_id) {
        await supabase
          .from('notifications')
          .insert({
            organization_id: organizationId,
            recipient_id: member.user_id,
            member_id: memberId,
            title: 'Membership Request Rejected',
            message: `Your membership request has been rejected. Please contact your organization administrator for more information.`,
            type: 'approval',
          })
      }

      router.refresh()
    } catch (error: any) {
      alert(`Error updating member: ${error.message}`)
    } finally {
      setLoading(null)
      setApproveModal(null)
      setInitialBalance('0')
    }
  }

  const handleApproveClick = (memberId: string, memberName: string) => {
    const member = [...pendingApprovals.members, ...approvedMembers].find(m => m.id === memberId)
    setInitialBalance(member?.unpaid_balance?.toString() || '0')
    setApproveModal({ memberId, memberName })
  }

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!approveModal) return
    
    const balance = parseFloat(initialBalance) || 0
    updateMemberStatus(approveModal.memberId, 'active', balance)
  }

  const totalPending = 
    pendingApprovals.members.length + 
    pendingApprovals.organization.length + 
    pendingApprovals.adminRequests.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Link
          href="/admin"
          className="p-2 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5 text-blue-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Approvals Management</h1>
          <p className="text-xs sm:text-sm text-blue-600 mt-1">Manage pending and approved member requests</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-blue-200">
        <div className="border-b border-blue-200">
          <nav className="flex -mb-px overflow-x-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`
                flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === 'pending'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Pending Requests</span>
              <span className="sm:hidden">Pending</span>
              <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {totalPending}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`
                flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === 'approved'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Approved Members</span>
              <span className="sm:hidden">Approved</span>
              <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {approvedMembers.length}
              </span>
            </button>
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {/* Pending Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-6">
              {/* Pending Members */}
              {pendingApprovals.members.length > 0 && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    <span className="hidden sm:inline">Pending Member Requests</span>
                    <span className="sm:hidden">Pending Members</span>
                    <span className="ml-1 sm:ml-2">({pendingApprovals.members.length})</span>
                  </h3>
                  <div className="space-y-3">
                    {pendingApprovals.members.map((member) => (
                      <div key={member.id} className="border border-blue-200 rounded-lg p-3 sm:p-4 hover:bg-blue-50 transition-colors">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-3 sm:gap-0">
                          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm sm:text-base">{member.full_name}</p>
                              <p className="text-xs sm:text-sm text-gray-500 mt-1">{member.membership_id}</p>
                              <p className="text-xs sm:text-sm text-gray-500 mt-1 break-words">{member.email}</p>
                              {member.phone_number && (
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">{member.phone_number}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                Requested: {format(new Date(member.created_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleApproveClick(member.id, member.full_name)}
                              disabled={loading === member.id}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => updateMemberStatus(member.id, 'inactive')}
                              disabled={loading === member.id}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Organization Requests */}
              {pendingApprovals.organization.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Pending Organization Requests ({pendingApprovals.organization.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingApprovals.organization.map((org) => (
                      <div key={org.id} className="border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="font-semibold text-gray-900">{org.name}</p>
                              <p className="text-sm text-gray-500 mt-1">Organization approval pending</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 text-xs font-semibold text-orange-700 bg-orange-100 rounded-md">
                            Pending
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Admin Requests */}
              {pendingApprovals.adminRequests.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <UserCog className="h-5 w-5 text-blue-600" />
                    Pending Admin Requests ({pendingApprovals.adminRequests.length})
                  </h3>
                  <div className="space-y-3">
                    {pendingApprovals.adminRequests.map((request) => (
                      <div key={request.id} className="border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <UserCog className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="font-semibold text-gray-900">{request.user_name}</p>
                              <p className="text-sm text-gray-500 mt-1">{request.user_email}</p>
                              <p className="text-sm text-gray-500 mt-1">{request.user_phone}</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 text-xs font-semibold text-orange-700 bg-orange-100 rounded-md">
                            Password Reset
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {totalPending === 0 && (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No pending approvals</p>
                </div>
              )}
            </div>
          )}

          {/* Approved Tab */}
          {activeTab === 'approved' && (
            <div className="space-y-4">
              {approvedMembers.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No approved members yet</p>
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block md:hidden space-y-4">
                    {approvedMembers.map((member) => (
                      <div key={member.id} className="bg-white border border-blue-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-gray-900">{member.full_name}</h3>
                            <p className="text-sm text-gray-500 mt-1">ID: {member.membership_id}</p>
                          </div>
                          <button
                            onClick={() => updateMemberStatus(member.id, 'suspended')}
                            disabled={loading === member.id}
                            className="flex-shrink-0 text-red-600 hover:text-red-700 disabled:opacity-50 text-xs px-2 py-1 border border-red-200 rounded"
                          >
                            {loading === member.id ? 'Updating...' : 'Suspend'}
                          </button>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-500">Email: </span>
                            <span className="text-gray-900">{member.email}</span>
                          </div>
                          {member.phone_number && (
                            <div>
                              <span className="text-gray-500">Phone: </span>
                              <span className="text-gray-900">{member.phone_number}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Approved: </span>
                            <span className="text-gray-900">{format(new Date(member.created_at), 'MMM dd, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full align-middle px-4 sm:px-6 lg:px-8">
                      <table className="min-w-full divide-y divide-blue-200">
                        <thead className="bg-blue-50">
                          <tr>
                            <th className="px-4 lg:px-6 xl:px-8 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 uppercase">Name</th>
                            <th className="px-4 lg:px-6 xl:px-8 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 uppercase">Membership ID</th>
                            <th className="px-4 lg:px-6 xl:px-8 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 uppercase">Email</th>
                            <th className="px-4 lg:px-6 xl:px-8 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 uppercase">Phone</th>
                            <th className="px-4 lg:px-6 xl:px-8 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 uppercase">Approved Date</th>
                            <th className="px-4 lg:px-6 xl:px-8 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-blue-200">
                          {approvedMembers.map((member) => (
                            <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 lg:px-6 xl:px-8 py-4 text-sm lg:text-base font-medium text-gray-900">
                                {member.full_name}
                              </td>
                              <td className="px-4 lg:px-6 xl:px-8 py-4 text-sm lg:text-base text-gray-500 font-mono">
                                {member.membership_id}
                              </td>
                              <td className="px-4 lg:px-6 xl:px-8 py-4">
                                <div className="text-sm lg:text-base text-gray-500 max-w-xs truncate" title={member.email}>{member.email}</div>
                              </td>
                              <td className="px-4 lg:px-6 xl:px-8 py-4 text-sm lg:text-base text-gray-500">
                                {member.phone_number || 'N/A'}
                              </td>
                              <td className="px-4 lg:px-6 xl:px-8 py-4 text-sm lg:text-base text-gray-500">
                                {format(new Date(member.created_at), 'MMM dd, yyyy')}
                              </td>
                              <td className="px-4 lg:px-6 xl:px-8 py-4 text-sm lg:text-base">
                                <button
                                  onClick={() => updateMemberStatus(member.id, 'suspended')}
                                  disabled={loading === member.id}
                                  className="text-red-600 hover:text-red-700 disabled:opacity-50"
                                >
                                  {loading === member.id ? 'Updating...' : 'Suspend'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900">Approve Member</h3>
              <p className="text-sm text-gray-500 mt-1">Set initial balance for {approveModal.memberName}</p>
            </div>
            <form onSubmit={handleApproveSubmit} className="p-6 space-y-4">
              <div>
                <label htmlFor="balance" className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Unpaid Balance
                </label>
                <input
                  id="balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Enter 0 if no initial balance</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading === approveModal.memberId}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading === approveModal.memberId ? 'Approving...' : 'Approve'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApproveModal(null)
                    setInitialBalance('0')
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
