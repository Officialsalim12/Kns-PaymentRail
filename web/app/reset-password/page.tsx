'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Lock } from 'lucide-react'
import AuthLayout from '@/components/auth/AuthLayout'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if we have a valid reset token in the URL (Supabase puts it in the hash)
    const checkToken = async () => {
      const supabase = createClient()
      
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        // Wait a moment for Supabase to process the hash and establish session
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsValidToken(true)
        } else {
          setIsValidToken(false)
          setError('Invalid or expired reset link. Please request a new password reset.')
        }
      } else {
        // Fallback: check if we already have a session (e.g. if hash was already processed)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsValidToken(true)
        } else {
          setIsValidToken(false)
          setError('No reset token found. Please use the link from your email.')
        }
      }
    }

    checkToken()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) throw updateError

      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.')
      console.error('Error resetting password:', err)
    } finally {
      setLoading(false)
    }
  }

  if (isValidToken === null) {
    return (
      <AuthLayout title="Verifying..." subtitle="Please wait while we verify your reset link.">
        <div className="flex flex-col items-center justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AuthLayout>
    )
  }

  if (isValidToken === false) {
    return (
      <AuthLayout 
        title="Invalid Link" 
        subtitle={error || "This password reset link is invalid or has expired."}
      >
        <div className="flex flex-col items-center justify-center py-6 space-y-6">
          <XCircle className="h-16 w-16 text-red-500" />
          <Button variant="outline" fullWidth onClick={() => router.push('/login')}>
            Return to Login
          </Button>
        </div>
      </AuthLayout>
    )
  }

  if (success) {
    return (
      <AuthLayout 
        title="Password Reset" 
        subtitle="Your password has been successfully updated."
      >
        <div className="flex flex-col items-center justify-center py-6 space-y-6">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <p className="text-center text-gray-600 text-sm">
            Redirecting you to login...
          </p>
          <Button fullWidth onClick={() => router.push('/login')}>
            Go to Login Now
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout 
      title="Create New Password" 
      subtitle="Enter a new secure password for your Fundflow account."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-xl text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <Input
            id="password"
            name="password"
            type="password"
            label="New Password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="Min. 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="h-5 w-5" />}
          />

          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm New Password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon={<Lock className="h-5 w-5" />}
          />
        </div>

        <Button
          type="submit"
          fullWidth
          isLoading={loading}
          size="lg"
        >
          {loading ? 'Updating Password...' : 'Reset Password'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
