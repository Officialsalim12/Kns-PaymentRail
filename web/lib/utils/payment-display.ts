/**
 * Utility functions for displaying payment amounts
 *
 * Rules:
 * - The full amount is stored in the database.
 * - Members should always see the **exact amount they paid** (no fee deduction in member views).
 * - On admin views, a total platform fee of 4% is applied to completed payments:
 *   - 1% transfer fee
 *   - 3% service charge
 *   - 96% remaining as organization revenue
 */

// Admin fee configuration
const TRANSFER_FEE_PERCENTAGE = 0.01 // 1%
const SERVICE_FEE_PERCENTAGE = 0.03 // 3%
const PLATFORM_FEE_PERCENTAGE = TRANSFER_FEE_PERCENTAGE + SERVICE_FEE_PERCENTAGE // 4% total
const NET_PERCENTAGE = 1 - PLATFORM_FEE_PERCENTAGE // 96%

/**
 * Calculate the admin display amount (net revenue) for a payment
 * - For completed payments: returns 96% of the original amount (after 4% fee deduction)
 * - For other statuses: returns 100% of the original amount
 *
 * @param amount - The original payment amount from database
 * @param paymentStatus - The payment status ('completed', 'pending', 'failed', etc.)
 * @returns The amount to display for admin (net amount for completed payments)
 */
export function getDisplayAmount(amount: number | string, paymentStatus?: string | null): number {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  
  // Only apply fee deduction for completed payments
  if (paymentStatus === 'completed') {
    return numericAmount * NET_PERCENTAGE
  }
  
  // For pending, failed, or other statuses, show full amount
  return numericAmount
}

/**
 * Calculate the total platform fee amount (4% of payment)
 *
 * @param amount - The original payment amount
 * @returns The platform fee amount
 */
export function getPlatformFee(amount: number | string): number {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  return numericAmount * PLATFORM_FEE_PERCENTAGE
}

/**
 * Calculate the transfer fee amount (1% of payment)
 */
export function getTransferFee(amount: number | string): number {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  return numericAmount * TRANSFER_FEE_PERCENTAGE
}

/**
 * Calculate the service charge amount (3% of payment)
 */
export function getServiceCharge(amount: number | string): number {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  return numericAmount * SERVICE_FEE_PERCENTAGE
}

/**
 * Calculate total display amount from an array of payments for admin
 * Applies 4% fee deduction only to completed payments
 *
 * @param payments - Array of payment objects with amount and payment_status
 * @returns Total display amount (net amount for completed payments)
 */
export function calculateTotalDisplayAmount(
  payments: Array<{ amount: number | string; payment_status?: string | null }>
): number {
  return payments.reduce((sum, payment) => {
    return sum + getDisplayAmount(payment.amount, payment.payment_status)
  }, 0)
}

/**
 * Calculate total **member** display amount from completed payments only.
 * Members should always see the exact amount they paid (no fee deduction).
 *
 * @param payments - Array of payment objects with amount and payment_status
 * @returns Total gross amount from completed payments only
 */
export function calculateCompletedPaymentsDisplayAmount(
  payments: Array<{ amount: number | string; payment_status?: string | null }>
): number {
  return payments
    .filter(p => p.payment_status === 'completed')
    .reduce((sum, payment) => {
      const numericAmount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : (payment.amount || 0)
      return sum + numericAmount
    }, 0)
}

/**
 * Member-facing helper: always return the full (gross) amount,
 * regardless of payment status.
 */
export function getMemberDisplayAmount(amount: number | string): number {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  return numericAmount
}
