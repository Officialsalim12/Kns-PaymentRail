'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Edit, Trash2, Search, Users, CreditCard, Heart, X, Wifi, WifiOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/currency'
import BulkTabCreator from './BulkTabCreator'

interface MemberTab {
  id: string
  tab_name: string
  tab_type: 'payment' | 'donation'
  description: string | null
  monthly_cost: number | null
  is_active: boolean
  created_at: string
  member_id: string
  member: {
    full_name: string
    membership_id: string
  } | null
}

interface Props {
  organizationId: string
  initialTabs: MemberTab[]
}

export default function PaymentTabsManagement({ organizationId, initialTabs }: Props) {
  const router = useRouter()
  const [tabs, setTabs] = useState<MemberTab[]>(initialTabs)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'payment' | 'donation'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTab, setEditingTab] = useState<MemberTab | null>(null)
  const [formData, setFormData] = useState({
    tab_name: '',
    tab_type: 'payment' as 'payment' | 'donation',
    description: '',
    monthly_cost: '',
    is_active: true,
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)

  const loadTabs = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('member_tabs')
        .select(`
          *,
          member:members(full_name, membership_id)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTabs(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    loadTabs()
  }, [loadTabs])

  // Set up real-time subscriptions for payment tabs
  useEffect(() => {
    if (typeof window === 'undefined' || !organizationId) return

    const supabase = createClient()

    // Subscribe to member_tabs changes for this organization
    const tabsChannel = supabase
      .channel(`payment-tabs-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'member_tabs',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('Payment tab change detected:', payload)
          // Reload tabs to get the latest data with member information
          loadTabs()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeConnected(false)
        }
      })

    return () => {
      supabase.removeChannel(tabsChannel)
      setIsRealtimeConnected(false)
    }
  }, [organizationId, loadTabs])

  const handleCreateTab = () => {
    setShowCreateModal(true)
  }

  const handleEditTab = (tab: MemberTab) => {
    setEditingTab(tab)
    setFormData({
      tab_name: tab.tab_name,
      tab_type: tab.tab_type,
      description: tab.description || '',
      monthly_cost: tab.monthly_cost?.toString() || '',
      is_active: tab.is_active,
    })
    setShowEditModal(true)
    setError(null)
  }

  const handleSaveTab = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTab) return

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const updateData: any = {
        tab_name: formData.tab_name,
        tab_type: formData.tab_type,
        description: formData.description || null,
        is_active: formData.is_active,
      }
      
      if (formData.tab_type === 'payment') {
        updateData.monthly_cost = formData.monthly_cost ? parseFloat(formData.monthly_cost) : null
      } else {
        updateData.monthly_cost = null
      }
      
      const { error } = await supabase
        .from('member_tabs')
        .update(updateData)
        .eq('id', editingTab.id)

      if (error) throw error

      setShowEditModal(false)
      setEditingTab(null)
      // Real-time subscription will automatically update the list
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTab = async (tabId: string) => {
    if (!confirm('Are you sure you want to delete this payment tab? This action cannot be undone.')) {
      return
    }

    setDeletingId(tabId)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('member_tabs')
        .delete()
        .eq('id', tabId)

      if (error) throw error

      // Real-time subscription will automatically update the list
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (tab: MemberTab) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('member_tabs')
        .update({ is_active: !tab.is_active })
        .eq('id', tab.id)

      if (error) throw error

      // Real-time subscription will automatically update the list
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    }
  }

  // Filter tabs based on search, type, and status
  const filteredTabs = useMemo(() => {
    return tabs.filter(tab => {
      const matchesSearch = searchTerm === '' || 
        tab.tab_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tab.member?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tab.member?.membership_id.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = filterType === 'all' || tab.tab_type === filterType
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && tab.is_active) ||
        (filterStatus === 'inactive' && !tab.is_active)
      
      return matchesSearch && matchesType && matchesStatus
    })
  }, [tabs, searchTerm, filterType, filterStatus])

  const activeTabsCount = tabs.filter(t => t.is_active).length
  const inactiveTabsCount = tabs.filter(t => !t.is_active).length
  const paymentTabsCount = tabs.filter(t => t.tab_type === 'payment').length
  const donationTabsCount = tabs.filter(t => t.tab_type === 'donation').length
  
  // Calculate percentages
  const totalTabs = tabs.length
  const activePercentage = totalTabs > 0 ? ((activeTabsCount / totalTabs) * 100).toFixed(1) : '0.0'
  const inactivePercentage = totalTabs > 0 ? ((inactiveTabsCount / totalTabs) * 100).toFixed(1) : '0.0'
  const paymentPercentage = totalTabs > 0 ? ((paymentTabsCount / totalTabs) * 100).toFixed(1) : '0.0'
  const donationPercentage = totalTabs > 0 ? ((donationTabsCount / totalTabs) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Payment Tabs</h1>
            <div className="flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
              {isRealtimeConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-500">Offline</span>
                </>
              )}
            </div>
          </div>
          <p className="text-gray-600 mt-1">Manage all payment and donation tabs for your organization</p>
        </div>
        <button
          onClick={handleCreateTab}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Tab
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Tabs</div>
          <div className="text-2xl font-bold text-gray-900">{tabs.length}</div>
          <div className="text-xs text-gray-500 mt-1">100.0%</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Active Tabs</div>
          <div className="text-2xl font-bold text-green-600">{activeTabsCount}</div>
          <div className="text-xs text-green-600 mt-1">{activePercentage}%</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Payment Tabs</div>
          <div className="text-2xl font-bold text-blue-600">{paymentTabsCount}</div>
          <div className="text-xs text-blue-600 mt-1">{paymentPercentage}%</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Donation Tabs</div>
          <div className="text-2xl font-bold text-purple-600">{donationTabsCount}</div>
          <div className="text-xs text-purple-600 mt-1">{donationPercentage}%</div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tab name, member name, or membership ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'payment' | 'donation')}
          >
            <option value="all">All Types</option>
            <option value="payment">Payment Only</option>
            <option value="donation">Donation Only</option>
          </select>
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabs List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading tabs...</div>
        ) : filteredTabs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {tabs.length === 0 
              ? 'No payment tabs found. Click "Create Tab" to add one.'
              : 'No tabs match your search criteria.'}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
              {filteredTabs.map((tab) => (
                <div key={tab.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900">{tab.tab_name}</h3>
                      {tab.description && (
                        <p className="text-sm text-gray-500 mt-1">{tab.description}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                      tab.tab_type === 'payment'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {tab.tab_type === 'payment' ? (
                        <CreditCard className="h-3 w-3" />
                      ) : (
                        <Heart className="h-3 w-3" />
                      )}
                      {tab.tab_type === 'payment' ? 'Payment' : 'Donation'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    {tab.member && (
                      <div>
                        <span className="text-gray-500">Member: </span>
                        <span className="text-gray-900 font-medium">{tab.member.full_name}</span>
                        <span className="text-gray-500 text-xs ml-1">({tab.member.membership_id})</span>
                      </div>
                    )}
                    {tab.tab_type === 'payment' && tab.monthly_cost && (
                      <div>
                        <span className="text-gray-500">Amount: </span>
                        <span className="font-semibold text-gray-900">{formatCurrency(tab.monthly_cost)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Status: </span>
                      <button
                        onClick={() => handleToggleActive(tab)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          tab.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tab.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleEditTab(tab)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-md transition-colors text-xs sm:text-sm"
                      title="Edit tab"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTab(tab.id)}
                          disabled={deletingId === tab.id}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 disabled:opacity-50"
                          title="Delete tab"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full align-middle px-4 sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 lg:px-6 xl:px-8 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 uppercase tracking-wider">Tab Name</th>
                      <th className="px-4 lg:px-6 xl:px-8 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 uppercase tracking-wider">Type</th>
                      <th className="px-4 lg:px-6 xl:px-8 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 uppercase tracking-wider">Member</th>
                      <th className="px-4 lg:px-6 xl:px-8 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                      <th className="px-4 lg:px-6 xl:px-8 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 lg:px-6 xl:px-8 py-3 text-left text-xs lg:text-sm font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTabs.map((tab) => (
                      <tr key={tab.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 lg:px-6 xl:px-8 py-4">
                          <div className="text-sm lg:text-base font-medium text-gray-900">{tab.tab_name}</div>
                          {tab.description && (
                            <div className="text-sm lg:text-base text-gray-500 max-w-md truncate" title={tab.description}>{tab.description}</div>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 xl:px-8 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs lg:text-sm font-medium ${
                            tab.tab_type === 'payment'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {tab.tab_type === 'payment' ? (
                              <CreditCard className="h-3 w-3 lg:h-4 lg:w-4" />
                            ) : (
                              <Heart className="h-3 w-3 lg:h-4 lg:w-4" />
                            )}
                            {tab.tab_type === 'payment' ? 'Payment' : 'Donation'}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 xl:px-8 py-4">
                          {tab.member ? (
                            <div className="text-sm lg:text-base text-gray-900">{tab.member.full_name}</div>
                          ) : (
                            <div className="text-sm lg:text-base text-gray-400">-</div>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 xl:px-8 py-4 whitespace-nowrap">
                          {tab.tab_type === 'payment' && tab.monthly_cost ? (
                            <div className="text-sm lg:text-base font-semibold text-gray-900">{formatCurrency(tab.monthly_cost)}</div>
                          ) : (
                            <div className="text-sm lg:text-base text-gray-400">-</div>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 xl:px-8 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(tab)}
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs lg:text-sm font-medium transition-colors ${
                              tab.is_active
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {tab.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 lg:px-6 xl:px-8 py-4 whitespace-nowrap text-sm lg:text-base font-medium">
                          <div className="flex gap-2">
                          <button
                            onClick={() => handleEditTab(tab)}
                            className="flex items-center gap-1 px-3 py-2 text-primary-600 hover:text-primary-900 hover:bg-primary-50 rounded-md transition-colors"
                            title="Edit tab"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTab(tab.id)}
                            disabled={deletingId === tab.id}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 disabled:opacity-50"
                            title="Delete tab"
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
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <BulkTabCreator
          organizationId={organizationId}
          onClose={() => {
            setShowCreateModal(false)
            loadTabs()
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingTab && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Payment Tab</h3>
                <p className="text-sm text-gray-500 mt-1">Update tab details</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingTab(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSaveTab} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="edit_tab_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Tab Name *
                  </label>
                  <input
                    id="edit_tab_name"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.tab_name}
                    onChange={(e) => setFormData({ ...formData, tab_name: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="edit_tab_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Tab Type *
                  </label>
                  <select
                    id="edit_tab_type"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.tab_type}
                    onChange={(e) => setFormData({ ...formData, tab_type: e.target.value as 'payment' | 'donation' })}
                  >
                    <option value="payment">Payment</option>
                    <option value="donation">Donation</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit_description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    id="edit_description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {formData.tab_type === 'payment' && (
                  <div>
                    <label htmlFor="edit_monthly_cost" className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Cost *
                    </label>
                    <input
                      id="edit_monthly_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      required={formData.tab_type === 'payment'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      value={formData.monthly_cost}
                      onChange={(e) => setFormData({ ...formData, monthly_cost: e.target.value })}
                    />
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    id="edit_is_active"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <label htmlFor="edit_is_active" className="ml-2 block text-sm text-gray-700">
                    Active (visible to member)
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingTab(null)
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
