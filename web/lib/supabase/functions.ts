import { SupabaseClient } from '@supabase/supabase-js'
import { fetchWithTimeout } from '@/lib/utils/fetch-with-timeout'

interface InvokeFunctionOptions {
  body?: Record<string, any>
  headers?: Record<string, string>
}

export async function testEdgeFunctionConnection(
  supabase: SupabaseClient,
  functionName: string = 'create-monime-checkout'
): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl === 'null' || supabaseUrl === 'undefined') {
      return {
        success: false,
        message: 'NEXT_PUBLIC_SUPABASE_URL is not set or invalid',
      }
    }

    // Validate URL format
    try {
      new URL(supabaseUrl)
    } catch (urlError) {
      return {
        success: false,
        message: 'NEXT_PUBLIC_SUPABASE_URL is not a valid URL format',
      }
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return {
        success: false,
        message: 'Not authenticated. Please log in first.',
        details: { authError },
      }
    }

    const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`
    const result = await supabase.functions.invoke(functionName, {
      body: { test: true },
    })

    return {
      success: !result.error,
      message: result.error 
        ? `Connection failed: ${result.error.message || JSON.stringify(result.error)}`
        : 'Connection successful!',
      details: {
        functionUrl,
        userId: user.id,
        error: result.error,
        data: result.data,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Test failed: ${error.message || error.toString()}`,
      details: { error },
    }
  }
}

export async function invokeEdgeFunction<T = any>(
  supabase: SupabaseClient,
  functionName: string,
  options: InvokeFunctionOptions = {}
): Promise<{ data: T | null; error: any | null }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl === 'null' || supabaseUrl === 'undefined') {
      console.error('NEXT_PUBLIC_SUPABASE_URL is not set or invalid:', supabaseUrl)
      return {
        data: null,
        error: {
          message: 'Configuration error: Supabase URL is not configured. Please check your environment variables.',
          code: 'CONFIG_ERROR',
        },
      }
    }

    // Validate URL format
    try {
      new URL(supabaseUrl)
    } catch (urlError) {
      console.error('NEXT_PUBLIC_SUPABASE_URL is not a valid URL:', supabaseUrl)
      return {
        data: null,
        error: {
          message: 'Configuration error: Supabase URL is not a valid URL format.',
          code: 'CONFIG_ERROR',
        },
      }
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        data: null,
        error: {
          message: 'Authentication required. Please log in again.',
          code: 'AUTH_ERROR',
          originalError: authError,
        },
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Edge Function] Invoking: ${functionName}`, {
        url: supabaseUrl,
        hasBody: !!options.body,
        userId: user.id,
      })
    }

    const result = await supabase.functions.invoke(functionName, {
      body: options.body,
      headers: options.headers,
    })

    if (result.error) {
      console.error(`Edge Function ${functionName} error:`, result.error)
      console.error(`Edge Function ${functionName} response data:`, result.data)
      
      let errorMessage = 'Unknown error occurred'
      let errorCode = result.error?.code || 'FUNCTION_ERROR'
      
      if (result.error && typeof result.error === 'object') {
        const errorObj = result.error as any
        if (errorObj.message) {
          errorMessage = errorObj.message
        } else if (errorObj.error) {
          errorMessage = typeof errorObj.error === 'string' ? errorObj.error : (errorObj.error.message || JSON.stringify(errorObj.error))
        } else if (errorObj.context?.message) {
          errorMessage = errorObj.context.message
        }
      } else if (typeof result.error === 'string') {
        errorMessage = result.error
      }
      
      // For 400 errors, the response body is often in result.data even though error is set
      // First, check if result.data contains error information (for 400 responses)
      if (result.data && typeof result.data === 'object') {
        const data = result.data as any
        console.log('Checking result.data for error:', data)
        
        // Check for Monime API error details
        if (data.monimeError) {
          console.log('Monime API error details found:', data.monimeError)
          const monimeErr = data.monimeError
          if (monimeErr.errorDetails) {
            console.log('Monime errorDetails:', monimeErr.errorDetails)
            if (monimeErr.errorDetails.details && Array.isArray(monimeErr.errorDetails.details)) {
              const validationErrors = monimeErr.errorDetails.details.map((d: any) => {
                if (typeof d === 'string') return d;
                if (d.field) return `${d.field}: ${d.message || d.error || JSON.stringify(d)}`;
                return JSON.stringify(d);
              }).join('; ');
              if (validationErrors) {
                errorMessage = `${data.error || errorMessage} (Monime Details: ${validationErrors})`;
              }
            } else if (monimeErr.errorDetails.errors && Array.isArray(monimeErr.errorDetails.errors)) {
              const validationErrors = monimeErr.errorDetails.errors.map((e: any) => {
                if (typeof e === 'string') return e;
                if (e.field) return `${e.field}: ${e.message || e.error || JSON.stringify(e)}`;
                return JSON.stringify(e);
              }).join('; ');
              if (validationErrors) {
                errorMessage = `${data.error || errorMessage} (Monime Details: ${validationErrors})`;
              }
            } else {
              errorMessage = `${data.error || errorMessage} (Monime Response: ${JSON.stringify(monimeErr.errorDetails)})`;
            }
          } else if (monimeErr.errorBody) {
            errorMessage = `${data.error || errorMessage} (Monime Response: ${monimeErr.errorBody})`;
          }
        } else if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error))
          console.log('Extracted error from response data.error:', errorMessage)
        } else if (data.message) {
          errorMessage = data.message
          console.log('Extracted error from response data.message:', errorMessage)
        } else if (!data.success && data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
          console.log('Extracted error from response data (success=false):', errorMessage)
        } else {
          console.log('Response data exists but no error field, using full data:', JSON.stringify(data))
          errorMessage = JSON.stringify(data)
        }
      }
      
      if (result.error && typeof result.error === 'object') {
        const errorObj = result.error as any
        if (errorObj.context?.message) {
          errorMessage = errorObj.context.message
        } else if (errorObj.message && errorMessage === 'Unknown error occurred') {
          errorMessage = errorObj.message
        }
        
        if (errorObj.response) {
          try {
            const responseData = await errorObj.response.json().catch(() => null)
            if (responseData && responseData.error) {
              errorMessage = typeof responseData.error === 'string' 
                ? responseData.error 
                : responseData.error.message || errorMessage
            }
          } catch (e) {}
        }
      }
      
      if ((!result.data || errorMessage === 'Unknown error occurred') && typeof window !== 'undefined') {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token && supabaseUrl && supabaseUrl !== 'null' && supabaseUrl !== 'undefined') {
            const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`
            console.log('⚠️ result.data is null - attempting direct fetch to get error details from Edge Function...')
            const fetchResponse = await fetchWithTimeout(functionUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              },
              body: JSON.stringify(options.body),
              timeout: 15000, // 15 seconds timeout
            })
            
            if (!fetchResponse.ok) {
              console.log(`Direct fetch returned status ${fetchResponse.status}: ${fetchResponse.statusText}`)
              const errorBody = await fetchResponse.json().catch(async () => {
                const text = await fetchResponse.text().catch(() => null)
                return text ? { raw: text } : null
              })
              
              console.log('Error body from direct fetch:', errorBody)
              
              if (errorBody) {
                if (errorBody.error) {
                  errorMessage = typeof errorBody.error === 'string' 
                    ? errorBody.error 
                    : errorBody.error.message || JSON.stringify(errorBody.error)
                } else if (errorBody.message) {
                  errorMessage = errorBody.message
                } else if (errorBody.raw) {
                  errorMessage = errorBody.raw
                } else {
                  errorMessage = JSON.stringify(errorBody)
                }
                console.log('✅ Extracted error from direct fetch:', errorMessage)
              } else {
                errorMessage = `Edge Function returned status ${fetchResponse.status}: ${fetchResponse.statusText}`
                console.log('⚠️ No error body found, using status message:', errorMessage)
              }
            } else {
              console.log('Direct fetch succeeded (unexpected - should have been an error)')
            }
          }
        } catch (fetchError) {
          console.warn('Could not fetch error response directly. Check Network tab (F12) for the response body.', fetchError)
          errorMessage = 'Edge Function returned an error. Open browser Network tab (F12) → find the request to create-monime-checkout → Response tab to see the actual error message.'
        }
      }
      
      if (errorMessage === 'Unknown error occurred') {
        if (typeof result.error === 'string') {
          errorMessage = result.error
        } else if (result.error?.message) {
          errorMessage = result.error.message
        } else if (result.error?.error) {
          errorMessage = typeof result.error.error === 'string' 
            ? result.error.error 
            : result.error.error?.message || JSON.stringify(result.error.error)
        } else if (result.error?.context?.message) {
          errorMessage = result.error.context.message
        } else if (typeof result.error === 'object') {
          const errorObj = result.error as any
          errorMessage = errorObj.msg || errorObj.error || errorObj.details || JSON.stringify(result.error)
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.error('=== Edge Function Error Debug Info ===')
        console.error('Full error object:', JSON.stringify(result.error, null, 2))
        console.error('Response data:', JSON.stringify(result.data, null, 2))
        console.error('Full result:', JSON.stringify(result, null, 2))
        console.error('Error message so far:', errorMessage)
        console.error('=====================================')
        console.error('💡 TIP: Check Network tab (F12) → find create-monime-checkout request → Response tab for the actual error')
      }

      const errorLower = errorMessage.toLowerCase()
      
      if (
        errorLower.includes('checkout.checkout_sessions:create') ||
        errorLower.includes('checkout_sessions:create') ||
        errorLower.includes('requires the permissions') ||
        errorLower.includes('permission denied')
      ) {
        errorCode = 'MONIME_PERMISSION_ERROR'
        errorMessage = `Monime API Permission Error: Your Monime API key is missing the required permission 'checkout.checkout_sessions:create'. 

To fix this:
1. Go to your Monime dashboard
2. Navigate to API Keys or Settings → API Keys
3. Find the API key used in your Supabase Edge Function (check MONIME_API_KEY or MONIME_ACCESS_TOKEN in Supabase Dashboard → Edge Functions → create-monime-checkout → Settings)
4. Enable the 'checkout.checkout_sessions:create' permission for that API key
5. If you can't edit permissions, create a new API key with this permission enabled
6. Update the environment variable in Supabase with the new key

This is a configuration issue that needs to be fixed in your Monime dashboard.`
      } else if (
        errorLower.includes('failed to send') || 
        errorLower.includes('fetch') ||
        errorLower.includes('network') ||
        errorLower.includes('err_network') ||
        errorLower.includes('failed to fetch') ||
        errorLower.includes('typeerror: failed to fetch')
      ) {
        errorCode = 'NETWORK_ERROR'
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (!supabaseUrl) {
          errorMessage = 'Configuration error: Supabase URL is not set. Please check your environment variables.'
        } else {
          errorMessage = `Network error: Unable to connect to Edge Function "${functionName}". Please verify: 1) Your internet connection, 2) The function is deployed, 3) Your Supabase URL is correct.`
        }
      } else if (errorLower.includes('401') || errorLower.includes('unauthorized')) {
        errorCode = 'AUTH_ERROR'
        errorMessage = 'Authentication error: Your session may have expired. Please log in again.'
      } else if (errorLower.includes('404') || errorLower.includes('not found')) {
        errorCode = 'FUNCTION_NOT_FOUND'
        errorMessage = `Edge Function "${functionName}" not found. Please ensure it is deployed to your Supabase project.`
      } else if (errorLower.includes('500') || errorLower.includes('internal server error')) {
        errorCode = 'SERVER_ERROR'
        errorMessage = 'Server error: The Edge Function encountered an internal error. Please try again later or contact support.'
      } else if (errorLower.includes('cors')) {
        errorCode = 'CORS_ERROR'
        errorMessage = 'CORS error: The Edge Function may not be properly configured. Please check your Supabase project settings.'
      }

      return {
        data: null,
        error: {
          message: errorMessage,
          code: errorCode,
          originalError: result.error,
        },
      }
    }

    if (result.data && typeof result.data === 'object' && !result.error) {
      if ('success' in result.data && !result.data.success) {
        return {
          data: null,
          error: {
            message: result.data.error || 'Function returned an error',
            code: 'FUNCTION_RESPONSE_ERROR',
            originalError: result.data,
          },
        }
      }
      
      if ('error' in result.data && result.data.error) {
        return {
          data: null,
          error: {
            message: typeof result.data.error === 'string' 
              ? result.data.error 
              : result.data.error.message || 'Function returned an error',
            code: 'FUNCTION_RESPONSE_ERROR',
            originalError: result.data,
          },
        }
      }
    }

    return {
      data: result.data as T,
      error: null,
    }
  } catch (error: any) {
    console.error(`Edge Function ${functionName} invocation failed:`, error)
    
    let errorMessage = 'Failed to invoke function'
    let errorCode = 'INVOCATION_ERROR'
    
    if (error?.message) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error?.toString) {
      errorMessage = error.toString()
    }

    if (
      errorMessage.includes('Failed to send') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('network') ||
      errorMessage.includes('ERR_NETWORK') ||
      errorMessage.includes('ERR_INTERNET_DISCONNECTED') ||
      errorMessage.includes('Failed to fetch')
    ) {
      errorCode = 'NETWORK_ERROR'
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      
      if (!supabaseUrl) {
        errorMessage = 'Configuration error: Supabase URL is not set. Please check your environment variables.'
      } else if (errorMessage.includes('CORS')) {
        errorMessage = 'CORS error: The Edge Function may not be properly configured. Please check your Supabase project settings.'
      } else {
        errorMessage = `Network error: Unable to connect to Edge Function "${functionName}". Please verify: 1) Your internet connection, 2) The function is deployed, 3) Your Supabase URL is correct.`
      }
    } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      errorCode = 'AUTH_ERROR'
      errorMessage = 'Authentication error: Your session may have expired. Please log in again.'
    } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      errorCode = 'FUNCTION_NOT_FOUND'
      errorMessage = `Edge Function "${functionName}" not found. Please ensure it is deployed to your Supabase project.`
    } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
      errorCode = 'SERVER_ERROR'
      errorMessage = 'Server error: The Edge Function encountered an internal error. Please try again later or contact support.'
    }

    return {
      data: null,
      error: {
        message: errorMessage,
        code: errorCode,
        originalError: error,
      },
    }
  }
}

