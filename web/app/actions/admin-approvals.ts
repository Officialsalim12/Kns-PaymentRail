'use server'

import { createClient } from '@/lib/supabase/server'

export async function setMemberStatusAtomic(params: {
  memberId: string
  newStatus: 'active' | 'inactive' | 'suspended'
  initialUnpaidBalance?: number
}) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('set_member_status_atomic', {
    p_member_id: params.memberId,
    p_new_status: params.newStatus,
    p_initial_unpaid_balance: params.initialUnpaidBalance ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

