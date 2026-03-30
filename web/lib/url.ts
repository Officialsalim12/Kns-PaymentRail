/**
 * Returns the base URL for the application.
 *
 * Priority:
 * 1. NEXT_PUBLIC_BASE_URL  ← Set this on your production server
 * 2. NEXT_PUBLIC_APP_URL   ← Legacy support
 * 3. NEXT_PUBLIC_VERCEL_URL ← Vercel auto-detect
 * 4. window.location.origin ← Client-side browser URL
 * 5. http://localhost:3000  ← Dev fallback only
 *
 * IMPORTANT FOR PRODUCTION (cPanel/any host):
 * Set environment variable: NEXT_PUBLIC_BASE_URL=https://fundflow.sl
 */

// The canonical production domain — used as an absolute last resort on the server
const PRODUCTION_DOMAIN = 'https://fundflow.sl'

export function getSiteUrl(): string {
  // 1. Check NEXT_PUBLIC_BASE_URL (recommended — set this in your hosting panel)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (baseUrl && !baseUrl.includes('localhost')) {
    return baseUrl.replace(/\/$/, '')
  }

  // 2. Legacy support for NEXT_PUBLIC_APP_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl && !appUrl.includes('localhost')) {
    return appUrl.replace(/\/$/, '')
  }

  // 3. Vercel auto-detected URL
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }

  // 4. Client-side: use actual browser URL (most accurate)
  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin
    // If browser is on localhost but env says production → use production domain
    if (origin.includes('localhost') && process.env.NODE_ENV === 'production') {
      console.warn('[getSiteUrl] Browser origin is localhost in production – using PRODUCTION_DOMAIN')
      return PRODUCTION_DOMAIN
    }
    return origin
  }

  // 5. Server-side fallback — if no env var is set and NODE_ENV is production,
  //    use the hardcoded production domain rather than returning localhost
  if (process.env.NODE_ENV === 'production') {
    console.warn('[getSiteUrl] No env var set in production – falling back to PRODUCTION_DOMAIN')
    return PRODUCTION_DOMAIN
  }

  // 6. Local development only
  return 'http://localhost:3000'
}

