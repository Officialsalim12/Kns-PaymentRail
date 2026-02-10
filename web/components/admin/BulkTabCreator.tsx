'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Users, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/currency'

interface Props {
  organizationId: string
  onClose: () => void
}

export default function BulkTabCreator({ organizationId, onClose }: Props) {
  const router = useRouter()
  const [scope, setScope] = useState<'all' | 'single'>('all')
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [members, setMembers] = useState<Array<{ id: string; full_name: string; membership_id: string; status?: string }>>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [formData, setFormData] = useState({
    tab_name: '',
    tab_type: 'payment' as 'payment' | 'donation',
    payment_nature: 'open' as 'open' | 'compulsory',
    description: '',
    monthly_cost: '',
    duration_months: '',
    billing_cycle: 'monthly' as 'weekly' | 'monthly',
    is_active: true,
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    if (scope !== 'single') return

    if (!organizationId) {
      setError('Organization ID is missing')
      return
    }

    setLoadingMembers(true)
    setError(null)
    try {
      const supabase = createClient()

      // First, try to get all members to see what we have
      const { data: allMembers, error: allError } = await supabase
        .from('members')
        .select('id, full_name, membership_id, status')
        .eq('organization_id', organizationId)
        .order('full_name')

      console.log('All members for org:', organizationId, ':', allMembers?.length || 0, allMembers)

      if (allError) {
        console.error('Error loading all members:', allError)
        throw allError
      }

      // Filter to active and pending
      const filteredMembers = (allMembers || []).filter(m =>
        m.status === 'active' || m.status === 'pending'
      )

      console.log('Filtered members (active/pending):', filteredMembers.length, filteredMembers)

      setMembers(filteredMembers)

      if (filteredMembers.length === 0) {
        if (allMembers && allMembers.length > 0) {
          const statuses = Array.from(new Set(allMembers.map(m => m.status)))
          setError(`No active or pending members found. Found ${allMembers.length} member(s) with status(es): ${statuses.join(', ')}`)
        } else {
          setError('No members found for this organization. Members must register first.')
        }
      }
    } catch (err: any) {
      console.error('Error in loadMembers:', err)
      setError(err.message || 'Failed to load members')
      setMembers([])
    } finally {
      setLoadingMembers(false)
    }
  }, [scope, organizationId])

  // Load members when scope changes to 'single'
  useEffect(() => {
    if (scope === 'single') {
      loadMembers()
    } else {
      // Clear members when switching away from single
      setMembers([])
      setSelectedMemberId('')
    }
  }, [scope, loadMembers])

  const handleScopeChange = (newScope: 'all' | 'single') => {
    setScope(newScope)
    setSelectedMemberId('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (scope === 'single' && !selectedMemberId) {
        throw new Error('Please select a member')
      }

      // Get member IDs to create tabs for
      let memberIds: string[] = []
      let isGeneralTab = false

      if (scope === 'all') {
        // Get all active and pending members (for consistency across all organizations)
        const { data: allMembers, error: membersError } = await supabase
          .from('members')
          .select('id')
          .eq('organization_id', organizationId)
          .in('status', ['active', 'pending'])

        if (membersError) throw membersError
        memberIds = allMembers?.map(m => m.id) || []

        if (memberIds.length === 0) {
          isGeneralTab = true
        }
      } else {
        if (!selectedMemberId) {
          throw new Error('Please select a member')
        }
        memberIds = [selectedMemberId]
      }

      // Prepare tab data
      const insertData: any = {
        organization_id: organizationId,
        tab_name: formData.tab_name,
        tab_type: formData.tab_type,
        description: formData.description || null,
        is_active: formData.is_active,
        created_by: user.id,
      }

      if (formData.tab_type === 'payment') {
        insertData.monthly_cost = formData.monthly_cost ? parseFloat(formData.monthly_cost) : null
        insertData.billing_cycle = formData.billing_cycle
        insertData.payment_nature = formData.payment_nature || 'open'
        insertData.duration_months = formData.duration_months && formData.payment_nature === 'compulsory'
          ? parseInt(formData.duration_months)
          : null
      }

      // Create tabs for all selected members or as a general tab
      const tabsToInsert = isGeneralTab
        ? [{ ...insertData, member_id: null }]
        : memberIds.map(memberId => ({
          ...insertData,
          member_id: memberId,
        }))

      // Insert in batches to avoid payload size issues
      const batchSize = 100
      let created = 0

      for (let i = 0; i < tabsToInsert.length; i += batchSize) {
        const batch = tabsToInsert.slice(i, i + batchSize)
        const { error: insertError } = await supabase
          .from('member_tabs')
          .insert(batch)

        if (insertError) throw insertError
        created += batch.length
      }

      setSuccess(`Successfully created tab for ${created} member(s)!`)
      setTimeout(() => {
        onClose()
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Create Payment Tab</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Create a payment or donation tab for members</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {/* Scope Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Create tab for:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => handleScopeChange('all')}
                  className={`p-4 border-2 rounded-lg transition-all ${scope === 'all'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <Users className="h-6 w-6 mx-auto mb-2 text-primary-600" />
                  <p className="font-semibold text-gray-900">All Members</p>
                  <p className="text-xs text-gray-500 mt-1">Create for all active members</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleScopeChange('single')}
                  className={`p-4 border-2 rounded-lg transition-all ${scope === 'single'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <User className="h-6 w-6 mx-auto mb-2 text-primary-600" />
                  <p className="font-semibold text-gray-900">Single Member</p>
                  <p className="text-xs text-gray-500 mt-1">Create for one member only</p>
                </button>
              </div>
            </div>

            {/* Member Selection (if single) */}
            {scope === 'single' && (
              <div>
                <label htmlFor="member" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Member *
                </label>
                {loadingMembers ? (
                  <div className="text-center py-4 text-gray-500">Loading members...</div>
                ) : members.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="text-gray-500 mb-2">
                      {error || 'No members found.'}
                    </div>
                    <div className="text-xs text-gray-400">
                      Members must be registered and have status &quot;active&quot; or &quot;pending&quot;.
                    </div>
                  </div>
                ) : (
                  <select
                    id="member"
                    required={scope === 'single'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                  >
                    <option value="">-- Select a member --</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.membership_id}){member.status === 'pending' ? ' [Pending]' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Tab Name */}
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

            {/* Tab Type */}
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

            {/* Description */}
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

            {/* Payment Configuration (for payment type) */}
            {formData.tab_type === 'payment' && (
              <>
                {/* Payment Nature */}
                <div>
                  <label htmlFor="payment_nature" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Nature *
                  </label>
                  <select
                    id="payment_nature"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    value={formData.payment_nature}
                    onChange={(e) => setFormData({ ...formData, payment_nature: e.target.value as 'open' | 'compulsory' })}
                  >
                    <option value="open">Open - Members pay any amount, anytime</option>
                    <option value="compulsory">Compulsory - Fixed monthly payment required</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.payment_nature === 'compulsory'
                      ? '⚠️ Compulsory: Members must pay the fixed amount monthly. Unpaid balances accumulate, and accounts freeze after 3 consecutive unpaid months.'
                      : 'Open: Members can pay any amount at their convenience. No balance tracking.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="monthly_cost" className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.payment_nature === 'compulsory' ? 'Monthly Amount *' : 'Suggested Amount'}
                    </label>
                    <input
                      id="monthly_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      required={formData.tab_type === 'payment' && formData.payment_nature === 'compulsory'}
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

                {/* Duration (for compulsory only) */}
                {formData.payment_nature === 'compulsory' && (
                  <div>
                    <label htmlFor="duration_months" className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (Months) - Optional
                    </label>
                    <input
                      id="duration_months"
                      type="number"
                      min="1"
                      max="120"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      value={formData.duration_months}
                      onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                      placeholder="e.g., 10 for 10-month payment plan"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank for indefinite compulsory payments. Set a duration (e.g., 10) for fixed-term payment plans.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Active Toggle */}
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

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {saving ? 'Creating...' : `Create Tab${scope === 'all' ? 's' : ''}`}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

