'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { withRetry } from '@/lib/utils/retry'

export async function createOrgAdminUserProfile(
  userId: string,
  email: string,
  fullName: string,
  organizationId: string,
  phoneNumber: string | null
) {
  const supabase = createServiceRoleClient()

  try {
    return await withRetry(async () => {
      // 1. Try to upsert the user profile
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email,
          full_name: fullName,
          role: 'org_admin',
          organization_id: organizationId,
          phone_number: phoneNumber,
        })

      if (!upsertError || upsertError.code === '23505') {
        return { success: true, error: null }
      }

      // 2. Handle Foreign Key errors (user might not be in auth.users yet)
      if (upsertError.code === '23503' || upsertError.message?.includes('foreign key')) {
        const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(userId)

        if (getUserError) throw getUserError

        if (authUser?.user) {
          // Confirm email if not already confirmed
          if (!authUser.user.email_confirmed_at) {
            await supabase.auth.admin.updateUserById(userId, { email_confirm: true })
          }
          // Throw error to trigger retry now that user is confirmed/found
          throw new Error('Retrying after auth verification...')
        }

        throw new Error('User not found in auth system')
      }

      throw upsertError
    }, {
      maxRetries: 10,
      onRetry: (err, attempt) => console.log(`[Org Registration] Retry attempt ${attempt}: ${err.message}`)
    })
  } catch (error: any) {
    console.error('[Organization Registration] Final failure:', error)
    return {
      success: false,
      error: `Failed to create user profile: ${error.message || 'Unknown error'}`
    }
  }
}
