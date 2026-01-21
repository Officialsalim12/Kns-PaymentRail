'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { MessageSquare, Send, Users, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  full_name: string
  membership_id: string
  email: string
  user_id: string
}

interface Message {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  recipient?: {
    full_name: string
    email: string
  }
}

interface Props {
  members: Member[]
  messages: Message[]
}

export default function MessagesManagement({ members: initialMembers, messages: initialMessages }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [messages, setMessages] = useState(initialMessages)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    recipient_type: 'all', // 'all' or 'individual'
    recipient_id: '',
    title: '',
    message: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

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

      let sentCount = 0
      
      if (formData.recipient_type === 'all') {
        // Send to all active members
        const activeMembers = initialMembers.filter(m => m.user_id)
        
        if (activeMembers.length === 0) {
          throw new Error('No active members found with user accounts')
        }

        // Create notifications for all members
        const notifications = activeMembers.map(member => ({
          organization_id: profile.organization_id,
          sender_id: user.id,
          recipient_id: member.user_id,
          member_id: member.id,
          title: formData.title,
          message: formData.message,
          type: 'info',
        }))

        const { data: insertedNotifications, error: insertError } = await supabase
          .from('notifications')
          .insert(notifications)
          .select()

        if (insertError) {
          throw new Error(`Failed to send messages: ${insertError.message}`)
        }

        sentCount = insertedNotifications?.length || activeMembers.length
        setSuccess(`Message sent successfully to ${sentCount} member(s)! They will see it in their notifications.`)
      } else {
        // Send to individual member
        if (!formData.recipient_id) {
          throw new Error('Please select a member')
        }

        const selectedMember = initialMembers.find(m => m.id === formData.recipient_id)
        if (!selectedMember || !selectedMember.user_id) {
          throw new Error('Selected member not found or has no user account')
        }

        const { data: insertedNotification, error: insertError } = await supabase
          .from('notifications')
          .insert({
            organization_id: profile.organization_id,
            sender_id: user.id,
            recipient_id: selectedMember.user_id,
            member_id: selectedMember.id,
            title: formData.title,
            message: formData.message,
            type: 'info',
          })
          .select()
          .single()

        if (insertError) {
          throw new Error(`Failed to send message: ${insertError.message}`)
        }

        sentCount = 1
        setSuccess(`Message sent successfully to ${selectedMember.full_name}! They will see it in their notifications.`)
      }

      // Refresh messages list
      const { data: updatedMessages } = await supabase
        .from('notifications')
        .select('*, recipient:users(full_name, email)')
        .eq('organization_id', profile.organization_id)
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })

      if (updatedMessages) {
        setMessages(updatedMessages)
      }

      // Reset form
      setFormData({
        recipient_type: 'all',
        recipient_id: '',
        title: '',
        message: '',
      })
      setShowForm(false)
      setError(null)
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
      
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Send className="h-5 w-5" />
          Send Message
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Message</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="recipient_type" className="block text-sm font-medium text-gray-700 mb-2">
                Send To
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recipient_type"
                    value="all"
                    checked={formData.recipient_type === 'all'}
                    onChange={(e) => setFormData({ ...formData, recipient_type: e.target.value, recipient_id: '' })}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <Users className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">All Members</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recipient_type"
                    value="individual"
                    checked={formData.recipient_type === 'individual'}
                    onChange={(e) => setFormData({ ...formData, recipient_type: e.target.value })}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <User className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">Individual Member</span>
                </label>
              </div>
            </div>

            {formData.recipient_type === 'individual' && (
              <div>
                <label htmlFor="recipient_id" className="block text-sm font-medium text-gray-700">
                  Select Member *
                </label>
                <select
                  id="recipient_id"
                  required={formData.recipient_type === 'individual'}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={formData.recipient_id}
                  onChange={(e) => setFormData({ ...formData, recipient_id: e.target.value })}
                >
                  <option value="">Select a member</option>
                  {initialMembers
                    .filter(m => m.user_id)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name} ({member.membership_id}) - {member.email}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Subject *
              </label>
              <input
                id="title"
                type="text"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter message subject"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                Message *
              </label>
              <textarea
                id="message"
                rows={6}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter your message"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                {loading ? 'Sending...' : 'Send Message'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setFormData({
                    recipient_type: 'all',
                    recipient_id: '',
                    title: '',
                    message: '',
                  })
                  setError(null)
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Sent Messages</h2>
        </div>
        <div className="p-6">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No messages sent yet</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`border rounded-lg p-4 ${
                    !msg.is_read 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'border-gray-200 hover:bg-gray-50'
                  } transition-colors`}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      !msg.is_read ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{msg.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{msg.message}</p>
                          {msg.recipient && (
                            <p className="text-xs text-gray-500 mt-2">
                              To: {msg.recipient.full_name} ({msg.recipient.email})
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">Sent:</span> {format(new Date(msg.created_at), 'MMM dd, yyyy')}
                            </p>
                            <span className="text-gray-300">•</span>
                            <p className="text-xs text-gray-500">
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                        {!msg.is_read && (
                          <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ml-2">
                            Unread
                          </span>
                        )}
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

