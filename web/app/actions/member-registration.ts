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

  const maxRetries = 8
  const retryDelay = 400

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (attempt > 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelay))
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
      return { success: true, error: null }
    }

    if (insertError.code === '23503' || insertError.message?.includes('foreign key')) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      
      if (authUser && authUser.user) {
        if (!authUser.user.email_confirmed_at) {
          await supabase.auth.admin.updateUserById(userId, {
            email_confirm: true
          })
        }
        continue
      }
      
      if (attempt === maxRetries) {
        return { 
          success: false, 
          error: `User not found in auth.users after ${maxRetries} attempts. Please ensure email confirmation is disabled in Supabase settings, or try again after a moment.` 
        }
      }
      continue
    }

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

