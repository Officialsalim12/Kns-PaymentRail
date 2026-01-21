'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { testEdgeFunctionConnection } from '@/lib/supabase/functions'

export default function EdgeFunctionDiagnostic() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)
  const [config, setConfig] = useState<{ url: string; hasKey: boolean } | null>(null)

  const checkConfig = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    setConfig({
      url: typeof url === 'string' ? url : 'Not set',
      hasKey,
    })
  }

  const testConnection = async () => {
    setTesting(true)
    setResult(null)
    
    try {
      const supabase = createClient()
      const testResult = await testEdgeFunctionConnection(supabase, 'create-monime-checkout')
      setResult(testResult)
    } catch (error: any) {
      setResult({
        success: false,
        message: `Test failed: ${error.message || error.toString()}`,
        details: { error },
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Edge Function Diagnostic</h2>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={checkConfig}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
          >
            Check Configuration
          </button>
          {config && (
            <div className="mt-2 p-3 bg-gray-50 rounded border">
              <p className="text-sm">
                <strong>Supabase URL:</strong> {config.url}
              </p>
              <p className="text-sm">
                <strong>Anon Key:</strong> {config.hasKey ? '✓ Set' : '✗ Not set'}
              </p>
            </div>
          )}
        </div>

        <div>
          <button
            onClick={testConnection}
            disabled={testing}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
          >
            {testing ? 'Testing...' : 'Test Edge Function Connection'}
          </button>
        </div>

        {result && (
          <div className={`p-4 rounded border ${
            result.success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="font-semibold mb-2">{result.success ? '✓ Success' : '✗ Failed'}</p>
            <p className="text-sm mb-2">{result.message}</p>
            {result.details && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium">View Details</summary>
                <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto max-h-48">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-900 mb-2">Quick Fixes:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Ensure <code className="bg-blue-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> is set in <code className="bg-blue-100 px-1 rounded">.env.local</code></li>
            <li>Deploy the function: <code className="bg-blue-100 px-1 rounded">supabase functions deploy create-monime-checkout</code></li>
            <li>Check Supabase Dashboard → Edge Functions to verify deployment</li>
            <li>Verify your internet connection</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

