'use client'

import { format } from 'date-fns'
import { Download, FileText, ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { createClient } from '@/lib/supabase/client'
import { getMemberDisplayAmount } from '@/lib/utils/payment-display'

interface Receipt {
  id: string
  receipt_number: string
  pdf_url: string | null
  pdf_storage_path?: string | null
  created_at: string
  payment: {
    id: string
    amount: number
    payment_date: string
    payment_method: string
    description: string
    reference_number: string
  }
}

interface Props {
  receipts: Receipt[]
}

export default function ReceiptsList({ receipts }: Props) {
  const handleDownload = async (pdfUrl: string | null | undefined, receiptNumber: string | null | undefined, storagePath?: string | null) => {
    try {
      // Early validation
      if (!receiptNumber) {
        console.error('Receipt download failed - missing receipt number')
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
        alert('Receipt URL is not available. The receipt may not have been generated yet. Please contact support.')
        console.error('Receipt download failed - missing both path and URL:', { pdfUrl, storagePath, receiptNumber })
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
        
        if (downloadError) {
          console.error('Direct download error:', downloadError)
          // Check if it's a permission/bucket issue
          if (downloadError.message?.includes('bucket') || downloadError.message?.includes('not found')) {
            console.error('Storage bucket "receipts" may not exist or you may not have permission. Please check storage setup.')
          }
        }
        
        if (downloadData && downloadData.size === 0) {
          console.warn('Downloaded blob is empty, trying alternative methods')
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
            } else {
              console.warn('Blob from signed URL is empty')
            }
          } else {
            console.error('Failed to fetch signed URL:', response.status, response.statusText)
          }
        } else {
          console.error('Signed URL creation failed:', signedUrlError?.message || 'Unknown error')
          if (signedUrlError?.message?.includes('bucket') || signedUrlError?.message?.includes('not found')) {
            console.error('Storage bucket "receipts" may not exist. Please run the storage setup migration.')
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
            } else {
              console.log('Blob from public URL is empty')
            }
          } else {
            console.log('Failed to fetch public URL:', response.status, response.statusText)
          }
        } catch (fetchError) {
          console.error('Error fetching public URL:', fetchError)
        }
      }
      
      // Fallback: open in new tab (only if URL is valid)
      if (publicUrl && publicUrl.startsWith('http')) {
        window.open(publicUrl, '_blank')
      } else {
        const errorMsg = `Unable to download receipt. 
        
Possible issues:
1. Storage bucket "receipts" may not exist - Please run the storage setup migration
2. Missing permissions - Check RLS policies for the receipts bucket
3. Invalid receipt path: ${path || 'N/A'}

Please contact support with this information.`
        alert(errorMsg)
        console.error('Receipt download failed. PDF URL:', pdfUrl, 'Storage path:', path)
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
        <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
        <p className="text-sm text-gray-500 mt-1">View and download your payment receipts</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-blue-200">
        {receipts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No receipts yet</p>
            <p className="text-sm text-gray-400 mt-1">Receipts will appear here after payments are completed</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-blue-200">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Receipt Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Payment Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-blue-200">
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-blue-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {receipt.receipt_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(receipt.payment.payment_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(getMemberDisplayAmount(receipt.payment.amount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {receipt.payment.payment_method}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {receipt.payment.description || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {receipt.receipt_number && (receipt.pdf_url || receipt.pdf_storage_path) ? (
                        <button
                          onClick={() => {
                            if (receipt.receipt_number) {
                              handleDownload(
                                receipt.pdf_url || null,
                                receipt.receipt_number,
                                receipt.pdf_storage_path || null
                              )
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                      ) : (
                        <span 
                          className="flex items-center gap-2 px-3 py-1.5 text-gray-400 cursor-not-allowed"
                          title="Receipt URL is not available. The receipt may not have been generated yet. Please contact support."
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </span>
                      )}
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
