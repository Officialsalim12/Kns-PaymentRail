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
import { setMemberStatusAtomic } from '@/app/actions/admin-approvals'

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

  const updateMemberStatus = async (memberId: string, newStatus: string) => {
    setLoading(memberId)
    try {
      // Atomic DB update (member status + optional notification) via RPC.
      // initialUnpaidBalance is now always undefined for new activations
      await setMemberStatusAtomic({
        memberId,
        newStatus: newStatus as 'active' | 'inactive' | 'suspended',
        initialUnpaidBalance: undefined,
      })

      router.refresh()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(null)
      setApproveModal(null)
    }
  }

  const handleApproveClick = (memberId: string, memberName: string) => {
    if (confirm(`Are you sure you want to approve ${memberName}?`)) {
      updateMemberStatus(memberId, 'active')
    }
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
              <div className="responsive-table-container">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-50">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Member</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">ID</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {approvedMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-900 text-sm">{member.full_name}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500">{member.membership_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                            <div className="max-w-[150px] truncate" title={member.email}>{member.email}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
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
              </div>
            )}
          </div>
        )}
      </div>


    </div>
  )
}
