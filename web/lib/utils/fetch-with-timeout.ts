/**
 * Fetch utility with timeout support
 * Helps prevent hanging requests when network connections fail
 */

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number // Timeout in milliseconds, default 10000 (10 seconds)
}

/**
 * Fetch with timeout using AbortController
 * @param url - The URL to fetch
 * @param options - Fetch options including optional timeout
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms: ${url}`)
    }
    
    // Re-throw network errors with more context
    if (error.message?.includes('fetch failed') || error.message?.includes('Connect Timeout')) {
      throw new Error(`Network error: Unable to connect to ${url}. Please check your internet connection.`)
    }
    
    throw error
  }
}
