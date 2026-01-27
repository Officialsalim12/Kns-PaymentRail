'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createMemberUserProfile } from '@/app/actions/member-registration'
import { User, Mail, Lock, Building2, CheckCircle } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

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

      // Step 1: Sign up the member use
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
              message: `${formData.full_name.trim()} ({membershipId}) has requested to join your organization and is pending approval.`,
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
      <div className="rounded-lg bg-green-50 p-6 border border-green-100 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-green-900 mb-2">Registration Successful!</h3>
        <p className="text-green-700 mb-6">
          Your account has been created. An admin may need to approve your membership before you get full access.
        </p>
        <p className="text-sm text-green-600 font-medium">Redirecting to login...</p>
      </div>
    )
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* User Info */}
        <Input
          id="full_name"
          label="Full Name"
          type="text"
          placeholder="John Doe"
          required
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          leftIcon={<User className="h-5 w-5" />}
        />

        <Input
          id="email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          leftIcon={<Mail className="h-5 w-5" />}
        />

        <div>
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="Min 6 characters"
            required
            minLength={6}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            leftIcon={<Lock className="h-5 w-5" />}
          />
          <p className="mt-1.5 text-xs text-gray-500">Must be at least 6 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="organization_id">
            Organization
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Building2 className="h-5 w-5" />
            </div>
            <select
              id="organization_id"
              required
              className="block w-full pl-10 pr-3 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg"
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

      <div className="pt-2">
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
          <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
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
          </label>
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          className="mt-6"
          disabled={loading || !agreedToTerms}
          isLoading={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
      </div>
    </form>
  )
}
