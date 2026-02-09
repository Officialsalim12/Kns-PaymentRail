'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export async function createSuperAdminUserProfile(
    userId: string,
    email: string,
    fullName: string,
    phoneNumber: string | null = null
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

        const { error: upsertError } = await supabase
            .from('users')
            .upsert({
                id: userId,
                email: email,
                full_name: fullName,
                role: 'super_admin',
                organization_id: null, // Super admins are not tied to an organization
                phone_number: phoneNumber,
            })

        if (!upsertError) {
            return { success: true, error: null }
        }

        if (upsertError.code === '23505') {
            // User already exists, that's fine
            return { success: true, error: null }
        }

        if (upsertError.code === '23503' || upsertError.message?.includes('foreign key')) {
            try {
                const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(userId)

                if (getUserError) {
                    console.error(`[Super Admin Registration] Error fetching auth user (attempt ${attempt}):`, getUserError)

                    if (attempt < maxRetries) {
                        continue
                    }

                    return {
                        success: false,
                        error: `Unable to verify user in auth system: ${getUserError.message}. Please try again.`
                    }
                }

                if (authUser && authUser.user) {
                    // Confirm email if needed
                    if (!authUser.user.email_confirmed_at) {
                        try {
                            const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, {
                                email_confirm: true
                            })

                            if (confirmError) {
                                console.error(`[Super Admin Registration] Error confirming email:`, confirmError)
                            } else {
                                await new Promise(resolve => setTimeout(resolve, 500))
                            }
                        } catch (confirmErr) {
                            console.error(`[Super Admin Registration] Exception confirming email:`, confirmErr)
                        }
                    }

                    continue
                }

                if (attempt === maxRetries) {
                    return {
                        success: false,
                        error: `User account was not found in the authentication system after ${maxRetries} attempts.`
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 1000))
                continue
            } catch (err: any) {
                console.error(`[Super Admin Registration] Exception checking auth user (attempt ${attempt}):`, err)

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
            error: `Failed to create user profile: ${upsertError.message}`
        }
    }

    return {
        success: false,
        error: 'Failed to create user profile after multiple attempts'
    }
}
