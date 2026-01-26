'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export async function createMemberUserProfile(
  userId: string,
  email: string,
  fullName: string,
  organizationId: string
) {
  let supabase
  try {
    supabase = createServiceRoleClient()
  } catch (error) {
    return { 
      success: false, 
      error: 'Service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY environment variable.' 
    }
  }

  const maxRetries = 12
  const baseRetryDelay = 500
  const maxRetryDelay = 2000

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (attempt > 1) {
      // Exponential backoff with jitter
      const delay = Math.min(baseRetryDelay * Math.pow(1.5, attempt - 2), maxRetryDelay)
      const jitter = Math.random() * 200
      await new Promise(resolve => setTimeout(resolve, delay + jitter))
    }

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        role: 'member',
        organization_id: organizationId,
        phone_number: null,
      })

    if (!insertError) {
      return { success: true, error: null }
    }

    if (insertError.code === '23505') {
      // User already exists, that's fine
      return { success: true, error: null }
    }

    if (insertError.code === '23503' || insertError.message?.includes('foreign key')) {
      try {
        const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(userId)
        
        if (getUserError) {
          console.error(`[Member Registration] Error fetching auth user (attempt ${attempt}):`, getUserError)
          
          // If it's a network error or user not found, wait and retry
          if (attempt < maxRetries) {
            continue
          }
          
          return {
            success: false,
            error: `Unable to verify user in auth system: ${getUserError.message}. Please try again or contact support.`
          }
        }
        
        if (authUser && authUser.user) {
          // User exists, confirm email if needed
          if (!authUser.user.email_confirmed_at) {
            try {
              const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, {
                email_confirm: true
              })
              
              if (confirmError) {
                console.error(`[Member Registration] Error confirming email:`, confirmError)
              } else {
                // Wait a bit after confirming email before retrying
                await new Promise(resolve => setTimeout(resolve, 500))
              }
            } catch (confirmErr) {
              console.error(`[Member Registration] Exception confirming email:`, confirmErr)
            }
          }
          
          // Retry the insert
          continue
        }
        
        // User not found in auth.users
        if (attempt === maxRetries) {
          return {
            success: false,
            error: `User account was not found in the authentication system after ${maxRetries} attempts. This may happen if email confirmation is enabled. Please check your Supabase settings or try registering again.`
          }
        }
        
        // Wait longer if user not found
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      } catch (err: any) {
        console.error(`[Member Registration] Exception checking auth user (attempt ${attempt}):`, err)
        
        if (attempt === maxRetries) {
          return {
            success: false,
            error: `Failed to verify user account: ${err.message || 'Unknown error'}. Please try again.`
          }
        }
        continue
      }
    }

    // Other errors - return immediately
    return {
      success: false,
      error: `Failed to create user profile: ${insertError.message}`
    }
  }

  return {
    success: false, 
    error: 'Failed to create user profile after multiple attempts' 
  }
}

