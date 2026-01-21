import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'

const MONIME_API_BASE_URL = 'https://api.monime.io'
const DEFAULT_TIMEOUT = 15000

export interface MonimeCheckoutSession {
  id: string
  url: string
  status: 'pending' | 'completed' | 'expired' | 'cancelled'
  amount: number
  currency: string
  metadata?: Record<string, any>
}

export interface CreateCheckoutSessionParams {
  amount: number
  currency?: string
  description?: string
  success_url: string
  cancel_url: string
  metadata?: Record<string, any>
  space_id?: string
}

export interface MonimePayment {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  amount: number
  currency: string
  checkout_session_id?: string
  metadata?: Record<string, any>
}

export class MonimeClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.baseUrl = MONIME_API_BASE_URL
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<MonimeCheckoutSession> {
    const response = await fetchWithTimeout(`${this.baseUrl}/checkout-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency || 'SLE',
        description: params.description,
        success_url: params.success_url,
        cancel_url: params.cancel_url,
        metadata: params.metadata,
        ...(params.space_id && { space_id: params.space_id }),
      }),
      timeout: DEFAULT_TIMEOUT,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`Monime API error: ${error.message || response.statusText}`)
    }

    return response.json()
  }

  async getCheckoutSession(sessionId: string): Promise<MonimeCheckoutSession> {
    const response = await fetchWithTimeout(`${this.baseUrl}/checkout-sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: DEFAULT_TIMEOUT,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`Monime API error: ${error.message || response.statusText}`)
    }

    return response.json()
  }

  async getPayment(paymentId: string): Promise<MonimePayment> {
    const response = await fetchWithTimeout(`${this.baseUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: DEFAULT_TIMEOUT,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(`Monime API error: ${error.message || response.statusText}`)
    }

    return response.json()
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    // TODO: implement webhook signature verification
    return true
  }
}
export function getMonimeClient(): MonimeClient {
  const apiKey = process.env.MONIME_API_KEY || process.env.NEXT_PUBLIC_MONIME_API_KEY
  
  if (!apiKey) {
    throw new Error('MONIME_API_KEY environment variable is not set')
  }

  return new MonimeClient(apiKey)
}

