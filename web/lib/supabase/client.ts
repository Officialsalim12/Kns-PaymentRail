import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Validate that environment variables are set and not null/undefined
  if (!supabaseUrl || supabaseUrl === 'null' || supabaseUrl === 'undefined') {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set. Please check your environment variables.'
    )
  }

  if (!supabaseAnonKey || supabaseAnonKey === 'null' || supabaseAnonKey === 'undefined') {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Please check your environment variables.'
    )
  }

  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch (urlError) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${supabaseUrl}`
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

