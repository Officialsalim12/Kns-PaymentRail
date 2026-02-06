'use client'

import { useState, useEffect } from 'react'
import { Download, FileText, Calendar, TrendingUp, RefreshCw, Cloud, HardDrive } from 'lucide-react'
import { generateReport } from '@/app/actions/generate-report'
import { convertToCSV, type ReportData } from '@/lib/csv'
import { generateAndStoreReport, getStoredReports, type StoredReport } from '@/app/actions/store-report'
import { formatCurrency } from '@/lib/currency'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

export default function Reports() {
  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'all'>('all')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [reportStats, setReportStats] = useState<{
    totalPayments: number
    totalAmount: number
    averageAmount: number
  } | null>(null)
  const [storedReports, setStoredReports] = useState<StoredReport[]>([])
  const [loadingStored, setLoadingStored] = useState(true)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'generate' | 'stored'>('generate')

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Get organization ID and load stored reports
  useEffect(() => {
    const loadStoredReports = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (profile?.organization_id) {
          setOrganizationId(profile.organization_id)
          const reports = await getStoredReports(profile.organization_id)
          setStoredReports(reports)
        }
      } catch (err: any) {
        console.error('Error loading stored reports:', err)
      } finally {
        setLoadingStored(false)
      }
    }

    loadStoredReports()
  }, [])

  const handleDownload = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setReportStats(null)

    try {
      let month: number | undefined
      let year: number | undefined

      if (reportType === 'monthly') {
        month = selectedMonth
        year = selectedYear
      } else if (reportType === 'yearly') {
        year = selectedYear
      }

      const data = await generateReport(reportType, month, year)

      if (data.length === 0) {
        setError('No payments found for the selected period.')
        setLoading(false)
        return
      }

      // Calculate statistics
      const totalAmount = data.reduce((sum, p) => sum + p.amount, 0)
      const averageAmount = data.length > 0 ? totalAmount / data.length : 0
      setReportStats({
        totalPayments: data.length,
        totalAmount,
        averageAmount,
      })

      // Convert to CSV
      const csvContent = await convertToCSV(data)

      // Generate filename
      let filename = 'payments-report'
      if (reportType === 'monthly') {
        filename = `payments-${months[selectedMonth].toLowerCase()}-${selectedYear}`
      } else if (reportType === 'yearly') {
        filename = `payments-${selectedYear}`
      } else {
        filename = 'payments-all'
      }
      filename += `.csv`

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccess('Report downloaded successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateAndStore = async () => {
    if (!organizationId) {
      setError('Organization not found')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      let month: number | undefined
      let year: number | undefined

      if (reportType === 'monthly') {
        month = selectedMonth
        year = selectedYear
      } else if (reportType === 'yearly') {
        year = selectedYear
      }

      const storedReport = await generateAndStoreReport(organizationId, reportType, month, year)

      // Reload stored reports
      const reports = await getStoredReports(organizationId)
      setStoredReports(reports)

      setSuccess(`Report generated and stored successfully! ${storedReport.payment_count} payments included.`)
      setViewMode('stored')
    } catch (err: any) {
      setError(err.message || 'Failed to generate and store report')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateReport = async (report: StoredReport) => {
    if (!organizationId) return

    setRegenerating(report.path)
    setError(null)
    setSuccess(null)

    try {
      await generateAndStoreReport(
        organizationId,
        report.type,
        report.month,
        report.year
      )

      // Reload stored reports
      const reports = await getStoredReports(organizationId)
      setStoredReports(reports)

      setSuccess('Report regenerated successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate report')
    } finally {
      setRegenerating(null)
    }
  }

  const getReportDisplayName = (report: StoredReport) => {
    if (report.type === 'all') {
      return 'All Payments'
    } else if (report.type === 'yearly') {
      return `${report.year} Yearly Report`
    } else {
      return `${months[report.month || 0]} ${report.year}`
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payment Reports</h1>
        <p className="mt-2 text-sm text-gray-500 max-w-2xl">
          Comprehensive financial reporting at your fingertips. Generate, store, and manage transaction records with ease.
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setViewMode('generate')}
          className={`px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${viewMode === 'generate'
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <HardDrive className="h-3.5 w-3.5" />
          Generate New
        </button>
        <button
          onClick={() => setViewMode('stored')}
          className={`px-6 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 ${viewMode === 'stored'
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <Cloud className="h-3.5 w-3.5" />
          Stored ({storedReports.length})
        </button>
      </div>

      {viewMode === 'generate' ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">
            {/* Report Type Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                Report Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setReportType('all')}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center group ${reportType === 'all'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-100 bg-gray-50/50 hover:border-primary-200 text-gray-600'
                    }`}
                >
                  <div className={`p-3 rounded-xl mb-3 transition-transform group-hover:scale-110 ${reportType === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-400 lg:group-hover:text-primary-600'
                    }`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="font-bold text-sm">All Payments</div>
                  <div className="text-[10px] opacity-70 mt-1 uppercase tracking-tight">Full History</div>
                </button>

                <button
                  onClick={() => setReportType('yearly')}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center group ${reportType === 'yearly'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-100 bg-gray-50/50 hover:border-primary-200 text-gray-600'
                    }`}
                >
                  <div className={`p-3 rounded-xl mb-3 transition-transform group-hover:scale-110 ${reportType === 'yearly' ? 'bg-primary-600 text-white' : 'bg-white text-gray-400 lg:group-hover:text-primary-600'
                    }`}>
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="font-bold text-sm">Yearly</div>
                  <div className="text-[10px] opacity-70 mt-1 uppercase tracking-tight">Annual Summary</div>
                </button>

                <button
                  onClick={() => setReportType('monthly')}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center group ${reportType === 'monthly'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-100 bg-gray-50/50 hover:border-primary-200 text-gray-600'
                    }`}
                >
                  <div className={`p-3 rounded-xl mb-3 transition-transform group-hover:scale-110 ${reportType === 'monthly' ? 'bg-primary-600 text-white' : 'bg-white text-gray-400 lg:group-hover:text-primary-600'
                    }`}>
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="font-bold text-sm">Monthly</div>
                  <div className="text-[10px] opacity-70 mt-1 uppercase tracking-tight">Periodic View</div>
                </button>
              </div>
            </div>

            {/* Date Selection */}
            {(reportType === 'monthly' || reportType === 'yearly') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportType === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      {months.map((month, index) => (
                        <option key={index} value={index}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {success}
              </div>
            )}

            {/* Report Statistics */}
            {reportStats && (
              <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100">
                <h3 className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4 text-center">Report Summary</h3>
                <div className="grid grid-cols-1 xs:grid-cols-3 gap-6 text-center">
                  <div className="space-y-1">
                    <p className="text-[10px] text-primary-400 font-bold uppercase tracking-tight">Payments</p>
                    <p className="text-2xl font-bold text-primary-900">{reportStats.totalPayments}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-primary-400 font-bold uppercase tracking-tight">Total Amount</p>
                    <p className="text-2xl font-bold text-primary-900">{formatCurrency(reportStats.totalAmount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-primary-400 font-bold uppercase tracking-tight">Average</p>
                    <p className="text-2xl font-bold text-primary-900">{formatCurrency(reportStats.averageAmount)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-5 w-5" />
                {loading ? 'Generating...' : 'Download CSV'}
              </button>
              <button
                onClick={handleGenerateAndStore}
                disabled={loading || !organizationId}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Cloud className="h-5 w-5" />
                {loading ? 'Storing...' : 'Generate & Store'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Stored Reports</h2>
            <p className="text-sm text-gray-500 mt-1">
              Reports are automatically updated when payments are completed. Click to download or regenerate.
            </p>
          </div>

          {loadingStored ? (
            <div className="p-12 text-center text-gray-500">Loading reports...</div>
          ) : storedReports.length === 0 ? (
            <div className="p-12 text-center">
              <Cloud className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No stored reports yet. Generate a report to store it on the server.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {storedReports.map((report) => (
                <div key={report.path} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">{getReportDisplayName(report)}</h3>
                          <p className="text-sm text-gray-500">
                            Updated {format(new Date(report.updated_at), 'MMM dd, yyyy HH:mm')}
                            {report.payment_count > 0 && (
                              <span className="ml-2">• {report.payment_count} payments</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={report.url}
                        download
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                      >
                        <Download className="h-4 w-4 inline mr-1" />
                        Download
                      </a>
                      <button
                        onClick={() => handleRegenerateReport(report)}
                        disabled={regenerating === report.path}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        <RefreshCw className={`h-4 w-4 inline mr-1 ${regenerating === report.path ? 'animate-spin' : ''}`} />
                        {regenerating === report.path ? 'Regenerating...' : 'Regenerate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Information Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">About Reports</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Reports include all payment transactions with member details</li>
          <li>CSV files can be opened in Excel, Google Sheets, or any spreadsheet application</li>
          <li>All reports include: Payment ID, Date, Member Name, Amount, Payment Method, Status, Reference Number, and Description</li>
          <li>Stored reports are automatically updated when new payments are completed</li>
        </ul>
      </div>
    </div>
  )
}
