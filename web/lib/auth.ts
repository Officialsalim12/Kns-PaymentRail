import { createClient } from './supabase/server'
import { redirect } from 'next/navigation'

export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const getUserPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<{ data: { user: null }, error: { message: string } }>((resolve) => 
      setTimeout(() => resolve({ data: { user: null }, error: { message: 'Network timeout' } }), 5000)
    )

    const authResult = await Promise.race([getUserPromise, timeoutPromise])
    const {
      data: { user },
      error: authError,
    } = authResult as { data: { user: any }, error: any }

    if (authError || !user) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[getCurrentUser] Auth error:', authError?.message || 'No user found')
      }
      return null
    }

    // Try to fetch profile with retry logic
    let userProfile = null
    let profileError = null
    const maxRetries = 3
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const profilePromise = supabase
        .from('users')
        .select('*, organization:organizations(*)')
        .eq('id', user.id)
        .single()
      
      const profileTimeoutPromise = new Promise<{ data: null, error: { message: string } }>((resolve) => 
        setTimeout(() => resolve({ data: null, error: { message: 'Network timeout' } }), 5000)
      )

      const profileResult = await Promise.race([profilePromise, profileTimeoutPromise])
      const { data: profile, error: error } = profileResult as { data: any, error: any }
      
      if (!error && profile) {
        userProfile = profile
        break
      }
      
      profileError = error
      
      // If it's not a network error and not the last attempt, wait before retrying
      if (attempt < maxRetries && error?.code !== 'PGRST116') {
        await new Promise(resolve => setTimeout(resolve, 500 * attempt))
      }
    }

    if (profileError || !userProfile) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[getCurrentUser] Profile error after retries:', profileError?.message || 'No profile found', {
          userId: user.id,
          errorCode: profileError?.code,
          errorDetails: profileError,
          attempts: maxRetries
        })
      }
      return null
    }

    return {
      ...user,
      profile: userProfile,
    }
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getCurrentUser] Unexpected error:', error.message, error.stack)
    }
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()
  
  if (!user.profile?.role || !allowedRoles.includes(user.profile.role)) {
    redirect('/unauthorized')
  }
  
  return user
}

export async function requireSuperAdmin() {
  return await requireRole(['super_admin'])
}

export async function requireOrgAdmin() {
  return await requireRole(['org_admin', 'super_admin'])
}

