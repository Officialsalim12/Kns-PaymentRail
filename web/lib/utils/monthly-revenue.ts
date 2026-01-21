/**
 * Monthly Revenue Calculation Utilities
 * 
 * This module provides functions to calculate monthly revenue
 * for any given month based on completed payments.
 */

interface Payment {
  amount: number | string
  created_at: string
  payment_status?: string
  status?: string
}

/**
 * Calculate revenue for a specific month
 * 
 * @param payments - Array of payment records
 * @param year - Year (e.g., 2024)
 * @param month - Month index (0-11, where 0=January, 11=December)
 * @returns Total revenue for that month
 * 
 * @example
 * // Calculate January 2024 revenue
 * const janRevenue = calculateMonthlyRevenue(payments, 2024, 0)
 * 
 * @example
 * // Calculate December 2023 revenue
 * const decRevenue = calculateMonthlyRevenue(payments, 2023, 11)
 */
export function calculateMonthlyRevenue(
  payments: Payment[],
  year: number,
  month: number
): number {
  // Validate month range
  if (month < 0 || month > 11) {
    throw new Error('Month must be between 0 (January) and 11 (December)')
  }

  // Calculate start of target month
  const startOfMonth = new Date(year, month, 1)
  startOfMonth.setHours(0, 0, 0, 0)

  // Calculate start of next month (exclusive end date)
  const startOfNextMonth = new Date(year, month + 1, 1)
  startOfNextMonth.setHours(0, 0, 0, 0)

  // Filter payments that fall within this month
  const monthPayments = payments.filter(p => {
    // Only include completed payments
    const status = p.payment_status || p.status
    if (status !== 'completed') {
      return false
    }

    // Check if payment date falls within the month
    const paymentDate = new Date(p.created_at)
    return paymentDate >= startOfMonth && paymentDate < startOfNextMonth
  })

  // Sum all payment amounts
  return monthPayments.reduce((sum, p) => {
    const amount = typeof p.amount === 'string' ? parseFloat(p.amount) : (p.amount || 0)
    return sum + amount
  }, 0)
}

/**
 * Calculate current month revenue
 * 
 * @param payments - Array of payment records
 * @returns Total revenue for the current month
 */
export function calculateCurrentMonthRevenue(payments: Payment[]): number {
  const now = new Date()
  return calculateMonthlyRevenue(payments, now.getFullYear(), now.getMonth())
}

/**
 * Calculate last month revenue
 * 
 * @param payments - Array of payment records
 * @returns Total revenue for the previous month
 */
export function calculateLastMonthRevenue(payments: Payment[]): number {
  const now = new Date()
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  return calculateMonthlyRevenue(payments, year, lastMonth)
}

/**
 * Calculate revenue for multiple months
 * 
 * @param payments - Array of payment records
 * @param months - Number of months to calculate (default: 12)
 * @returns Array of monthly revenue data
 * 
 * @example
 * // Get last 6 months revenue
 * const last6Months = calculateMonthlyRevenueHistory(payments, 6)
 * // Returns: [
 * //   { year: 2024, month: 11, monthName: 'December', revenue: 5000 },
 * //   { year: 2024, month: 10, monthName: 'November', revenue: 4500 },
 * //   ...
 * // ]
 */
export function calculateMonthlyRevenueHistory(
  payments: Payment[],
  months: number = 12
): Array<{ year: number; month: number; monthName: string; revenue: number }> {
  const now = new Date()
  const results: Array<{ year: number; month: number; monthName: string; revenue: number }> = []

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth()

    const revenue = calculateMonthlyRevenue(payments, year, month)

    results.push({
      year,
      month,
      monthName: monthNames[month],
      revenue
    })
  }

  return results
}

/**
 * Get date range for a specific month
 * 
 * @param year - Year
 * @param month - Month index (0-11)
 * @returns Object with start and end dates for the month
 */
export function getMonthDateRange(year: number, month: number): {
  start: Date
  end: Date
  startOfNextMonth: Date
} {
  if (month < 0 || month > 11) {
    throw new Error('Month must be between 0 (January) and 11 (December)')
  }

  const start = new Date(year, month, 1)
  start.setHours(0, 0, 0, 0)

  const startOfNextMonth = new Date(year, month + 1, 1)
  startOfNextMonth.setHours(0, 0, 0, 0)

  // End is the last moment of the month (one millisecond before next month)
  const end = new Date(startOfNextMonth.getTime() - 1)

  return {
    start,
    end,
    startOfNextMonth
  }
}

/**
 * Format month and year for display
 * 
 * @param year - Year
 * @param month - Month index (0-11)
 * @returns Formatted string (e.g., "December 2024")
 */
export function formatMonthYear(year: number, month: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  if (month < 0 || month > 11) {
    throw new Error('Month must be between 0 (January) and 11 (December)')
  }

  return `${monthNames[month]} ${year}`
}
