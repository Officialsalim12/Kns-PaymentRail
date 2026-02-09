'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { generateReport } from './generate-report'
import { convertToCSV, type ReportData } from '@/lib/csv'
import { requireOrgAdmin } from '@/lib/auth'

export interface StoredReport {
  path: string
  url: string
  type: 'daily' | 'monthly' | 'yearly' | 'all'
  day?: number
  month?: number
  year: number
  updated_at: string
  payment_count: number
  total_amount: number
}

/**
 * Generate and store CSV report in Supabase storage
 */
export async function generateAndStoreReport(
  type: 'daily' | 'monthly' | 'yearly' | 'all',
  day?: number,
  month?: number,
  year?: number
): Promise<{ data?: StoredReport; error?: string }> {
  const user = await requireOrgAdmin()
  const organizationId = user.profile?.organization_id

  if (!organizationId) {
    return { error: 'Organization not found' }
  }

  // Use Service Role client for storage uploads to bypass RLS policies
  const supabase = createServiceRoleClient()

  // Use current date if not provided
  const now = new Date()
  const reportYear = year ?? now.getFullYear()
  const reportMonth = month ?? now.getMonth()
  const reportDay = day ?? now.getDate()

  // Generate report data
  const reportData = await generateReport(type, reportDay, reportMonth, reportYear)

  if (reportData.length === 0) {
    return { error: 'No payment data found for the selected period' }
  }

  // Convert to CSV
  const csvContent = await convertToCSV(reportData)

  // Generate file path
  let fileName = 'payments-all.csv'
  let storagePath = `${organizationId}/all/payments-all.csv`

  if (type === 'daily') {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
    fileName = `payments-${reportDay}-${months[reportMonth]}-${reportYear}.csv`
    storagePath = `${organizationId}/daily/${reportYear}/${reportMonth + 1}/${fileName}`
  } else if (type === 'monthly') {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
    fileName = `payments-${months[reportMonth]}-${reportYear}.csv`
    storagePath = `${organizationId}/monthly/${reportYear}/${fileName}`
  } else if (type === 'yearly') {
    fileName = `payments-${reportYear}.csv`
    storagePath = `${organizationId}/yearly/${fileName}`
  } else {
    storagePath = `${organizationId}/all/payments-all.csv`
  }

  // Upload to Supabase storage
  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(storagePath, csvContent, {
      contentType: 'text/csv',
      upsert: true, // Overwrite if exists
      cacheControl: '3600',
    })

  if (uploadError) {
    return { error: `Failed to upload report: ${uploadError.message}` }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('reports')
    .getPublicUrl(storagePath)

  // Calculate statistics
  const totalAmount = reportData.reduce((sum, p) => sum + p.amount, 0)

  return {
    data: {
      path: storagePath,
      url: publicUrl,
      type,
      day: type === 'daily' ? reportDay : undefined,
      month: (type === 'daily' || type === 'monthly') ? reportMonth : undefined,
      year: reportYear,
      updated_at: new Date().toISOString(),
      payment_count: reportData.length,
      total_amount: totalAmount,
    }
  }
}



/**
 * Get all stored reports for an organization
 */
export async function getStoredReports(organizationId: string): Promise<StoredReport[]> {
  const supabase = await createClient()

  const reports: StoredReport[] = []

  try {
    // List files recursively from all subdirectories
    const paths = [
      `${organizationId}/all`,
      `${organizationId}/yearly`,
      `${organizationId}/monthly`,
      `${organizationId}/daily`,
    ]

    for (const basePath of paths) {
      try {
        const { data: files, error: listError } = await supabase.storage
          .from('reports')
          .list(basePath, {
            limit: 1000,
            sortBy: { column: 'updated_at', order: 'desc' },
          })

        if (listError) {
          // Directory might not exist yet, skip
          continue
        }

        // Process files
        for (const file of files || []) {
          if (file.name.endsWith('.csv')) {
            const path = `${basePath}/${file.name}`
            const { data: { publicUrl } } = supabase.storage
              .from('reports')
              .getPublicUrl(path)

            // Parse file path to determine type
            let type: 'monthly' | 'yearly' | 'all' = 'all'
            let month: number | undefined
            let year = new Date().getFullYear()

            if (basePath.includes('/all/')) {
              type = 'all'
            } else if (basePath.includes('/yearly/')) {
              type = 'yearly'
              const yearMatch = file.name.match(/(\d{4})\.csv/)
              if (yearMatch) year = parseInt(yearMatch[1])
            } else if (basePath.includes('/monthly/')) {
              type = 'monthly'
              const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
              const monthMatch = file.name.match(/payments-(\w+)-(\d{4})\.csv/)
              if (monthMatch) {
                const monthName = monthMatch[1].toLowerCase()
                month = months.indexOf(monthName)
                if (month === -1) continue // Invalid month name
                year = parseInt(monthMatch[2])
              }
            }

            reports.push({
              path,
              url: publicUrl,
              type,
              month,
              year,
              updated_at: file.updated_at || file.created_at || new Date().toISOString(),
              payment_count: 0, // Will be updated when file is downloaded/regenerated
              total_amount: 0, // Will be updated when file is downloaded/regenerated
            })
          }
        }
      } catch (err) {
        // Skip directories that don't exist
        continue
      }
    }

    // Also check for monthly reports in year subdirectories
    try {
      const { data: yearDirs } = await supabase.storage
        .from('reports')
        .list(`${organizationId}/monthly`, {
          limit: 100,
        })

      for (const yearDir of yearDirs || []) {
        if (!isNaN(parseInt(yearDir.name))) {
          const { data: monthFiles } = await supabase.storage
            .from('reports')
            .list(`${organizationId}/monthly/${yearDir.name}`, {
              limit: 100,
            })

          for (const file of monthFiles || []) {
            if (file.name.endsWith('.csv')) {
              const path = `${organizationId}/monthly/${yearDir.name}/${file.name}`
              const { data: { publicUrl } } = supabase.storage
                .from('reports')
                .getPublicUrl(path)

              const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
              const monthMatch = file.name.match(/payments-(\w+)-(\d{4})\.csv/)
              if (monthMatch) {
                const monthName = monthMatch[1].toLowerCase()
                const month = months.indexOf(monthName)
                if (month !== -1) {
                  const year = parseInt(yearDir.name)
                  reports.push({
                    path,
                    url: publicUrl,
                    type: 'monthly',
                    month,
                    year,
                    updated_at: file.updated_at || file.created_at || new Date().toISOString(),
                    payment_count: 0,
                    total_amount: 0,
                  })
                }
              }
            }
          }
        }
      }
    } catch (err) {
      // Ignore errors for year subdirectories
    }
  } catch (error: any) {
    console.error('Error getting stored reports:', error)
  }

  // Sort by updated_at descending
  reports.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  return reports
}

/**
 * Delete a stored report
 */
export async function deleteStoredReport(organizationId: string, path: string): Promise<void> {
  const supabase = await createClient()

  // Remove organization ID prefix if present
  const filePath = path.startsWith(organizationId)
    ? path
    : `${organizationId}/${path}`

  const { error } = await supabase.storage
    .from('reports')
    .remove([filePath])

  if (error) {
    throw new Error(`Failed to delete report: ${error.message}`)
  }
}
