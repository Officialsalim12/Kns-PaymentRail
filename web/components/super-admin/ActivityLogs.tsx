'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { 
  Search, 
  Filter, 
  Download, 
  User, 
  Building2, 
  Calendar,
  Activity,
  X,
  RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ActivityLog {
  id: string
  user_id: string
  user_email?: string
  user_name?: string
  user_role?: string
  organization_id?: string | null
  action: string
  entity_type?: string | null
  entity_id?: string | null
  description: string
  metadata?: string | null
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
  user?: {
    id: string
    email: string
    full_name: string
    role: string
    organization_id?: string | null
  } | null
  organization?: {
    id: string
    name: string
  } | null
}

interface User {
  id: string
  email: string
  full_name: string
  role: string
}

interface Organization {
  id: string
  name: string
}

interface Props {
  initialLogs: ActivityLog[]
  users: User[]
  organizations: Organization[]
}

export default function ActivityLogs({ initialLogs, users, organizations }: Props) {
  const router = useRouter()
  const [logs, setLogs] = useState(initialLogs)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [loading, setLoading] = useState(false)

  // Get unique actions for filter
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(log => log.action))
    return Array.from(actions).sort()
  }, [logs])

  // Filter logs
  const filteredLogs = useMemo(() => {
    let filtered = [...logs]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(log =>
        log.description?.toLowerCase().includes(query) ||
        log.user_name?.toLowerCase().includes(query) ||
        log.user_email?.toLowerCase().includes(query) ||
        log.action?.toLowerCase().includes(query) ||
        log.organization?.name?.toLowerCase().includes(query)
      )
    }

    // User filter
    if (selectedUser !== 'all') {
      filtered = filtered.filter(log => log.user_id === selectedUser)
    }

    // Organization filter
    if (selectedOrganization !== 'all') {
      filtered = filtered.filter(log => log.organization_id === selectedOrganization)
    }

    // Action filter
    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.action === selectedAction)
    }

    // Date range filter
    if (selectedDateRange !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (selectedDateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0)
      }

      filtered = filtered.filter(log => new Date(log.created_at) >= startDate)
    }

    return filtered
  }, [logs, searchQuery, selectedUser, selectedOrganization, selectedAction, selectedDateRange])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      router.refresh()
      const supabase = createClient()
      const { data: newLogs } = await supabase
        .from('activity_logs')
        .select(`
          *,
          user:users!activity_logs_user_id_fkey(
            id,
            email,
            full_name,
            role,
            organization_id
          ),
          organization:organizations!activity_logs_organization_id_fkey(
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(1000)

      if (newLogs) {
        setLogs(newLogs as ActivityLog[])
      }
    } catch (error) {
      console.error('Error refreshing logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const headers = [
      'Timestamp',
      'User',
      'Email',
      'Role',
      'Organization',
      'Action',
      'Entity Type',
      'Description',
      'IP Address'
    ]

    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.user_name || log.user?.full_name || 'N/A',
      log.user_email || log.user?.email || 'N/A',
      log.user_role || log.user?.role || 'N/A',
      log.organization?.name || 'N/A',
      log.action,
      log.entity_type || 'N/A',
      log.description,
      log.ip_address || 'N/A'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `activity-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'bg-green-100 text-green-800'
    if (action.includes('updated')) return 'bg-blue-100 text-blue-800'
    if (action.includes('deleted')) return 'bg-red-100 text-red-800'
    if (action.includes('completed')) return 'bg-purple-100 text-purple-800'
    if (action.includes('login') || action.includes('logout')) return 'bg-gray-100 text-gray-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedUser('all')
    setSelectedOrganization('all')
    setSelectedAction('all')
    setSelectedDateRange('all')
  }

  const hasActiveFilters = searchQuery || selectedUser !== 'all' || selectedOrganization !== 'all' || selectedAction !== 'all' || selectedDateRange !== 'all'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and monitor all user actions across the system
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Download className="h-4 w-4 inline mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-primary-600 hover:text-primary-700"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by description, user, action..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Organization Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building2 className="h-4 w-4 inline mr-1" />
              Organization
            </label>
            <select
              value={selectedOrganization}
              onChange={(e) => setSelectedOrganization(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Organizations</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Activity className="h-4 w-4 inline mr-1" />
              Action
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>
                  {action.replace(/\./g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="h-4 w-4 inline mr-1" />
            Date Range
          </label>
          <div className="flex gap-2">
            {(['all', 'today', 'week', 'month'] as const).map(range => (
              <button
                key={range}
                onClick={() => setSelectedDateRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedDateRange === range
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Activity Logs ({filteredLogs.length})
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No activity logs found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {log.user_name || log.user?.full_name || 'Unknown'}
                        </div>
                        <div className="text-gray-500">
                          {log.user_email || log.user?.email || 'N/A'}
                        </div>
                        {log.user_role || log.user?.role ? (
                          <div className="text-xs text-gray-400">
                            {log.user_role || log.user?.role}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.organization?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action.replace(/\./g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
