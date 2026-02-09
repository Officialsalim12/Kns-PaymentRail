'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Clock, Plus, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/currency'
import MemberTabsManager from './MemberTabsManager'
import BulkTabCreator from './BulkTabCreator'

interface Member {
  id: string
  full_name: string
  membership_id: string
  email: string
  phone_number: string
  status: string
  unpaid_balance: number
  total_paid: number
  created_at: string
}

interface Props {
  members: Member[]
  organizationId: string
}

export default function MembersManagement({ members: initialMembers, organizationId }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [loading, setLoading] = useState<string | null>(null)
  const [approveModal, setApproveModal] = useState<{ memberId: string; memberName: string } | null>(null)
  const [initialBalance, setInitialBalance] = useState<string>('0')
  const [tabsManager, setTabsManager] = useState<{ memberId: string; memberName: string; organizationId: string } | null>(null)
  const [showBulkTabCreator, setShowBulkTabCreator] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Set up real-time subscriptions for member changes
  useEffect(() => {
    if (typeof window === 'undefined' || !organizationId) return

    const supabase = createClient()

    // Subscribe to member changes for this organization
    const membersChannel = supabase
      .channel(`members-management-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('Member change detected:', payload)
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(membersChannel)
    }
  }, [organizationId, router])

  const updateMemberStatus = async (memberId: string, newStatus: string, balance?: number) => {
    setLoading(memberId)
    try {
      const supabase = createClient()
      const updateData: { status: string; unpaid_balance?: number } = { status: newStatus }

      if (newStatus === 'active' && balance !== undefined) {
        updateData.unpaid_balance = balance
      }

      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId)

      if (error) throw error

      setMembers(members.map(m =>
        m.id === memberId ? { ...m, status: newStatus, unpaid_balance: balance !== undefined ? balance : m.unpaid_balance } : m
      ))
      setApproveModal(null)
      setInitialBalance('0')
      router.refresh()
    } catch (error: any) {
      alert(`Error updating member: ${error.message}`)
    } finally {
      setLoading(null)
    }
  }

  const handleApproveClick = (memberId: string, memberName: string) => {
    const member = members.find(m => m.id === memberId)
    setInitialBalance(member?.unpaid_balance?.toString() || '0')
    setApproveModal({ memberId, memberName })
  }

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!approveModal) return

    const balance = parseFloat(initialBalance) || 0
    updateMemberStatus(approveModal.memberId, 'active', balance)
  }

  const recalculateBalance = async (memberId: string) => {
    if (!confirm("This will recalculate the member's balance based on existing payments. Continue?")) {
      return
    }

    setLoading(memberId)
    try {
      const supabase = createClient()
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('description, amount')
        .eq('member_id', memberId)

      if (paymentsError) {
        throw new Error(`Failed to fetch payments: ${paymentsError.message}`)
      }

      let totalBalanceAdded = 0
      if (payments && payments.length > 0) {
        payments.forEach((payment) => {
          if (payment.description) {
            const balanceMatch = payment.description.match(/\[BALANCE_ADDED:\s*([\d]+\.?[\d]*)\]/i)
            if (balanceMatch && balanceMatch[1]) {
              const balanceAmount = parseFloat(balanceMatch[1])
              if (!isNaN(balanceAmount)) {
                totalBalanceAdded += balanceAmount
              }
            }
          }
        })
      }

      const { error: updateError } = await supabase
        .from('members')
        .update({ unpaid_balance: totalBalanceAdded })
        .eq('id', memberId)

      if (updateError) {
        if (updateError.message.includes('unpaid_balance') && (updateError.message.includes('schema cache') || updateError.message.includes('Could not find'))) {
          throw new Error(`The 'unpaid_balance' column does not exist in the members table. Please run the SQL script in database/add_unpaid_balance_column.sql in your Supabase SQL Editor to add this column.`)
        }
        throw new Error(`Failed to update balance: ${updateError.message}`)
      }

      setMembers(members.map(m =>
        m.id === memberId ? { ...m, unpaid_balance: totalBalanceAdded } : m
      ))

      alert(`Balance recalculated successfully. New balance: ${totalBalanceAdded.toFixed(2)}`)
      router.refresh()
    } catch (error: any) {
      alert(`Error recalculating balance: ${error.message}`)
    } finally {
      setLoading(null)
    }
  }

  const resetBalance = async (memberId: string) => {
    if (!confirm("This will reset the member's balance to 0. Continue?")) {
      return
    }

    setLoading(memberId)
    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('members')
        .update({ unpaid_balance: 0 })
        .eq('id', memberId)

      if (updateError) {
        throw new Error(`Failed to reset balance: ${updateError.message}`)
      }

      setMembers(members.map(m =>
        m.id === memberId ? { ...m, unpaid_balance: 0 } : m
      ))

      alert('Balance reset to 0 successfully')
      router.refresh()
    } catch (error: any) {
      alert(`Error resetting balance: ${error.message}`)
    } finally {
      setLoading(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'inactive':
        return <XCircle className="h-5 w-5 text-gray-400" />
      case 'suspended':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-orange-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'inactive':
        return 'bg-gray-100 text-gray-700'
      case 'suspended':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-orange-100 text-orange-700'
    }
  }

  // Filter members based on search query
  const filteredMembers = members.filter((member) => {
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase().trim()
    const nameMatch = member.full_name?.toLowerCase().includes(query)
    const idMatch = member.membership_id?.toLowerCase().includes(query)

    return nameMatch || idMatch
  })

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Members</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Directory and membership management</p>
        </div>
        <button
          onClick={() => setShowBulkTabCreator(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 active:scale-95 text-sm"
        >
          <Plus className="h-4 w-4" />
          Create Payment Tab
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg font-bold text-gray-900">All Members</h2>
            <div className="px-3 py-1 bg-gray-50 text-gray-500 text-xs font-bold rounded-lg uppercase tracking-wider">
              {searchQuery ? `${filteredMembers.length} Found` : `${members.length} Total`}
            </div>
          </div>

          {/* Search Box */}
          <div className="relative group">
            <label htmlFor="member-search" className="sr-only">Search members</label>
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-600 text-gray-400">
              <Search className="h-5 w-5" />
            </div>
            <input
              id="member-search"
              name="member-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or membership ID..."
              className="block w-full pl-12 pr-12 py-3.5 border border-gray-100 bg-gray-50/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600 text-sm font-medium transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
        <div className="p-4 sm:p-6 lg:p-8 xl:p-10">
          {members.length === 0 ? (
            <p className="text-gray-500 text-center py-8 text-sm sm:text-base lg:text-lg">No members yet</p>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm sm:text-base lg:text-lg">No members found matching &quot;{searchQuery}&quot;</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm lg:text-base text-primary-600 hover:text-primary-700"
              >
                Clear search
              </button>
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-gray-50 bg-white rounded-2xl overflow-hidden border border-gray-100">
                {filteredMembers.map((member) => (
                  <div key={member.id} className="p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">{member.full_name}</h3>
                        <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mt-0.5">ID: {member.membership_id}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${getStatusColor(member.status)}`}>
                        {member.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[11px]">
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mb-0.5">Email</p>
                        <p className="text-gray-900 truncate">{member.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] mb-0.5">Balance</p>
                        <p className="text-gray-900 font-bold">{formatCurrency(member.unpaid_balance || 0)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {member.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveClick(member.id, member.full_name)}
                            className="flex-1 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-xl active:scale-95 transition-all"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateMemberStatus(member.id, 'inactive')}
                            className="flex-1 py-2 bg-red-50 text-red-700 text-xs font-bold rounded-xl active:scale-95 transition-all"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {member.status === 'active' && (
                        <button
                          onClick={() => updateMemberStatus(member.id, 'suspended')}
                          className="flex-1 py-2 bg-orange-50 text-orange-700 text-xs font-bold rounded-xl active:scale-95 transition-all"
                        >
                          Suspend
                        </button>
                      )}
                      {member.status === 'suspended' && (
                        <button
                          onClick={() => updateMemberStatus(member.id, 'active')}
                          className="flex-1 py-2 bg-green-50 text-green-700 text-xs font-bold rounded-xl active:scale-95 transition-all"
                        >
                          Reactivate
                        </button>
                      )}
                      {(member.status === 'active' || member.status === 'suspended') && (
                        <div className="flex w-full gap-2">
                          <button
                            onClick={() => setTabsManager({ memberId: member.id, memberName: member.full_name, organizationId })}
                            className="flex-1 py-2 bg-purple-50 text-purple-700 text-xs font-bold rounded-xl active:scale-95 transition-all"
                          >
                            Tabs
                          </button>
                          <button
                            onClick={() => recalculateBalance(member.id)}
                            className="flex-1 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-xl active:scale-95 transition-all"
                          >
                            Recalc
                          </button>
                          <button
                            onClick={() => resetBalance(member.id)}
                            className="py-2 px-4 bg-gray-50 text-gray-700 text-xs font-bold rounded-xl active:scale-95 transition-all"
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block responsive-table-container">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Membership ID</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Balance</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{member.full_name}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-500 font-mono tracking-tighter">{member.membership_id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-500 max-w-[150px] lg:max-w-xs truncate" title={member.email || 'N/A'}>{member.email || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{member.phone_number || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusColor(member.status)}`}>
                              {getStatusIcon(member.status)}
                              {member.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{formatCurrency(member.unpaid_balance || 0)}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs font-bold">
                            <div className="flex flex-wrap gap-2 xl:gap-3">
                              {member.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApproveClick(member.id, member.full_name)}
                                    disabled={loading === member.id}
                                    className="text-green-600 hover:text-green-900 disabled:opacity-50 text-sm lg:text-base xl:text-lg"
                                  >
                                    {loading === member.id ? 'Updating...' : 'Approve'}
                                  </button>
                                  <button
                                    onClick={() => updateMemberStatus(member.id, 'inactive')}
                                    disabled={loading === member.id}
                                    className="text-red-600 hover:text-red-900 disabled:opacity-50 text-sm lg:text-base xl:text-lg"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {member.status === 'active' && (
                                <button
                                  onClick={() => updateMemberStatus(member.id, 'suspended')}
                                  disabled={loading === member.id}
                                  className="text-orange-600 hover:text-orange-900 disabled:opacity-50 text-sm lg:text-base xl:text-lg"
                                >
                                  {loading === member.id ? 'Updating...' : 'Suspend'}
                                </button>
                              )}
                              {member.status === 'suspended' && (
                                <button
                                  onClick={() => updateMemberStatus(member.id, 'active')}
                                  disabled={loading === member.id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 text-sm lg:text-base xl:text-lg"
                                >
                                  {loading === member.id ? 'Updating...' : 'Reactivate'}
                                </button>
                              )}
                              {(member.status === 'active' || member.status === 'suspended') && (
                                <>
                                  <button
                                    onClick={() => setTabsManager({ memberId: member.id, memberName: member.full_name, organizationId })}
                                    className="text-purple-600 hover:text-purple-900 disabled:opacity-50 text-sm lg:text-base xl:text-lg"
                                    title="Manage tabs for this member"
                                  >
                                    Tabs
                                  </button>
                                  <button
                                    onClick={() => recalculateBalance(member.id)}
                                    disabled={loading === member.id}
                                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50 text-sm lg:text-base xl:text-lg"
                                    title="Recalculate balance from payments"
                                  >
                                    {loading === member.id ? '...' : 'Recalc'}
                                  </button>
                                  <button
                                    onClick={() => resetBalance(member.id)}
                                    disabled={loading === member.id}
                                    className="text-gray-600 hover:text-gray-900 disabled:opacity-50 text-sm lg:text-base xl:text-lg"
                                    title="Reset balance to 0"
                                  >
                                    {loading === member.id ? '...' : 'Reset'}
                                  </button>
                                </>
                              )}
                            </div>
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
      </div>

      {approveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md xl:max-w-lg 2xl:max-w-xl w-full mx-4">
            <div className="p-4 sm:p-6 xl:p-8 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl xl:text-2xl font-semibold text-gray-900">Approve Member</h3>
              <p className="text-sm sm:text-base xl:text-lg text-gray-500 mt-1">Set initial balance for {approveModal.memberName}</p>
            </div>
            <form onSubmit={handleApproveSubmit} className="p-4 sm:p-6 xl:p-8 space-y-4 xl:space-y-6">
              <div>
                <label htmlFor="balance" className="block text-sm xl:text-base font-medium text-gray-700 mb-1 xl:mb-2">
                  Initial Unpaid Balance
                </label>
                <input
                  id="balance"
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  className="w-full px-3 xl:px-4 py-2 xl:py-3 text-sm xl:text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                  required
                />
                <p className="mt-1 xl:mt-2 text-xs xl:text-sm text-gray-500">Enter 0 if no initial balance</p>
              </div>
              <div className="flex gap-3 xl:gap-4 pt-4 xl:pt-6">
                <button
                  type="submit"
                  disabled={loading === approveModal.memberId}
                  className="flex-1 bg-green-600 text-white px-4 xl:px-6 py-2 xl:py-3 text-sm xl:text-base rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading === approveModal.memberId ? 'Approving...' : 'Approve'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApproveModal(null)
                    setInitialBalance('0')
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 xl:px-6 py-2 xl:py-3 text-sm xl:text-base rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tabsManager && (
        <MemberTabsManager
          memberId={tabsManager.memberId}
          memberName={tabsManager.memberName}
          organizationId={tabsManager.organizationId}
          onClose={() => setTabsManager(null)}
        />
      )}

      {showBulkTabCreator && (
        <BulkTabCreator
          organizationId={organizationId}
          onClose={() => setShowBulkTabCreator(false)}
        />
      )}
    </div>
  )
}

