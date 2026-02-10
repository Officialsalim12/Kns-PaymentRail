'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Bell, CheckCircle, DollarSign, UserPlus, CheckCircle2, XCircle, MessageSquare, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  recipient_id: string
  sender_id: string | null
  sender?: {
    full_name: string
    email: string
  }
  member?: {
    full_name: string
    membership_id: string
  }
}

interface Props {
  notifications: Notification[]
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'payment':
      return <DollarSign className="h-5 w-5" />
    case 'approval':
    case 'member_request':
      return <UserPlus className="h-5 w-5" />
    case 'receipt':
      return <CheckCircle2 className="h-5 w-5" />
    case 'info':
    case 'message':
      return <MessageSquare className="h-5 w-5" />
    default:
      return <Bell className="h-5 w-5" />
  }
}

const getNotificationColor = (type: string, isRead: boolean) => {
  if (isRead) return 'text-gray-400'

  switch (type) {
    case 'payment':
      return 'text-green-600'
    case 'approval':
    case 'member_request':
      return 'text-orange-600'
    case 'receipt':
      return 'text-blue-600'
    default:
      return 'text-blue-600'
  }
}

export default function NotificationsManagement({ notifications: initialNotifications }: Props) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  useEffect(() => {
    setNotifications(initialNotifications)
  }, [initialNotifications])

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Set up real-time subscriptions for notifications
  useEffect(() => {
    if (typeof window === 'undefined') return

    let notificationsChannel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null
    const supabase = createClient()

    const setupSubscriptions = async () => {
      // Get current user and organization ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) return

      setOrganizationId(profile.organization_id)

      // Subscribe to notification changes for this organization
      notificationsChannel = supabase
        .channel(`notifications-management-${profile.organization_id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `organization_id=eq.${profile.organization_id}`,
          },
          (payload) => {
            console.log('Notification change detected:', payload)
            router.refresh()
          }
        )
        .subscribe()
    }

    setupSubscriptions()

    return () => {
      if (notificationsChannel) {
        supabase.removeChannel(notificationsChannel)
      }
    }
  }, [router])

  const markAsRead = async (notificationId: string) => {
    setMarkingAsRead(notificationId)
    try {
      const supabase = createClient()
      const notification = notifications.find(n => n.id === notificationId)
      const newReadStatus = !notification?.is_read

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: newReadStatus,
          read_at: newReadStatus ? new Date().toISOString() : null
        })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: newReadStatus } : n)
      )
      router.refresh()
    } catch (error: any) {
      alert(`Error updating notification: ${error.message}`)
    } finally {
      setMarkingAsRead(null)
    }
  }

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('id', unreadIds)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      )
      router.refresh()
    } catch (error: any) {
      alert(`Error marking notifications as read: ${error.message}`)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) {
      return
    }

    setDeletingId(notificationId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      router.refresh()
    } catch (error: any) {
      alert(`Error deleting notification: ${error.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const deleteAllNotifications = async () => {
    if (notifications.length === 0) return

    if (!confirm(`Are you sure you want to delete all ${notifications.length} notification(s)? This action cannot be undone.`)) {
      return
    }

    setDeletingAll(true)
    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Get user profile to get organization_id
      const { data: profile } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) {
        throw new Error('Organization not found')
      }

      // Delete all notifications for this admin (both sent and received)
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('organization_id', profile.organization_id)
        .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)

      if (error) throw error

      setNotifications([])
      router.refresh()
    } catch (error: any) {
      alert(`Error deleting notifications: ${error.message}`)
    } finally {
      setDeletingAll(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">All your payment, approval, and system notifications</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {unreadCount > 0 && (
            <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
              {unreadCount} unread
            </span>
          )}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap"
            >
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={deleteAllNotifications}
              disabled={deletingAll}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4" />
              {deletingAll ? 'Deleting...' : 'Delete All'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-blue-200">
        <div className="p-6 border-b border-blue-200">
          <h2 className="text-lg font-semibold text-gray-900">All Notifications</h2>
        </div>
        <div className="p-6">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 ${!notification.is_read
                    ? 'bg-blue-50 border-blue-200'
                    : 'border-blue-200 hover:bg-blue-50'
                    } transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex-shrink-0 ${getNotificationColor(notification.type, notification.is_read)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                        <div className="flex-1 w-full">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900 break-words">{notification.title}</p>
                            {notification.type && (
                              <span className={`px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap ${notification.type === 'payment' ? 'bg-green-100 text-green-700' :
                                notification.type === 'approval' || notification.type === 'member_request' ? 'bg-orange-100 text-orange-700' :
                                  notification.type === 'receipt' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                {notification.type}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 break-words">{notification.message}</p>
                          {notification.member && (
                            <p className="text-xs text-gray-500 mt-2 break-words">
                              Member: {notification.member.full_name} ({notification.member.membership_id})
                            </p>
                          )}
                          {notification.sender && notification.sender_id && (
                            <p className="text-xs text-gray-500 mt-1 break-words">
                              From: {notification.sender.full_name}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0 md:ml-4 flex-shrink-0">
                          {!notification.is_read && (
                            <>
                              <span className="flex items-center gap-1 text-xs text-orange-600 whitespace-nowrap">
                                <XCircle className="h-4 w-4" />
                                Unread
                              </span>
                              <button
                                onClick={() => markAsRead(notification.id)}
                                disabled={markingAsRead === notification.id}
                                className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                {markingAsRead === notification.id ? 'Marking...' : 'Mark Read'}
                              </button>
                            </>
                          )}
                          {notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              disabled={markingAsRead === notification.id}
                              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 whitespace-nowrap"
                              title="Mark as unread"
                            >
                              {markingAsRead === notification.id ? 'Updating...' : 'Mark Unread'}
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            disabled={deletingId === notification.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

