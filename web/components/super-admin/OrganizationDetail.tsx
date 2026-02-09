'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Building2,
  Users,
  Wallet,
  FileText,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@/lib/currency'
import { getDisplayAmount } from '@/lib/utils/payment-display'
import { getOrganizationAbbreviation } from '@/lib/utils/organization'

interface Organization {
  id: string
  name: string
  organization_type: string
  admin_email: string
  status: string
  created_at: string
  logo_url?: string | null
}

interface Member {
  id: string
  full_name: string
  membership_id: string
  email: string
  phone_number: string | null
  status: string
  created_at: string
  user?: {
    id: string
    email: string
    full_name: string
    phone: string
    created_at: string
  }
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  reference_number: string
  payment_status: string
  member?: {
    full_name: string
    membership_id: string
  }
}

interface User {
  id: string
  email: string
  full_name: string
  phone: string
  role: string
  created_at: string
}

interface Log {
  id: string
  title: string
  message: string
  type: string
  created_at: string
  sender?: {
    full_name: string
    email: string
  }
  recipient?: {
    full_name: string
    email: string
  }
}

interface Props {
  organization: Organization
  members: Member[]
  payments: Payment[]
  users: User[]
  logs: Log[]
}

export default function OrganizationDetail({
  organization,
  members,
  payments,
  users,
  logs,
}: Props) {
  const [activeTab, setActiveTab] = useState<'members' | 'payments' | 'logs' | 'credentials'>('members')
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})

  const tabs = [
    { id: 'members', label: 'Members', icon: Users, count: members.length },
    { id: 'payments', label: 'Payments', icon: Wallet, count: payments.length },
    { id: 'logs', label: 'Activity Logs', icon: FileText, count: logs.length },
    { id: 'credentials', label: 'User Credentials', icon: Users, count: users.length },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/super-admin"
          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-blue-600" />
        </Link>
        <div className="flex items-center gap-4 flex-1">
          {organization.logo_url ? (
            <Image
              src={organization.logo_url}
              alt={organization.name}
              width={64}
              height={64}
              className="h-16 w-16 object-contain rounded-lg border border-blue-200"
            />
          ) : (
            <div className="h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">
                {getOrganizationAbbreviation(organization.name)}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
            <p className="text-sm text-blue-600">{organization.organization_type}</p>
            <p className="text-xs text-gray-500 mt-1">
              Created: {format(new Date(organization.created_at), 'MMM dd, yyyy')}
            </p>
          </div>
          <span className={`px-3 py-1 text-sm font-semibold rounded-md ${organization.status === 'approved'
              ? 'bg-green-100 text-green-800'
              : organization.status === 'pending'
                ? 'bg-orange-100 text-orange-800'
                : 'bg-red-100 text-red-800'
            }`}>
            {organization.status}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Members</p>
              <p className="text-2xl font-semibold text-gray-900">{members.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
          <div className="flex items-center">
            <Wallet className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Payments</p>
              <p className="text-2xl font-semibold text-gray-900">{payments.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Activity Logs</p>
              <p className="text-2xl font-semibold text-gray-900">{logs.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-blue-200">
        <div className="border-b border-blue-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                    ${isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {members.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No members found</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Members will appear here once they register with this organization.
                    {users.filter(u => u.role === 'member').length > 0 && (
                      <span className="block mt-2 text-orange-600">
                        Note: There are {users.filter(u => u.role === 'member').length} user(s) with member role but no member records found.
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-blue-200">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Membership ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-blue-200">
                      {members.map((member) => (
                        <tr key={member.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {member.full_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {member.membership_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {member.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {member.phone_number || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-md ${member.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-orange-100 text-orange-800'
                              }`}>
                              {member.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(member.created_at), 'MMM dd, yyyy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              {payments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No payments found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-blue-200">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reference</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Member</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-blue-200">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(getDisplayAmount(payment.amount, payment.payment_status))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.reference_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.member?.full_name} ({payment.member?.membership_id})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-md ${payment.payment_status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : payment.payment_status === 'pending'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                              {payment.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No activity logs found</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{log.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{log.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {log.sender && (
                              <span>From: {log.sender.full_name} ({log.sender.email})</span>
                            )}
                            {log.recipient && (
                              <span>To: {log.recipient.full_name} ({log.recipient.email})</span>
                            )}
                            <span>{format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-md ${log.type === 'alert'
                            ? 'bg-red-100 text-red-800'
                            : log.type === 'payment'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                          {log.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Credentials Tab */}
          {activeTab === 'credentials' && (
            <div className="space-y-4">
              {users.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No users found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-blue-200">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Created</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-blue-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.full_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.phone || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-semibold rounded-md bg-blue-100 text-blue-800">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(user.created_at), 'MMM dd, yyyy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
