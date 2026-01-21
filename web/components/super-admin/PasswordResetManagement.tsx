'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Mail, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { approvePasswordResetRequest, declinePasswordResetRequest } from '@/app/actions/password-reset'

interface PasswordResetRequest {
  id: string
  user_name: string
  user_email: string
  user_phone: string
  status: 'pending' | 'approved' | 'declined'
  created_at: string
  updated_at?: string
}

interface Props {
  requests: PasswordResetRequest[]
}

export default function PasswordResetManagement({ requests: initialRequests }: Props) {
  const router = useRouter()
  const [requests, setRequests] = useState(initialRequests)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async (requestId: string, userEmail: string) => {
    setLoading(requestId)
    setError(null)

    try {
      const result = await approvePasswordResetRequest(requestId, userEmail)

      if (!result.success) {
        setError(result.error || 'Failed to approve request')
        return
      }

      if (result.warning) {
        // Show warning but still update UI
        setError(result.warning)
      }

      // Update local state
      setRequests(requests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'approved' as const, updated_at: new Date().toISOString() }
          : req
      ))

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to approve request')
      console.error('Error approving password reset:', err)
    } finally {
      setLoading(null)
    }
  }

  const handleDecline = async (requestId: string) => {
    setLoading(requestId)
    setError(null)

    try {
      const result = await declinePasswordResetRequest(requestId)

      if (!result.success) {
        setError(result.error || 'Failed to decline request')
        return
      }

      // Update local state
      setRequests(requests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'declined' as const, updated_at: new Date().toISOString() }
          : req
      ))

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to decline request')
      console.error('Error declining password reset:', err)
    } finally {
      setLoading(null)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const processedRequests = requests.filter(r => r.status !== 'pending')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Password Reset Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage user password reset requests</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Pending Requests */}
      <div className="bg-white rounded-lg shadow-sm border border-blue-200">
        <div className="p-6 border-b border-blue-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Pending Requests ({pendingRequests.length})
          </h2>
        </div>
        <div className="p-6">
          {pendingRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{request.user_name}</h3>
                        <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-md">
                          Pending
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {request.user_email}
                        </p>
                        <p>{request.user_phone}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Requested: {format(new Date(request.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(request.id, request.user_email)}
                        disabled={loading === request.id}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleDecline(request.id)}
                        disabled={loading === request.id}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="h-4 w-4" />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-blue-200">
          <div className="p-6 border-b border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900">Processed Requests ({processedRequests.length})</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {processedRequests.map((request) => (
                <div key={request.id} className="border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{request.user_name}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-md ${
                          request.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {request.user_email}
                        </p>
                        <p>{request.user_phone}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Requested: {format(new Date(request.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                        {request.updated_at && (
                          <p className="text-xs text-gray-500">
                            Processed: {format(new Date(request.updated_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
