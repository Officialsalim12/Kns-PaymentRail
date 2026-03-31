'use server'

import { createClient } from '@/lib/supabase/server'

export async function createSecurePendingPayment(params: {
  memberId: string
  amount: number
  description: string
  paymentType?: string
  quantity?: number
}) {
  const supabase = await createClient()

  // Verify that the memberId belongs to the currently authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single()

  if (memberError || !member || member.id !== params.memberId) {
    throw new Error('Unauthorized or member mismatch. Please refresh your session.')
  }

  // Insert a fresh pending payment (no reuse to avoid ID collision and leakage)
  const { data, error } = await supabase
    .from('payments')
    .insert({
      member_id: params.memberId,
      organization_id: member.organization_id,
      amount: params.amount,
      description: params.description,
      payment_type: params.paymentType || 'one-time',
      quantity: params.quantity || 1,
      payment_status: 'pending',
      payment_method: 'card', 
      reference_number: `TBD-${Date.now()}` // Temporary ID until Monime session created
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating pending payment:', error)
    throw new Error(error.message)
  }

  return { payment_id: data.id, reused: false }
}

