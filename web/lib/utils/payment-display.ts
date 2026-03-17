// Payment display utilities
// Members see full amount, admins see 96% for completed payments (4% platform fee)

export function getDisplayAmount(amount: number | string, paymentStatus?: string | null): number {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0)
  return numericAmount
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
