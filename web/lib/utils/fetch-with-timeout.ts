interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number
}
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

    // Handle common network errors
    if (error.message?.includes('fetch failed') || error.message?.includes('Connect Timeout')) {
      throw new Error(`Network error: Unable to connect to ${url}. Please verify your connection.`)
    }

    throw error
  }
}
