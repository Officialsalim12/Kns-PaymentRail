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
      return null
    }

    const profilePromise = supabase
      .from('users')
      .select('*, organization:organizations(*)')
      .eq('id', user.id)
      .single()
    
    const profileTimeoutPromise = new Promise<{ data: null, error: { message: string } }>((resolve) => 
      setTimeout(() => resolve({ data: null, error: { message: 'Network timeout' } }), 5000)
    )

    const profileResult = await Promise.race([profilePromise, profileTimeoutPromise])
    const { data: userProfile, error: profileError } = profileResult as { data: any, error: any }

    if (profileError || !userProfile) {
      return null
    }

    return {
      ...user,
      profile: userProfile,
    }
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[getCurrentUser] Error:', error.message)
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

