'use server'

import { createClient } from '@/lib/supabase/server'

export async function createOrReusePendingPayment(params: {
  memberId: string
  amount: number
  description: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('create_or_reuse_pending_payment', {
    p_member_id: params.memberId,
    p_amount: params.amount,
    p_description: params.description,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as { payment_id: string; reused: boolean }
}

