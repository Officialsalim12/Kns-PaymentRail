'use client'

import { format } from 'date-fns'
import { Download, FileText, Printer } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import { createClient } from '@/lib/supabase/client'
import { getMemberDisplayAmount } from '@/lib/utils/payment-display'
import { toast } from 'sonner'

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
  const resolveReceiptUrlForPrint = async (
    pdfUrl: string | null | undefined,
    storagePath?: string | null
  ) => {
    const supabase = createClient()

    let path = storagePath || null
    if (!path && pdfUrl) {
      const match = pdfUrl.match(/\/receipts\/(.+)$/)
      if (match) path = match[1]
    }

    if (pdfUrl && pdfUrl.startsWith('http')) return pdfUrl

    if (!path) return null

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('receipts')
      .createSignedUrl(path, 60)

    if (!signedUrlError && signedUrlData?.signedUrl) return signedUrlData.signedUrl

    const { data: { publicUrl: generatedUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
    return generatedUrl || null
  }

  const getReceiptBlobForPrint = async (
    pdfUrl: string | null | undefined,
    receiptNumber: string | null | undefined,
    storagePath?: string | null
  ): Promise<Blob | null> => {
    if (!receiptNumber) return null

    const supabase = createClient()

    let path = storagePath || null
    if (!path && pdfUrl) {
      const match = pdfUrl.match(/\/receipts\/(.+)$/)
      if (match) path = match[1]
    }

    let publicUrl = pdfUrl || null
    if (!publicUrl && path) {
      try {
        const { data: { publicUrl: generatedUrl } } = supabase.storage
          .from('receipts')
          .getPublicUrl(path)
        publicUrl = generatedUrl || null
      } catch {
      }
    }

    if (!path && !publicUrl) return null

    if (path) {
      try {
        const { data: downloadData, error: downloadError } = await supabase
          .storage
          .from('receipts')
          .download(path)

        if (downloadData && !downloadError && downloadData.size > 0) return downloadData
      } catch {
      }
    }

    if (path) {
      try {
        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from('receipts')
          .createSignedUrl(path, 60)

        if (signedUrlData?.signedUrl && !signedUrlError) {
          const response = await fetch(signedUrlData.signedUrl)
          if (response.ok) {
            const blob = await response.blob()
            if (blob.size > 0) return blob
          }
        }
      } catch {
      }
    }

    if (publicUrl && publicUrl.startsWith('http')) {
      try {
        const response = await fetch(publicUrl)
        if (response.ok) {
          const blob = await response.blob()
          if (blob.size > 0) return blob
        }
      } catch {
      }
    }

    return null
  }

  const handlePrint = async (
    pdfUrl: string | null | undefined,
    receiptNumber: string | null | undefined,
    storagePath?: string | null
  ) => {
    try {
      if (!receiptNumber) {
        toast.error('Receipt number is not available. Please contact support.')
        return
      }

      const blob = await getReceiptBlobForPrint(pdfUrl, receiptNumber, storagePath || null)
      if (!blob) {
        if (pdfUrl && pdfUrl.startsWith('http')) window.open(pdfUrl, '_blank')
        else toast.error('Receipt URL is not available. Please contact support.')
        return
      }

      const blobUrl = window.URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000)
    } catch (error) {
      console.error('Error printing receipt:', error)
      toast.error('Unable to open receipt for printing. Please contact support.')
    }
  }

  const handleDownload = async (pdfUrl: string | null | undefined, receiptNumber: string | null | undefined, storagePath?: string | null) => {
    try {
      // Early validation
      if (!receiptNumber) {
        console.error('Receipt download failed - missing receipt number')
        toast.error('Receipt number is not available. Please contact support.')
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
        toast.error('Receipt URL is not available. Please contact support.')
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
          // fallback to other methods below
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
          // final fallback below
        }
      }
      
      // Fallback: open in new tab (only if URL is valid)
      if (publicUrl && publicUrl.startsWith('http')) {
        window.open(publicUrl, '_blank')
      } else {
        toast.error('Unable to download receipt. Please contact support.')
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
        toast.error('An error occurred while downloading the receipt.')
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
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="bg-white border border-blue-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900">Receipt #{receipt.receipt_number}</h3>
                      <p className="text-sm text-gray-500 mt-1">{format(new Date(receipt.payment.payment_date), 'MMM dd, yyyy')}</p>
                    </div>
                    {receipt.receipt_number && (receipt.pdf_url || receipt.pdf_storage_path) ? (
                      <div className="flex-shrink-0 flex items-center gap-2">
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
                          className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors text-xs"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                        <button
                          onClick={() => handlePrint(receipt.pdf_url || null, receipt.receipt_number, receipt.pdf_storage_path || null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-md transition-colors text-xs"
                          title="Print receipt"
                        >
                          <Printer className="h-4 w-4" />
                          Print
                        </button>
                      </div>
                    ) : (
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <span
                          className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 cursor-not-allowed border border-gray-200 rounded-md text-xs"
                          title="Receipt URL is not available"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </span>
                        <span
                          className="flex items-center gap-1.5 px-3 py-1.5 text-gray-400 cursor-not-allowed border border-gray-200 rounded-md text-xs"
                          title="Receipt URL is not available"
                        >
                          <Printer className="h-4 w-4" />
                          Print
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Amount: </span>
                      <span className="font-semibold text-gray-900">{formatCurrency(getMemberDisplayAmount(receipt.payment.amount))}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Method: </span>
                      <span className="text-gray-900">{receipt.payment.payment_method}</span>
                    </div>
                    {receipt.payment.description && (
                      <div>
                        <span className="text-gray-500">Description: </span>
                        <span className="text-gray-900">{receipt.payment.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-blue-200">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Receipt Number</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Payment Date</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Payment Method</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-blue-200">
                  {receipts.map((receipt) => (
                    <tr key={receipt.id} className="hover:bg-blue-50">
                      <td className="px-4 lg:px-6 py-4 text-sm font-medium text-gray-900">
                        {receipt.receipt_number}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-500">
                        {format(new Date(receipt.payment.payment_date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(getMemberDisplayAmount(receipt.payment.amount))}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-500">
                        {receipt.payment.payment_method}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-500">
                        {receipt.payment.description || 'N/A'}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm">
                      {receipt.receipt_number && (receipt.pdf_url || receipt.pdf_storage_path) ? (
                        <div className="flex items-center gap-2">
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
                            className="flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors text-xs"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                          <button
                            onClick={() => handlePrint(receipt.pdf_url || null, receipt.receipt_number, receipt.pdf_storage_path || null)}
                            className="flex items-center gap-2 px-3 py-1.5 text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-md transition-colors text-xs"
                            title="Print receipt"
                          >
                            <Printer className="h-4 w-4" />
                            Print
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className="flex items-center gap-2 px-3 py-1.5 text-gray-400 cursor-not-allowed border border-gray-200 rounded-md text-xs"
                            title="Receipt URL is not available. The receipt may not have been generated yet. Please contact support."
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </span>
                          <span
                            className="flex items-center gap-2 px-3 py-1.5 text-gray-400 cursor-not-allowed border border-gray-200 rounded-md text-xs"
                            title="Receipt URL is not available. The receipt may not have been generated yet. Please contact support."
                          >
                            <Printer className="h-4 w-4" />
                            Print
                          </span>
                        </div>
                      )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
