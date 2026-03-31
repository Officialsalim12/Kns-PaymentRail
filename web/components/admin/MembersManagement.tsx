'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Clock, Plus, Search, X, MoreVertical, Check, Ban, Settings2, RotateCw, RefreshCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { confirmDialog } from '@/lib/utils/confirm-dialog'
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

  const [tabsManager, setTabsManager] = useState<{ memberId: string; memberName: string; organizationId: string } | null>(null)
  const [showBulkTabCreator, setShowBulkTabCreator] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container')) {
        setOpenDropdown(null)
      }
    }

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdown])

  // Set up real-time subscriptions for member changes
  useEffect(() => {
    if (typeof window === 'undefined' || !organizationId) return

    const supabase = createClient()

    // Subscribe to member changes for this organization
    const membersChannel = supabase
      .channel(`members-management-${organizationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'members',
        filter: `organization_id=eq.${organizationId}`,
      }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(membersChannel)
    }
  }, [organizationId, router])

  const updateMemberStatus = async (memberId: string, newStatus: string) => {
    setLoading(memberId)
    try {
      const supabase = createClient()
      const updateData = { status: newStatus }

      const { error } = await supabase
        .from('members')
        .update(updateData)
        .eq('id', memberId)

      if (error) throw error

      setMembers(members.map(m =>
        m.id === memberId ? { ...m, status: newStatus } : m
      ))
      setApproveModal(null)

      router.refresh()
    } catch (error: any) {
      toast.error(`Error updating member: ${error.message}`)
    } finally {
      setLoading(null)
    }
  }

  const handleApproveClick = async (memberId: string, memberName: string) => {
    const confirmed = await confirmDialog({
      title: 'Approve Member?',
      text: `Are you sure you want to approve ${memberName}?`,
      icon: 'question',
      confirmButtonText: 'Yes, Approve',
      confirmButtonColor: '#16a34a', // bg-green-600
    })

    if (confirmed) {
      updateMemberStatus(memberId, 'active')
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

  // Filter members based on search query and date range
  const filteredMembers = members.filter((member) => {
    // Search query filter (Name and Membership ID)
    const query = searchQuery.toLowerCase().trim()
    const matchesQuery = !query || 
      member.full_name?.toLowerCase().includes(query) || 
      member.membership_id?.toLowerCase().includes(query)

    // Date range filter (Admission Date)
    let matchesDate = true
    if (member.created_at) {
      const joinDate = new Date(member.created_at).getTime()
      if (startDate) {
        const start = new Date(startDate).getTime()
        if (joinDate < start) matchesDate = false
      }
      if (endDate) {
        const end = new Date(endDate).getTime()
        // Set end date to end of day
        const endOfDay = end + (24 * 60 * 60 * 1000) - 1
        if (joinDate > endOfDay) matchesDate = false
      }
    }

    return matchesQuery && matchesDate
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

          {/* Search Table Toolbar */}
          <div className="flex flex-col xl:flex-row gap-4 mb-8">
            {/* Search Box */}
            <div className="relative group flex-1">
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

            {/* Date Filters */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <div className="relative flex-1 sm:flex-none sm:w-44">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-100 bg-gray-50/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600 text-sm font-medium transition-all"
                />
                <span className="absolute -top-2.5 left-4 px-1 bg-white text-[10px] font-bold text-gray-400 uppercase tracking-wider">Joined After</span>
              </div>
              <div className="relative flex-1 sm:flex-none sm:w-44">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-100 bg-gray-50/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-600 text-sm font-medium transition-all"
                />
                <span className="absolute -top-2.5 left-4 px-1 bg-white text-[10px] font-bold text-gray-400 uppercase tracking-wider">Joined Before</span>
              </div>
              
              {(searchQuery || startDate || endDate) && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="flex items-center gap-2 px-4 py-3.5 text-red-600 hover:bg-red-50 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest whitespace-nowrap"
                >
                  <RefreshCcw className="h-4 w-4" />
                  <span>Clear</span>
                </button>
              )}
            </div>
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

                    </div>

                    <div className="flex justify-end pt-2">
                      <div className="relative dropdown-container">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === member.id ? null : member.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label="Actions menu"
                        >
                          <MoreVertical className="h-5 w-5 text-gray-600" />
                        </button>

                        {openDropdown === member.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                            {member.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    handleApproveClick(member.id, member.full_name)
                                    setOpenDropdown(null)
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    updateMemberStatus(member.id, 'inactive')
                                    setOpenDropdown(null)
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {member.status === 'active' && (
                              <button
                                onClick={() => {
                                  updateMemberStatus(member.id, 'suspended')
                                  setOpenDropdown(null)
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-50 transition-colors"
                              >
                                Suspend
                              </button>
                            )}
                            {member.status === 'suspended' && (
                              <button
                                onClick={() => {
                                  updateMemberStatus(member.id, 'active')
                                  setOpenDropdown(null)
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
                              >
                                Reactivate
                              </button>
                            )}
                            {(member.status === 'active' || member.status === 'suspended') && (
                              <>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                  onClick={() => {
                                    setTabsManager({ memberId: member.id, memberName: member.full_name, organizationId })
                                    setOpenDropdown(null)
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-purple-700 hover:bg-purple-50 transition-colors"
                                >
                                  Manage Tabs
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto pb-4 hide-scrollbar">
                <div className="inline-block min-w-[900px] align-middle px-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Membership ID</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>

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

                          <td className="px-4 py-3 whitespace-nowrap text-xs font-bold">
                            <div className="flex flex-wrap gap-2">
                              {member.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApproveClick(member.id, member.full_name)}
                                    disabled={loading === member.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => updateMemberStatus(member.id, 'inactive')}
                                    disabled={loading === member.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}

                              {member.status === 'active' && (
                                <button
                                  onClick={() => updateMemberStatus(member.id, 'suspended')}
                                  disabled={loading === member.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  <span>Suspend</span>
                                </button>
                              )}

                              {member.status === 'suspended' && (
                                <button
                                  onClick={() => updateMemberStatus(member.id, 'active')}
                                  disabled={loading === member.id}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Reactivate</span>
                                </button>
                              )}

                              {(member.status === 'active' || member.status === 'suspended') && (
                                <>
                                  <button
                                    onClick={() => setTabsManager({ memberId: member.id, memberName: member.full_name, organizationId })}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                                  >
                                    <Settings2 className="h-3.5 w-3.5" />
                                    <span>Tabs</span>
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

