// Payment display utilities
// Members see full amount, admins see 96% for completed payments (4% platform fee)

const TRANSFER_FEE_PERCENTAGE = 0.01
const SERVICE_FEE_PERCENTAGE = 0.03
const PLATFORM_FEE_PERCENTAGE = TRANSFER_FEE_PERCENTAGE + SERVICE_FEE_PERCENTAGE
const NET_PERCENTAGE = 1 - PLATFORM_FEE_PERCENTAGE
export function getDisplayAmount(amount: number | string, paymentStatus?: string | null): number {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  
  if (paymentStatus === 'completed') {
    return numericAmount * NET_PERCENTAGE
  }
  
  return numericAmount
}
export function getPlatformFee(amount: number | string): number {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  return numericAmount * PLATFORM_FEE_PERCENTAGE
}

export function getTransferFee(amount: number | string): number {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  return numericAmount * TRANSFER_FEE_PERCENTAGE
}

export function getServiceCharge(amount: number | string): number {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  return numericAmount * SERVICE_FEE_PERCENTAGE
}
export function calculateTotalDisplayAmount(
  payments: Array<{ amount: number | string; payment_status?: string | null }>
): number {
  return payments.reduce((sum, payment) => {
    return sum + getDisplayAmount(payment.amount, payment.payment_status)
  }, 0)
}

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

export function getMemberDisplayAmount(amount: number | string): number {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  return numericAmount
}
