'use server'

import { createClient } from '@/lib/supabase/server'

export async function deletePaymentAtomic(paymentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('delete_payment_atomic', {
    p_payment_id: paymentId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

