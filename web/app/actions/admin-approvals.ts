'use server'

import { createClient } from '@/lib/supabase/server'

export async function setMemberStatusAtomic(params: {
  memberId: string
  newStatus: 'active' | 'inactive' | 'suspended'
  initialUnpaidBalance?: number
}) {
  const supabase = await createClient()

  const updatePayload: Record<string, unknown> = {
    status: params.newStatus,
  }

  // Stamp activated_at when a member is approved for the first time
  if (params.newStatus === 'active') {
    updatePayload.activated_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('members')
    .update(updatePayload)
    .eq('id', params.memberId)

  if (error) {
    throw new Error(error.message)
  }
}
