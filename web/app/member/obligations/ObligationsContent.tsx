'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import MemberPaymentForm from '@/components/member/MemberPaymentForm'
import { useRouter } from 'next/navigation'

interface Obligation {
  id: string
  amount_due: number
  amount_paid: number
  status: string
  due_date: string
}

interface Props {
  initialObligations: Obligation[]
  memberId: string
}

export default function ObligationsContent({ initialObligations, memberId }: Props) {
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState<any>(null)

  if (initialObligations.length === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-xl font-black text-gray-900 tracking-tight">All Caught Up!</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
          You have no outstanding payment obligations at this time. Great job!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {initialObligations.map((obs) => (
          <div 
            key={obs.id} 
            className="group bg-white rounded-2xl shadow-sm border border-orange-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-orange-300 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet className="h-12 w-12 text-orange-600" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-md">Pending</span>
                <p className="font-black text-gray-900 text-lg uppercase tracking-tight">
                  {format(new Date(obs.due_date), 'MMMM yyyy')} Period
                </p>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount Due:</span>
                  <span className="text-xs font-bold text-gray-700">{formatCurrency(obs.amount_due)}</span>
                </div>
                {obs.amount_paid > 0 && (
                  <>
                    <div className="h-1 w-1 rounded-full bg-gray-300" />
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Paid:</span>
                      <span className="text-xs font-bold text-green-600">{formatCurrency(obs.amount_paid)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-6 relative z-10 border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-50">
              <div className="text-left sm:text-right">
                <p className="text-[10px] uppercase text-gray-400 font-black mb-0.5 tracking-wider">Remaining</p>
                <p className="font-black text-orange-600 text-2xl leading-none">
                  {formatCurrency(obs.amount_due - obs.amount_paid)}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedTab({
                    id: obs.id,
                    tab_name: `${format(new Date(obs.due_date), 'MMMM yyyy')} Balance`,
                    tab_type: 'obligation',
                    description: 'Outstanding Balance',
                    monthly_cost: obs.amount_due - obs.amount_paid,
                    is_active: true
                  })
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all shadow-md active:scale-95"
              >
                Pay Remaining
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedTab && (
        <MemberPaymentForm
          memberId={memberId}
          tabName={selectedTab.tab_name}
          tabType={selectedTab.tab_type}
          monthlyCost={selectedTab.monthly_cost}
          onSuccess={() => {
            setSelectedTab(null)
            router.refresh()
          }}
          onCancel={() => setSelectedTab(null)}
        />
      )}
    </div>
  )
}
