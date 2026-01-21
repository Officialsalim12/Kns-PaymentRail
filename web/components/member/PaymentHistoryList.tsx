'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { CheckCircle, Clock, XCircle, Download, ExternalLink, FileText, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { invokeEdgeFunction } from '@/lib/supabase/functions'
import { useRouter } from 'next/navigation'
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'
import { getMemberDisplayAmount } from '@/lib/utils/payment-display'

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_status: string
  payment_method: string
  description: string
  reference_number: string
  organization_id?: string
  member_id?: string
  receipt?: {
    receipt_number?: string | null
    pdf_url?: string | null
    pdf_storage_path?: string | null
  } | null
}

interface Props {
  payments: Payment[]
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-600" />
    case 'pending':
      return <Clock className="h-5 w-5 text-orange-600" />
    case 'failed':
    case 'cancelled':
      return <XCircle className="h-5 w-5 text-red-600" />
    default:
      return <Clock className="h-5 w-5 text-gray-400" />
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'pending':
      return 'bg-orange-100 text-orange-700'
    case 'failed':
    case 'cancelled':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function PaymentHistoryList({ payments: initialPayments }: Props) {
  const router = useRouter()
  const [generatingReceiptId, setGeneratingReceiptId] = useState<string | null>(null)
  const [payments, setPayments] = useState<Payment[]>(initialPayments)

  // Sync payments when initialPayments prop changes
  useEffect(() => {
    setPayments(initialPayments)
  }, [initialPayments])

  const handleGenerateReceipt = async (payment: Payment) => {
    if (!payment.organization_id || !payment.member_id) {
      alert('Missing payment information. Please refresh the page and try again.')
      return
    }

    if (payment.payment_status !== 'completed') {
      alert('Receipts can only be generated for completed payments.')
      return
    }

    setGeneratingReceiptId(payment.id)
    try {
      const supabase = createClient()
      
      // Try using invokeEdgeFunction first
      let result = await invokeEdgeFunction(supabase, 'generate-receipt', {
        body: {
          paymentId: payment.id,
          organizationId: payment.organization_id,
          memberId: payment.member_id,
        },
      })

      // If we get a network error, try direct fetch as fallback
      if (result.error && result.error.message && result.error.message.includes('Unable to connect')) {
        console.log('invokeEdgeFunction failed, trying direct fetch...')
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.access_token && supabaseUrl) {
          try {
            const functionUrl = `${supabaseUrl}/functions/v1/generate-receipt`
            const fetchResponse = await fetchWithTimeout(functionUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              },
              body: JSON.stringify({
                paymentId: payment.id,
                organizationId: payment.organization_id,
                memberId: payment.member_id,
              }),
              timeout: 15000, // 15 seconds timeout
            })

            if (fetchResponse.ok) {
              const fetchData = await fetchResponse.json()
              result = { data: fetchData, error: null }
            } else {
              const errorText = await fetchResponse.text()
              let errorData
              try {
                errorData = JSON.parse(errorText)
              } catch {
                errorData = { error: errorText }
              }
              result = { 
                data: null, 
                error: { 
                  message: errorData.error || errorData.message || `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}` 
                } 
              }
            }
          } catch (fetchError: any) {
            result = { 
              data: null, 
              error: { 
                message: `Network error: ${fetchError.message || 'Failed to connect to edge function. Please ensure the function is deployed.'}` 
              } 
            }
          }
        }
      }

      if (result.error) {
        console.error('Error generating receipt:', result.error)
        const errorMsg = result.error.message || 'Unknown error'
        
        // Provide helpful error message
        if (errorMsg.includes('Unable to connect') || errorMsg.includes('Network error') || errorMsg.includes('not found')) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const deploymentMsg = supabaseUrl 
            ? `\n\nTo deploy the function, run:\nsupabase functions deploy generate-receipt\n\nOr deploy via Supabase Dashboard:\n1. Go to Edge Functions → Deploy\n2. Select the generate-receipt function\n3. Click Deploy`
            : '\n\nPlease ensure your Supabase URL is configured correctly.'
          
          alert(`Failed to connect to receipt generation service.${deploymentMsg}\n\nIf the function is already deployed, please check:\n1. Your internet connection\n2. The Supabase project is active\n3. Contact support if the issue persists`)
        } else {
          alert(`Failed to generate receipt: ${errorMsg}`)
        }
        return
      }

      // Helper function to normalize receipt data (handle array case from Supabase)
      const normalizeReceipt = (receipt: any): any => {
        if (Array.isArray(receipt)) {
          return receipt.length > 0 ? receipt[0] : null
        }
        return receipt
      }

      // Helper function to fetch and update receipt
      const fetchAndUpdateReceipt = async (retryCount = 0): Promise<boolean> => {
        const supabase = createClient()
        const { data: updatedPayment, error: fetchError } = await supabase
          .from('payments')
          .select('*, receipt:receipts(receipt_number, pdf_url, pdf_storage_path)')
          .eq('id', payment.id)
          .single()

        if (!fetchError && updatedPayment) {
          const normalizedReceipt = normalizeReceipt(updatedPayment.receipt)
          
          // Check if receipt has required data
          if (normalizedReceipt && normalizedReceipt.receipt_number) {
            // Update the payment in the local state
            setPayments(prevPayments => 
              prevPayments.map(p => 
                p.id === payment.id 
                  ? { ...p, receipt: normalizedReceipt }
                  : p
              )
            )
            return true
          } else if (retryCount < 3) {
            // Retry after a short delay if receipt isn't ready yet
            await new Promise(resolve => setTimeout(resolve, 1000))
            return fetchAndUpdateReceipt(retryCount + 1)
          }
        }
        return false
      }

      if (result.data?.success || result.data?.receipt) {
        // Try to fetch the receipt immediately
        const success = await fetchAndUpdateReceipt()
        if (success) {
          alert('Receipt generated successfully! You can now download it using the button below.')
        } else {
          // Fallback: refresh the page if we can't fetch the updated payment
          alert('Receipt generated successfully! Refreshing page...')
          router.refresh()
        }
      } else if (result.data?.error) {
        alert(`Failed to generate receipt: ${result.data.error}`)
      } else {
        // If we got data but no success flag, try to fetch the receipt anyway
        const success = await fetchAndUpdateReceipt()
        if (success) {
          alert('Receipt generated successfully! You can now download it using the button below.')
        } else {
          alert('Receipt generation completed. Refreshing page...')
          router.refresh()
        }
      }
    } catch (error: any) {
      console.error('Error generating receipt:', error)
      alert(`Failed to generate receipt: ${error.message || 'Unknown error'}`)
    } finally {
      setGeneratingReceiptId(null)
    }
  }

  const handleDownloadReceipt = async (pdfUrl: string | null | undefined, receiptNumber: string | null | undefined, storagePath?: string | null) => {
    try {
      // Early validation - check for valid receipt number
      if (!receiptNumber || typeof receiptNumber !== 'string' || receiptNumber.trim().length === 0) {
        console.error('Receipt download failed - invalid receipt number:', { receiptNumber, pdfUrl, storagePath })
        alert('Receipt number is not available. Please contact support.')
        return
      }

      const supabase = createClient()
      
      // Step 1: Get storage path - prioritize storagePath, then extract from pdfUrl
      let path = storagePath || null
      if (!path && pdfUrl) {
        const match = pdfUrl.match(/\/receipts\/(.+)$/)
        if (match) {
          path = match[1]
        }
      }
      
      // Step 2: Generate public URL - prioritize pdfUrl, then generate from path
      let publicUrl = pdfUrl || null
      if (!publicUrl && path) {
        const { data: { publicUrl: generatedUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
        publicUrl = generatedUrl || null
      }
      
      // Step 3: If we have no path and no URL, we can't proceed
      if (!path && !publicUrl) {
        console.error('Receipt download failed - missing both path and URL:', {
          pdfUrl: pdfUrl || 'null',
          storagePath: storagePath || 'null',
          receiptNumber: receiptNumber || 'null',
        })
        alert('Receipt URL is not available. The receipt may not have been generated yet. Please try generating the receipt first using the "Generate Receipt" button.')
        return
      }
      
      // Helper function to trigger download
      const triggerDownload = (blob: Blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${receiptNumber}.pdf`
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        // Delay revoking URL to ensure download starts
        setTimeout(() => {
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }, 100)
      }
      
      if (path) {
        // Method 1: Try direct download from Supabase storage
        const { data: downloadData, error: downloadError } = await supabase
          .storage
          .from('receipts')
          .download(path)
        
        if (downloadData && !downloadError && downloadData.size > 0) {
          triggerDownload(downloadData)
          return
        }
        
        // Method 2: Use signed URL for download
        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from('receipts')
          .createSignedUrl(path, 60)
        
        if (signedUrlData?.signedUrl && !signedUrlError) {
          const response = await fetch(signedUrlData.signedUrl)
          if (response.ok) {
            const blob = await response.blob()
            if (blob.size > 0) {
              triggerDownload(blob)
              return
            }
          }
        }
      }
      
      // Method 3: Try public URL (already generated above if needed)
      if (publicUrl && publicUrl.startsWith('http')) {
        try {
          const response = await fetch(publicUrl)
          if (response.ok) {
            const blob = await response.blob()
            if (blob.size > 0) {
              triggerDownload(blob)
              return
            }
          }
        } catch (fetchError) {
          console.error('Error fetching public URL:', fetchError)
        }
      }
      
      // Fallback: open in new tab (only if URL is valid)
      if (publicUrl && publicUrl.startsWith('http')) {
        window.open(publicUrl, '_blank')
      } else {
        alert('Unable to download receipt. The receipt URL is invalid. Please contact support.')
        console.error('Invalid PDF URL:', pdfUrl, 'Storage path:', path)
      }
    } catch (error) {
      console.error('Error downloading receipt:', error)
      // Fallback: try to generate public URL from storage path if pdfUrl is missing
      let fallbackUrl = pdfUrl
      if (!fallbackUrl && storagePath) {
        const supabase = createClient()
        const { data: { publicUrl: generatedUrl } } = supabase.storage.from('receipts').getPublicUrl(storagePath)
        fallbackUrl = generatedUrl
      }
      
      // Fallback: open in new tab (only if URL is valid)
      if (fallbackUrl && fallbackUrl.startsWith('http')) {
        window.open(fallbackUrl, '_blank')
      } else {
        alert('An error occurred while downloading the receipt. Please contact support.')
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <p className="text-sm text-gray-500 mt-1">View all your payment transactions</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-blue-200">
        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No payment history</p>
            <p className="text-sm text-gray-400 mt-1">Your payment transactions will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-blue-200">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-blue-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-blue-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {payment.reference_number || payment.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(getMemberDisplayAmount(payment.amount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.payment_method}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {payment.description || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadge(payment.payment_status)}`}>
                        {getStatusIcon(payment.payment_status)}
                        {payment.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(() => {
                        // Normalize receipt data (handle array case from Supabase)
                        const normalizeReceipt = (receipt: any): any => {
                          if (Array.isArray(receipt)) {
                            return receipt.length > 0 ? receipt[0] : null
                          }
                          return receipt
                        }
                        
                        const normalizedReceipt = normalizeReceipt(payment.receipt)
                        
                        // Validation: receipt must exist, be an object, have a valid receipt_number, and payment must be completed
                        const hasValidReceipt = normalizedReceipt && 
                          typeof normalizedReceipt === 'object' && 
                          !Array.isArray(normalizedReceipt) &&
                          normalizedReceipt.receipt_number && 
                          typeof normalizedReceipt.receipt_number === 'string' &&
                          normalizedReceipt.receipt_number.trim().length > 0 &&
                          payment.payment_status === 'completed'
                        
                        const isCompleted = payment.payment_status === 'completed'
                        const isGenerating = generatingReceiptId === payment.id
                        
                        // If payment is completed but no receipt exists, show generate button
                        if (isCompleted && !hasValidReceipt) {
                          return (
                            <button
                              onClick={() => handleGenerateReceipt(payment)}
                              disabled={isGenerating}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Generate receipt for this payment"
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <FileText className="h-4 w-4" />
                                  Generate Receipt
                                </>
                              )}
                            </button>
                          )
                        }
                        
                        if (!hasValidReceipt) {
                          return <span className="text-gray-400">-</span>
                        }
                        
                        const hasReceiptUrl = normalizedReceipt.pdf_url || normalizedReceipt.pdf_storage_path
                        
                        if (hasReceiptUrl) {
                          return (
                            <button
                              onClick={() => {
                                const receiptNum = normalizedReceipt?.receipt_number
                                if (receiptNum && typeof receiptNum === 'string' && receiptNum.trim().length > 0) {
                                  handleDownloadReceipt(
                                    normalizedReceipt.pdf_url || null,
                                    receiptNum,
                                    normalizedReceipt.pdf_storage_path || null
                                  )
                                } else {
                                  console.error('Invalid receipt number:', receiptNum)
                                  alert('Receipt number is not available. Please contact support.')
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors font-medium"
                              title="Download receipt PDF"
                            >
                              <Download className="h-4 w-4" />
                              Download Receipt
                            </button>
                          )
                        } else {
                          return (
                            <span 
                              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 cursor-not-allowed"
                              title="Receipt URL is not available. The receipt may not have been generated yet. Please contact support."
                            >
                              <Download className="h-4 w-4" />
                              Receipt
                            </span>
                          )
                        }
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
