import { NextResponse, type NextRequest } from 'next/server'

/**
 * Simplified middleware that only handles cookie-based redirects.
 * This avoids Edge runtime incompatibility with @supabase packages.
 * Actual auth validation is handled in server components and API routes.
 */
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })

  // Public paths that don't require authentication
  const publicPaths = [
    '/login',
    '/register',
    '/organization/register',
    '/member-register',
    '/',
  ]

  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  )

  // Check for Supabase auth cookies
  // Supabase SSR uses cookies with pattern: sb-<project-ref>-auth-token
  // Also check for chunked cookies: sb-<project-ref>-auth-token.0, etc.
  const hasAuthCookie = request.cookies.getAll().some(cookie => 
    cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
  )

  // If user is trying to access a protected route without auth cookies, redirect to login
  if (!isPublicPath && !hasAuthCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user has auth cookies and is on login/register pages, allow them through
  // (The pages themselves will handle redirecting authenticated users)
  return response
}

