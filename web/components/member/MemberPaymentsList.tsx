'use client'

import { useState, useEffect } from 'react'
import { Wallet, CreditCard, Heart } from 'lucide-react'
import MemberPaymentForm from './MemberPaymentForm'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  full_name: string
  membership_id: string
}

interface MemberTab {
  id: string
  tab_name: string
  tab_type: string
  monthly_cost?: number
  description?: string
}

interface Props {
  member: Member | null
  tabs: MemberTab[]
}

export default function MemberPaymentsList({ member, tabs: initialTabs }: Props) {
  const router = useRouter()
  const [selectedTab, setSelectedTab] = useState<MemberTab | null>(null)
  const [tabs, setTabs] = useState(initialTabs)

  // Set up real-time subscriptions for member tabs
  useEffect(() => {
    if (typeof window === 'undefined' || !member?.id) return

    const supabase = createClient()

    // Subscribe to member tab changes for this member
    const tabsChannel = supabase
      .channel(`member-tabs-${member.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'member_tabs',
          filter: `member_id=eq.${member.id}`,
        },
        (payload) => {
          console.log('Member tab change detected:', payload)
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tabsChannel)
    }
  }, [member?.id, router])

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Member information not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Make Payment</h1>
        <p className="text-sm text-gray-500 mt-1">Select a payment option to proceed</p>
      </div>

      {selectedTab ? (
        <div className="bg-white rounded-lg shadow-sm border border-blue-200">
          <div className="p-6 border-b border-blue-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selectedTab.tab_name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedTab.tab_type === 'payment' ? 'Payment' : 'Donation'}
              </p>
            </div>
            <button
              onClick={() => setSelectedTab(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Back to Options
            </button>
          </div>
          <div className="p-6">
            <MemberPaymentForm
              memberId={member.id}
              tabName={selectedTab.tab_name}
              tabType={selectedTab.tab_type}
              monthlyCost={selectedTab.monthly_cost}
              onSuccess={() => {
                setSelectedTab(null)
                window.location.reload()
              }}
              onCancel={() => setSelectedTab(null)}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-blue-200">
          <div className="p-6 border-b border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900">Available Payment Options</h2>
            <p className="text-sm text-gray-500 mt-1">Select an option to make a payment or donation</p>
          </div>
          <div className="p-6">
            {tabs.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No payment options available</p>
                <p className="text-sm text-gray-400 mt-1">Contact your administrator to set up payment options</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tabs.map((tab) => (
                  <div
                    key={tab.id}
                    className="border border-blue-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedTab(tab)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {tab.tab_type === 'payment' ? (
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Heart className="h-5 w-5 text-purple-600" />
                        )}
                        <h3 className="font-semibold text-gray-900">{tab.tab_name}</h3>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded font-medium ${
                        tab.tab_type === 'payment' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {tab.tab_type === 'payment' ? 'Payment' : 'Donation'}
                      </span>
                    </div>
                    {tab.description && (
                      <p className="text-sm text-gray-600 mb-4">{tab.description}</p>
                    )}
                    {tab.monthly_cost && tab.tab_type === 'payment' && (
                      <p className="text-sm font-medium text-gray-700 mb-4">
                        Monthly: {tab.monthly_cost.toLocaleString()} SLE
                      </p>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTab(tab)
                      }}
                      className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
                        tab.tab_type === 'payment'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {tab.tab_type === 'payment' ? 'Pay Now' : 'Donate Here'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
