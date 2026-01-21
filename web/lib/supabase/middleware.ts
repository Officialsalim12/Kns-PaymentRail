import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Check if environment variables are set and valid
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (
    !supabaseUrl || 
    supabaseUrl === 'null' || 
    supabaseUrl === 'undefined' ||
    !supabaseAnonKey || 
    supabaseAnonKey === 'null' || 
    supabaseAnonKey === 'undefined'
  ) {
    // If Supabase is not configured, allow the request to proceed
    // This prevents crashes during development when env vars might be missing
    return supabaseResponse
  }

  // Validate URL format before creating client
  try {
    new URL(supabaseUrl)
  } catch (urlError) {
    // Invalid URL format - allow request to proceed without Supabase
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Middleware] Invalid Supabase URL format:', supabaseUrl)
    }
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // Add timeout to prevent hanging on network issues
    let getUserAborted = false
    const getUserPromise = supabase.auth.getUser().catch((err) => {
      // Suppress network errors - they're expected during timeouts
      if (!getUserAborted) {
        return { data: { user: null }, error: { message: err.message || 'Network error' } }
      }
      return { data: { user: null }, error: { message: 'Request aborted' } }
    })
    
    const timeoutPromise = new Promise<{ data: { user: null }, error: { message: string } }>((resolve) => 
      setTimeout(() => {
        getUserAborted = true
        resolve({ data: { user: null }, error: { message: 'Network timeout' } })
      }, 3000) // Reduced to 3 seconds for faster response
    )

    const result = await Promise.race([getUserPromise, timeoutPromise])
    const {
      data: { user },
      error,
    } = result as { data: { user: any }, error: any }

    // If there's a network error or timeout, allow the request to proceed
    // This prevents the app from crashing when Supabase is unreachable
    if (error) {
      // Only log in development, and suppress common network errors
      if (process.env.NODE_ENV === 'development') {
        const errorMsg = error.message || 'Unknown error'
        // Suppress noisy timeout/connection errors in console
        if (!errorMsg.includes('timeout') && !errorMsg.includes('Auth session missing')) {
          console.warn('[Middleware] Supabase connection error:', errorMsg)
        }
      }
      // Allow request to proceed - pages will handle auth errors gracefully
      return supabaseResponse
    }

    if (
      !user &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/register') &&
      !request.nextUrl.pathname.startsWith('/organization/register') &&
      !request.nextUrl.pathname.startsWith('/member-register') &&
      !request.nextUrl.pathname.startsWith('/super-admin-register') &&
      request.nextUrl.pathname !== '/'
    ) {
      // no user, potentially respond by redirecting the user to the login page
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
    // creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser to delete cookies,
    // which will log users out of your application!

    return supabaseResponse
  } catch (error: any) {
    // Catch any unexpected errors and allow the request to proceed
    // This prevents the entire app from crashing due to middleware errors
    // Suppress common network/socket errors that are expected during timeouts
    if (process.env.NODE_ENV === 'development') {
      const errorMsg = error?.message || String(error)
      const errorCode = error?.code || ''
      // Only log if it's not a common network error or invalid URL error
      if (
        !errorMsg.includes('fetch failed') &&
        !errorMsg.includes('timeout') &&
        !errorMsg.includes('socket') &&
        !errorMsg.includes('ECONNRESET') &&
        !errorMsg.includes('other side closed') &&
        !errorMsg.includes('Invalid URL') &&
        errorCode !== 'ERR_INVALID_URL'
      ) {
        console.error('[Middleware] Unexpected error:', errorMsg)
      }
    }
    return supabaseResponse
  }
}

