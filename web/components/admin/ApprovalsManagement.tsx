'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Users,
  Building2,
  UserCog,
  Eye,
  ArrowUpRight
} from 'lucide-react'
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

  // Set up real-time subscriptions
  useEffect(() => {
    if (typeof window === 'undefined' || !organizationId) return

    const supabase = createClient()

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
        () => router.refresh()
      )
      .subscribe()

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
        () => router.refresh()
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

      const { data: member } = await supabase
        .from('members')
        .select('full_name, membership_id, organization_id, user_id')
        .eq('id', memberId)
        .single()

      const updateData: { status: string; unpaid_balance?: number; activated_at?: string } = { status: newStatus }

      if (newStatus === 'active') {
        if (balance !== undefined) {
          updateData.unpaid_balance = balance
        }
        updateData.activated_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId)

      if (error) throw error

      // Notify member
      if (member?.user_id) {
        let title = ''
        let message = ''

        if (newStatus === 'active') {
          title = 'Membership Approved'
          message = 'Your membership request has been approved! You can now access all member features.'
        } else if (newStatus === 'inactive') {
          title = 'Membership Request Rejected'
          message = 'Your membership request has been rejected. Please contact your organization administrator.'
        }

        if (title) {
          await supabase.from('notifications').insert({
            organization_id: organizationId,
            recipient_id: member.user_id,
            member_id: memberId,
            title,
            message,
            type: 'approval',
          })
        }
      }

      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
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
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2.5 bg-gray-50 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Approvals</h1>
            <p className="text-sm text-gray-500 font-medium">Manage membership and access requests</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${activeTab === 'pending'
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Pending
          <span className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full ${activeTab === 'pending' ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'
            }`}>
            {totalPending}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${activeTab === 'approved'
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Approved Members
          <span className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full ${activeTab === 'approved' ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'
            }`}>
            {approvedMembers.length}
          </span>
        </button>
      </div>

      <div className="space-y-8">
        {/* Pending Content */}
        {activeTab === 'pending' && (
          <div className="space-y-8">
            {/* Pending Members */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                Member Requests ({pendingApprovals.members.length})
              </h3>
              {pendingApprovals.members.length === 0 ? (
                <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
                  <p className="text-sm">No pending member requests</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pendingApprovals.members.map((member) => (
                    <div key={member.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-primary-200 transition-all shadow-sm">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="p-3 bg-primary-50 text-primary-600 rounded-2xl">
                            <Users className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-base">{member.full_name}</h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                <span className="font-bold text-gray-400 uppercase tracking-tight text-[10px]">ID:</span> {member.membership_id}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1.5 overflow-hidden">
                                <span className="font-bold text-gray-400 uppercase tracking-tight text-[10px]">Email:</span> <span className="truncate">{member.email}</span>
                              </p>
                            </div>
                            <p className="text-[10px] text-primary-600 font-bold uppercase tracking-widest mt-3">
                              Requested {format(new Date(member.created_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0">
                          <button
                            onClick={() => handleApproveClick(member.id, member.full_name)}
                            disabled={loading === member.id}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all shadow-sm shadow-green-100 active:scale-95 disabled:opacity-50"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => updateMemberStatus(member.id, 'inactive')}
                            disabled={loading === member.id}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm shadow-red-100 active:scale-95 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Organizations & Admin Requests omitted for length, keeping structure consistent */}
            {/* Pending Organizations */}
            {pendingApprovals.organization.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                  Organization Status ({pendingApprovals.organization.length})
                </h3>
                {pendingApprovals.organization.map((org) => (
                  <div key={org.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{org.name}</h3>
                        <p className="text-xs text-orange-600 font-bold uppercase">Awaiting Approval</p>
                      </div>
                    </div>
                    <Clock className="h-5 w-5 text-orange-400" />
                  </div>
                ))}
              </div>
            )}

            {/* Admin Password Resets */}
            {pendingApprovals.adminRequests.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                  Admin Requests ({pendingApprovals.adminRequests.length})
                </h3>
                {pendingApprovals.adminRequests.map((request) => (
                  <div key={request.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                        <UserCog className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{request.user_name}</h3>
                        <div className="text-xs text-gray-500 mt-0.5">{request.user_email}</div>
                        <p className="text-xs text-purple-600 font-bold uppercase mt-1">Password Reset Requested</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Approved Members Content */}
        {activeTab === 'approved' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {approvedMembers.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p>No approved members found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-50">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Member</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">ID</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {approvedMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 text-sm">{member.full_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-500">{member.membership_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{member.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => updateMemberStatus(member.id, 'suspended')}
                            disabled={loading === member.id}
                            className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Approve Membership</h3>
              <p className="text-sm text-gray-500 mt-1">Set initial balance for {approveModal.memberName}</p>
            </div>
            <form onSubmit={handleApproveSubmit} className="p-6 space-y-6">
              <div>
                <label htmlFor="balance" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Initial Unpaid Balance
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <span className="text-sm font-bold">₦</span>
                  </div>
                  <input
                    id="balance"
                    type="number"
                    step="0.01"
                    min="0"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-bold"
                    placeholder="0.00"
                    required
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400">Enter the starting balance for this member.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setApproveModal(null)}
                  className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading === approveModal.memberId}
                  className="flex-1 py-3 text-sm font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 disabled:opacity-50"
                >
                  {loading === approveModal.memberId ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
