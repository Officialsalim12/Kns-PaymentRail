'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createMemberUserProfile } from '@/app/actions/member-registration'

interface OrganizationOption {
  id: string
  name: string
  organization_type?: string
}

interface Props {
  organizations: OrganizationOption[]
}

export default function MemberRegistrationForm({ organizations }: Props) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    organization_id: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy to continue')
      return
    }
    
    setLoading(true)

    try {
      const supabase = createClient()

      if (!formData.organization_id) {
        setError('Please select your organization')
        setLoading(false)
        return
      }

      // Step 1: Sign up the member user
      // Disable email confirmation requirement for immediate user creation
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: undefined,
          data: {
            full_name: formData.full_name.trim(),
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Failed to create user account')
        setLoading(false)
        return
      }

      const profileResult = await createMemberUserProfile(
        authData.user.id,
        formData.email.trim(),
        formData.full_name.trim(),
        formData.organization_id
      )

      if (!profileResult.success) {
        setError(`Failed to create user profile: ${profileResult.error || 'Unknown error'}`)
        setLoading(false)
        return
      }

      // Step 3: Generate a unique membership ID
      // Format: MEM-{timestamp}-{random string}
      const timestamp = Date.now().toString(36).toUpperCase()
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase()
      const membershipId = `MEM-${timestamp}-${randomStr}`

      // Step 4: Create member record
      const { data: newMember, error: memberError } = await supabase
        .from('members')
        .insert({
          organization_id: formData.organization_id,
          user_id: authData.user.id,
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          membership_id: membershipId,
          status: 'pending',
          unpaid_balance: 0.0,
          total_paid: 0.0,
        })
        .select()
        .single()

      if (memberError) {
        setError(`Failed to create member record: ${memberError.message}`)
        setLoading(false)
        return
      }

      // Step 5: Notify admin about new member request
      if (newMember) {
        // Get organization admin
        const { data: adminUser } = await supabase
          .from('users')
          .select('id')
          .eq('organization_id', formData.organization_id)
          .eq('role', 'org_admin')
          .single()

        if (adminUser) {
          await supabase
            .from('notifications')
            .insert({
              organization_id: formData.organization_id,
              recipient_id: adminUser.id,
              member_id: newMember.id,
              title: 'New Member Request',
              message: `${formData.full_name.trim()} (${membershipId}) has requested to join your organization and is pending approval.`,
              type: 'member_request',
            })
        }
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
        <p className="font-semibold">Registration Submitted!</p>
        <p className="text-sm mt-1">
          Your member account has been created and linked to your organization.
          An admin may need to approve your membership before you get full access.
          Redirecting to login...
        </p>
      </div>
    )
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* User Info */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="full_name">
                Full Name *
              </label>
              <input
                id="full_name"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                Email Address *
              </label>
              <input
                id="email"
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                Password *
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
            </div>
          </div>
        </div>

        {/* Organization */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="organization_id">
                Organization *
              </label>
              <select
                id="organization_id"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={formData.organization_id}
                onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
              >
                <option value="">Select your organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                    {org.organization_type ? ` (${org.organization_type})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="terms" className="ml-3 text-sm text-gray-700">
            I agree to the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-medium underline"
            >
              Terms of Service
            </a>
            {' '}and{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-medium underline"
            >
              Privacy Policy
            </a>
            {' '}*
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !agreedToTerms}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating account...' : 'Create Member Account'}
        </button>
      </div>
    </form>
  )
}
