/**
 * Utility to get the base URL of the application for cross-provider compatibility.
 */
export function getSiteUrl(): string {
  // 1. Manually configured APP_URL (the most reliable source)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }

  // 2. Vercel deployment URL (automatic fallback if on Vercel)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }

  // 3. Browser origin (during client-side execution)
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }

  // 4. Default fallback (usually local development)
  return 'http://localhost:3000'
}
