'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth'

export async function approvePasswordResetRequest(requestId: string, userEmail: string) {
  // Ensure user is super admin
  await requireSuperAdmin()
  
  const supabase = createServiceRoleClient()
  
  try {
    // Update request status
    const { error: updateError } = await supabase
      .from('password_reset_requests')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (updateError) {
      return { 
        success: false, 
        error: `Failed to update request: ${updateError.message}` 
      }
    }

    // Send password reset email via Supabase Auth
    // The service role client allows us to send reset emails for any user
    const resetUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${resetUrl}/reset-password`,
    })

    if (resetError) {
      console.error('Error sending reset email:', resetError)
      // Still mark as approved, but log the error
      return { 
        success: true, 
        error: null,
        warning: 'Request approved but email could not be sent. Please contact the user manually.'
      }
    }

    return { 
      success: true, 
      error: null 
    }
  } catch (err: any) {
    console.error('Error approving password reset:', err)
    return { 
      success: false, 
      error: err.message || 'Failed to approve password reset request' 
    }
  }
}

export async function declinePasswordResetRequest(requestId: string) {
  // Ensure user is super admin
  await requireSuperAdmin()
  
  const supabase = createServiceRoleClient()
  
  try {
    const { error } = await supabase
      .from('password_reset_requests')
      .update({ 
        status: 'declined',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (error) {
      return { 
        success: false, 
        error: `Failed to decline request: ${error.message}` 
      }
    }

    return { 
      success: true, 
      error: null 
    }
  } catch (err: any) {
    console.error('Error declining password reset:', err)
    return { 
      success: false, 
      error: err.message || 'Failed to decline password reset request' 
    }
  }
}
