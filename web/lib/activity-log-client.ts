'use client'

export type ActivityAction =
  | 'payment.created'
  | 'payment.completed'
  | 'payment.deleted'
  | 'payment.synced'
  | 'member.created'
  | 'member.updated'
  | 'member.deleted'
  | 'member.status_changed'
  | 'organization.created'
  | 'organization.updated'
  | 'organization.status_changed'
  | 'organization.deleted'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'settings.updated'
  | 'report.generated'
  | 'report.downloaded'
  | 'receipt.generated'
  | 'password.reset_requested'
  | 'password.reset_completed'
  | 'login'
  | 'logout'
  | 'tab.created'
  | 'tab.updated'
  | 'tab.deleted'
  | 'notification.sent'
  | 'message.sent'

export interface ActivityLogData {
  user_id: string
  user_email?: string
  user_name?: string
  user_role?: string
  organization_id?: string | null
  action: ActivityAction
  entity_type?: string // e.g., 'payment', 'member', 'organization'
  entity_id?: string
  description: string
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

/**
 * Client-side logging helper
 * Uses client Supabase client directly to avoid server/client boundary issues
 */
export async function logActivityClient(data: ActivityLogData): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    // Get current user info
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('users')
      .select('email, full_name, role, organization_id')
      .eq('id', user.id)
      .single()

    const logEntry = {
      user_id: user.id,
      user_email: profile?.email || user.email || data.user_email || null,
      user_name: profile?.full_name || data.user_name || null,
      user_role: profile?.role || data.user_role || null,
      organization_id: profile?.organization_id || data.organization_id || null,
      action: data.action,
      entity_type: data.entity_type || null,
      entity_id: data.entity_id || null,
      description: data.description,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('activity_logs')
      .insert(logEntry)

    if (error) {
      console.error('Failed to log activity:', error)
      // Don't throw - we don't want logging failures to break the app
    }
  } catch (error) {
    console.error('Error in client-side logging:', error)
    // Silently fail - logging should never break the application
  }
}
