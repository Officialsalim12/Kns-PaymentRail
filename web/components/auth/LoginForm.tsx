'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Mail, Lock, User } from 'lucide-react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState(false)

  // Password Reset States
  const [resetName, setResetName] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [resetPhone, setResetPhone] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Wait a bit for the session to be fully established
        await new Promise(resolve => setTimeout(resolve, 300))

        // Query the user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()

        // If profile query fails, redirect to home and let server-side handle it
        if (profileError) {
          console.log('Profile query failed, redirecting to home for server-side role detection')
          window.location.href = '/'
          return
        }

        const role = profile?.role || null

        if (!role) {
          console.log('User role not found, redirecting to home for server-side handling')
          window.location.href = '/'
          return
        }

        console.log('Login successful, redirecting user with role:', role)

        // Use window.location.href for a full page reload to ensure session cookies are read
        if (role === 'super_admin') {
          window.location.href = '/super-admin'
        } else if (role === 'org_admin') {
          window.location.href = '/admin'
        } else if (role === 'member') {
          window.location.href = '/member'
        } else {
          // Unknown role - redirect to home
          console.warn('Unknown user role:', role)
          window.location.href = '/'
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle password reset submission
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: insertError } = await supabase
        .from('password_reset_requests')
        .insert({
          user_name: resetName,
          user_email: resetEmail,
          user_phone: resetPhone,
          status: 'pending',
        })

      if (insertError) {
        throw insertError
      }

      setResetSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit password reset request')
    } finally {
      setResetLoading(false)
    }
  }

  const closeResetModal = () => {
    setShowPasswordReset(false)
    setResetSuccess(false)
    setResetName('')
    setResetEmail('')
    setResetPhone('')
    setError(null)
  }

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && !showPasswordReset && (
          <div className="p-4 rounded-md bg-red-50 border border-red-100 flex items-start">
            <X className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <Input
            id="email"
            type="email"
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            leftIcon={<Mail className="h-5 w-5" />}
          />

          <div className="space-y-1">
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              leftIcon={<Lock className="h-5 w-5" />}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowPasswordReset(true)}
                className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          fullWidth
          isLoading={loading}
          size="lg"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm"
              aria-hidden="true"
              onClick={closeResetModal}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  onClick={closeResetModal}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Reset Password
                  </h3>

                  {resetSuccess ? (
                    <div className="mt-4">
                      <div className="rounded-md bg-green-50 p-4 border border-green-100">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            {/* Check circle icon */}
                            <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-green-800">Request Submitted</h3>
                            <div className="mt-2 text-sm text-green-700">
                              <p>Your password reset request has been submitted. The superadmin will review and approve it. You will receive an email once approved.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 sm:mt-6">
                        <Button
                          type="button"
                          fullWidth
                          onClick={closeResetModal}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-4">
                        Please provide your details to request a password reset.
                      </p>

                      <form onSubmit={handleResetSubmit} className="space-y-4">
                        {error && (
                          <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">
                            {error}
                          </div>
                        )}

                        <Input
                          label="Full Name"
                          value={resetName}
                          onChange={(e) => setResetName(e.target.value)}
                          placeholder="John Doe"
                          required
                          leftIcon={<User className="h-4 w-4" />}
                        />

                        <Input
                          label="Email Address"
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="john@example.com"
                          required
                          leftIcon={<Mail className="h-4 w-4" />}
                        />

                        <Input
                          label="Phone Number"
                          type="tel"
                          value={resetPhone}
                          onChange={(e) => setResetPhone(e.target.value)}
                          placeholder="+1234567890"
                          required
                        />

                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                          <Button
                            type="submit"
                            isLoading={resetLoading}
                            fullWidth
                            className="sm:col-start-2"
                          >
                            Submit Request
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            fullWidth
                            className="mt-3 sm:mt-0 sm:col-start-1"
                            onClick={closeResetModal}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

