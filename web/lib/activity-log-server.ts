import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ActivityAction, ActivityLogData } from './activity-log-client'

export async function logActivity(data: ActivityLogData): Promise<void> {
  try {
    const supabase = createServiceRoleClient()

    const logEntry = {
      user_id: data.user_id,
      user_email: data.user_email || null,
      user_name: data.user_name || null,
      user_role: data.user_role || null,
      organization_id: data.organization_id || null,
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
    }
  } catch (error) {
    console.error('Error logging activity:', error)
  }
}
export async function getUserInfoForLogging(userId: string): Promise<{
  email?: string
  full_name?: string
  role?: string
  organization_id?: string | null
}> {
  try {
    const supabase = createServiceRoleClient()
    const { data: user } = await supabase
      .from('users')
      .select('email, full_name, role, organization_id')
      .eq('id', userId)
      .single()

    return {
      email: user?.email,
      full_name: user?.full_name,
      role: user?.role,
      organization_id: user?.organization_id,
    }
  } catch (error) {
    console.error('Error getting user info for logging:', error)
    return {}
  }
}
