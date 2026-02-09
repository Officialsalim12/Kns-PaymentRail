import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    // Rewrite POST requests to payment success/cancelled pages to the API handler
    if (request.method === 'POST') {
      const pathname = request.nextUrl.pathname
      if (pathname === '/payment-success' || pathname === '/payment-success/') {
        const url = request.nextUrl.clone()
        url.pathname = '/api/handler/payment-success'
        return NextResponse.rewrite(url)
      }
      if (pathname === '/payment-cancelled' || pathname === '/payment-cancelled/') {
        const url = request.nextUrl.clone()
        url.pathname = '/api/handler/payment-cancelled'
        return NextResponse.rewrite(url)
      }
    }

    return await updateSession(request)
  } catch (e: any) {
    // Only log critical errors in production
    if (process.env.NODE_ENV === 'development') {
      console.error('[Middleware] Error:', e)
    }
    throw e
  }
}

export const config = {
  matcher: [
    // Skip static files and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

