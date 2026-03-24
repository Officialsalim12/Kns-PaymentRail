import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { Wallet, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import ObligationsContent from './ObligationsContent'

export default async function MemberObligationsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Get member record
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest text-[10px]">Member Profile Not Found</div>
  }

  // Fetch all unpaid/overdue obligations
  const { data: obligations, error: obligationsError } = await supabase
    .from('payment_obligations')
    .select('*')
    .eq('member_id', member.id)
    .in('status', ['pending', 'partial', 'overdue'])
    .order('due_date', { ascending: true })

  if (obligationsError) {
    console.error('Error fetching member obligations:', obligationsError)
  }

  // Fetch member tabs for the payment form integration
  const { data: tabs } = await supabase
    .from('member_tabs')
    .select('*')
    .eq('member_id', member.id)
    .eq('is_active', true)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Outstanding Balances</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2 px-1">Manage your active payment obligations</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-2xl px-6 py-4 flex items-center gap-4">
          <div className="p-2 bg-orange-600 rounded-lg">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Total Remaining</p>
            <p className="text-2xl font-black text-gray-900 leading-none mt-0.5">
              {formatCurrency((obligations || []).reduce((sum, obs) => sum + (obs.amount_due - obs.amount_paid), 0))}
            </p>
          </div>
        </div>
      </div>

      <ObligationsContent 
        initialObligations={obligations || []} 
        memberId={member.id}
      />
    </div>
  )
}
