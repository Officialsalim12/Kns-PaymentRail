'use client'

import { useState, useEffect, useMemo } from 'react'
import { Download, FileText, Calendar, TrendingUp, RefreshCw, Cloud, HardDrive, Clock } from 'lucide-react'
import { generateReport } from '@/app/actions/generate-report'
import { convertToCSV } from '@/lib/csv'
import { generateAndStoreReport, getStoredReports, type StoredReport } from '@/app/actions/store-report'
import { formatCurrency } from '@/lib/currency'
import { createClient } from '@/lib/supabase/client'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'
import { RevenueAreaChart, TransactionBarChart } from './RevenueChart'

export default function Reports() {
  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'custom' | 'all'>('all')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [customStartDate, setCustomStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any[]>([])
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

  const prepareChartData = useMemo(() => {
    if (!reportData.length) return []

    // Group data based on report type
    const groupedData = new Map<string, { amount: number, count: number }>()

    reportData.forEach(payment => {
      const date = new Date(payment.created_at)
      let key = ''
      let label = ''

      if (reportType === 'monthly' || reportType === 'custom' || reportType === 'all') {
        // For monthly/custom/all, group by day
        key = format(date, 'yyyy-MM-dd')
        label = format(date, 'MMM d')
      } else if (reportType === 'yearly') {
        // For yearly, group by month
        key = format(date, 'yyyy-MM')
        label = format(date, 'MMM')
      }

      const existing = groupedData.get(key) || { amount: 0, count: 0 }
      groupedData.set(key, {
        amount: existing.amount + payment.amount,
        count: existing.count + 1
      })
    })

    // Sort by date/time
    return Array.from(groupedData.entries())
      .map(([key, value]) => ({
        date: key,
        amount: value.amount,
        count: value.count,
        label: reportData.find(p => {
          const d = new Date(p.created_at)
          if (reportType === 'yearly') return format(d, 'yyyy-MM') === key
          return format(d, 'yyyy-MM-dd') === key
        }) ? (
          reportType === 'yearly' ? format(new Date(reportData.find(p => format(new Date(p.created_at), 'yyyy-MM') === key).created_at), 'MMM') :
            format(new Date(key), 'MMM d')
        ) : key
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [reportData, reportType])

  const generateReportData = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setReportStats(null)
    setReportData([])

    try {
      let data: any[] = []

      if (reportType === 'custom') {
        const allData = await generateReport('all')

        const start = startOfDay(new Date(customStartDate))
        const end = endOfDay(new Date(customEndDate))

        data = allData.filter((p: any) => {
          const date = new Date(p.created_at)
          return date >= start && date <= end
        })
      } else {
        // We removed 'daily', so just pass undefined for day
        data = await generateReport(reportType as any, undefined, selectedMonth, selectedYear)
      }

      if (data.length === 0) {
        setError('No payments found for the selected period.')
        setLoading(false)
        return
      }

      setReportData(data)

      // Calculate statistics
      const totalAmount = data.reduce((sum: number, p: any) => sum + p.amount, 0)
      const averageAmount = data.length > 0 ? totalAmount / data.length : 0
      setReportStats({
        totalPayments: data.length,
        totalAmount,
        averageAmount,
      })

      setSuccess('Report generated successfully!')

    } catch (err: any) {
      setError(err.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!reportData.length) return

    try {
      // Convert to CSV
      const csvContent = await convertToCSV(reportData)

      // Generate filename
      let filename = 'payments-report'
      if (reportType === 'monthly') {
        filename = `payments-${months[selectedMonth].toLowerCase()}-${selectedYear}`
      } else if (reportType === 'yearly') {
        filename = `payments-${selectedYear}`
      } else if (reportType === 'custom') {
        filename = `payments-${customStartDate}-to-${customEndDate}`
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
      setError(err.message || 'Failed to download report')
    }
  }

  const handleGenerateAndStore = async () => {
    if (!organizationId) {
      setError('Organization not found')
      return
    }

    if (reportType === 'custom') {
      setError('Storing custom range reports is not supported yet.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await generateAndStoreReport(reportType as any, undefined, selectedMonth, selectedYear)

      if (result.error) {
        throw new Error(result.error)
      }

      // Reload stored reports
      const reports = await getStoredReports(organizationId)
      setStoredReports(reports)

      setSuccess(`Report generated and stored successfully! ${result.data?.payment_count} payments included.`)
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
      const result = await generateAndStoreReport(
        report.type,
        undefined, // day is no longer used
        report.month,
        report.year
      )

      if (result.error) {
        throw new Error(result.error)
      }

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
    } else { // This will now cover monthly reports
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
              <h3 className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                Report Type
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setReportType('monthly')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center group ${reportType === 'monthly'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-100 bg-gray-50/50 hover:border-primary-200 text-gray-600'
                    }`}
                >
                  <Calendar className={`h-5 w-5 mb-2 ${reportType === 'monthly' ? 'text-primary-600' : 'text-gray-400'}`} />
                  <div className="font-bold text-xs">Monthly</div>
                </button>

                <button
                  onClick={() => setReportType('yearly')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center group ${reportType === 'yearly'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-100 bg-gray-50/50 hover:border-primary-200 text-gray-600'
                    }`}
                >
                  <TrendingUp className={`h-5 w-5 mb-2 ${reportType === 'yearly' ? 'text-primary-600' : 'text-gray-400'}`} />
                  <div className="font-bold text-xs">Yearly</div>
                </button>

                <button
                  onClick={() => setReportType('custom')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center group ${reportType === 'custom'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-100 bg-gray-50/50 hover:border-primary-200 text-gray-600'
                    }`}
                >
                  <Calendar className={`h-5 w-5 mb-2 ${reportType === 'custom' ? 'text-primary-600' : 'text-gray-400'}`} />
                  <div className="font-bold text-xs">Custom Range</div>
                </button>

                <button
                  onClick={() => setReportType('all')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center group ${reportType === 'all'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-100 bg-gray-50/50 hover:border-primary-200 text-gray-600'
                    }`}
                >
                  <FileText className={`h-5 w-5 mb-2 ${reportType === 'all' ? 'text-primary-600' : 'text-gray-400'}`} />
                  <div className="font-bold text-xs">All Payments</div>
                </button>
              </div>
            </div>

            {/* Date Selection */}
            {(reportType === 'monthly' || reportType === 'yearly') && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reportType === 'monthly' && (
                  <div>
                    <label htmlFor="report-month" className="block text-sm font-medium text-gray-700 mb-2">
                      Month
                    </label>
                    <select
                      id="report-month"
                      name="report-month"
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
                  <label htmlFor="report-year" className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <select
                    id="report-year"
                    name="report-year"
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

            {/* Custom Date Range Selection */}
            {reportType === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="start-date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="end-date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            )}

            {/* Actions to Generate */}
            <div className="flex justify-end">
              <button
                onClick={generateReportData}
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                Generate Report
              </button>
            </div>

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

            {/* Report Statistics & Charts */}
            {reportStats && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Revenue Over Time</h3>
                    <RevenueAreaChart data={prepareChartData} />
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Transaction Volume</h3>
                    <TransactionBarChart data={prepareChartData} />
                  </div>
                </div>

                {/* Download Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download CSV
                  </button>
                  {reportType !== 'custom' && (
                    <button
                      onClick={handleGenerateAndStore}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <Cloud className="h-4 w-4" />
                      Store Report
                    </button>
                  )}
                </div>
              </div>
            )}
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
          <li>Charts visualise revenue trends based on the selected period.</li>
          <li>Stored reports are automatically updated when new payments are completed (except custom ranges)</li>
        </ul>
      </div>
    </div>
  )
}
