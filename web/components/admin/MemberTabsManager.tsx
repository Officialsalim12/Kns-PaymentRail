'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/currency'

interface MemberTab {
  id: string
  tab_name: string
  tab_type: 'payment' | 'donation'
  description: string | null
  monthly_cost: number | null
  billing_cycle: 'weekly' | 'monthly'
  is_active: boolean
  created_at: string
}

interface Props {
  memberId: string
  memberName: string
  organizationId: string
  onClose: () => void
}

export default function MemberTabsManager({ memberId, memberName, organizationId, onClose }: Props) {
  const router = useRouter()
  const [tabs, setTabs] = useState<MemberTab[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTab, setEditingTab] = useState<MemberTab | null>(null)
  const [formData, setFormData] = useState({
    tab_name: '',
    tab_type: 'payment' as 'payment' | 'donation',
    description: '',
    monthly_cost: '',
    billing_cycle: 'monthly' as 'weekly' | 'monthly',
    is_active: true,
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadTabs = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('member_tabs')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTabs(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    loadTabs()
  }, [memberId, loadTabs])

  const handleCreateTab = () => {
    setEditingTab(null)
    setFormData({
      tab_name: '',
      tab_type: 'payment',
      description: '',
      monthly_cost: '',
      billing_cycle: 'monthly',
      is_active: true,
    })
    setShowCreateModal(true)
    setError(null)
  }

  const handleEditTab = (tab: MemberTab) => {
    setEditingTab(tab)
    setFormData({
      tab_name: tab.tab_name,
      tab_type: tab.tab_type,
      description: tab.description || '',
      monthly_cost: tab.monthly_cost?.toString() || '',
      billing_cycle: tab.billing_cycle || 'monthly',
      is_active: tab.is_active,
    })
    setShowCreateModal(true)
    setError(null)
  }

  const handleSaveTab = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (editingTab) {
        // Update existing tab
        const updateData: any = {
          tab_name: formData.tab_name,
          tab_type: formData.tab_type,
          description: formData.description || null,
          is_active: formData.is_active,
        }

        // Only include monthly_cost if tab_type is payment
        if (formData.tab_type === 'payment') {
          updateData.monthly_cost = formData.monthly_cost ? parseFloat(formData.monthly_cost) : null
          updateData.billing_cycle = formData.billing_cycle
        } else {
          updateData.monthly_cost = null
          updateData.billing_cycle = 'monthly' // Default for donations
        }

        const { error } = await supabase
          .from('member_tabs')
          .update(updateData)
          .eq('id', editingTab.id)

        if (error) throw error
      } else {
        // Create new tab
        const insertData: any = {
          organization_id: organizationId,
          member_id: memberId,
          tab_name: formData.tab_name,
          tab_type: formData.tab_type,
          description: formData.description || null,
          is_active: formData.is_active,
          created_by: user.id,
        }

        // Only include monthly_cost if tab_type is payment
        if (formData.tab_type === 'payment') {
          insertData.monthly_cost = formData.monthly_cost ? parseFloat(formData.monthly_cost) : null
          insertData.billing_cycle = formData.billing_cycle
        }

        const { error } = await supabase
          .from('member_tabs')
          .insert(insertData)

        if (error) throw error
      }

      setShowCreateModal(false)
      loadTabs()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTab = async (tabId: string) => {
    if (!confirm('Are you sure you want to delete this tab?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('member_tabs')
        .delete()
        .eq('id', tabId)

      if (error) throw error
      loadTabs()
      router.refresh()
    } catch (err: any) {
      alert(`Error deleting tab: ${err.message}`)
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
      loadTabs()
      router.refresh()
    } catch (err: any) {
      alert(`Error updating tab: ${err.message}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Manage Tabs for {memberName}</h3>
            <p className="text-sm text-gray-500 mt-1">Create custom payment/donation tabs for this member</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-900">Tabs ({tabs.length})</h4>
                <button
                  onClick={handleCreateTab}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4" />
                  Create Tab
                </button>
              </div>

              {tabs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No tabs created yet. Click &quot;Create Tab&quot; to add one.
                </div>
              ) : (
                <div className="space-y-3">
                  {tabs.map((tab) => (
                    <div
                      key={tab.id}
                      className={`border rounded-lg p-4 ${tab.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-semibold text-gray-900">{tab.tab_name}</h5>
                            <span className={`px-2 py-1 text-xs rounded ${tab.tab_type === 'payment'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700'
                              }`}>
                              {tab.tab_type === 'payment' ? 'Payment' : 'Donation'}
                            </span>
                            {!tab.is_active && (
                              <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                                Inactive
                              </span>
                            )}
                          </div>
                          {tab.description && (
                            <p className="text-sm text-gray-600 mt-1">{tab.description}</p>
                          )}
                          {tab.tab_type === 'payment' && tab.monthly_cost && (
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {formatCurrency(tab.monthly_cost)} / {tab.billing_cycle || 'month'}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleActive(tab)}
                            className={`px-3 py-1 text-xs rounded ${tab.is_active
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              : 'bg-green-200 text-green-700 hover:bg-green-300'
                              }`}
                          >
                            {tab.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleEditTab(tab)}
                            className="px-3 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteTab(tab.id)}
                            className="px-3 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">
                  {editingTab ? 'Edit Tab' : 'Create New Tab'}
                </h4>
              </div>
              <form onSubmit={handleSaveTab} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="tab_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Tab Name *
                  </label>
                  <input
                    id="tab_name"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.tab_name}
                    onChange={(e) => setFormData({ ...formData, tab_name: e.target.value })}
                    placeholder="e.g., Monthly Dues, Building Fund"
                  />
                </div>
                <div>
                  <label htmlFor="tab_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Tab Type *
                  </label>
                  <select
                    id="tab_type"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.tab_type}
                    onChange={(e) => setFormData({ ...formData, tab_type: e.target.value as 'payment' | 'donation' })}
                  >
                    <option value="payment">Payment (shows &quot;Pay Now&quot;)</option>
                    <option value="donation">Donation (shows &quot;Donate Here&quot;)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional information about this tab"
                  />
                </div>
                {formData.tab_type === 'payment' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="monthly_cost" className="block text-sm font-medium text-gray-700 mb-1">
                          Cost Amount *
                        </label>
                        <input
                          id="monthly_cost"
                          type="number"
                          step="0.01"
                          min="0"
                          required={formData.tab_type === 'payment'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={formData.monthly_cost}
                          onChange={(e) => setFormData({ ...formData, monthly_cost: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label htmlFor="billing_cycle" className="block text-sm font-medium text-gray-700 mb-1">
                          Billing Cycle *
                        </label>
                        <select
                          id="billing_cycle"
                          required={formData.tab_type === 'payment'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                          value={formData.billing_cycle}
                          onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value as 'weekly' | 'monthly' })}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">How often the member should pay this amount</p>
                  </>
                )}
                <div className="flex items-center">
                  <input
                    id="is_active"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                    Active (visible to member)
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingTab ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setError(null)
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

