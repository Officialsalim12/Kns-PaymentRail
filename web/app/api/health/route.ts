import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = await createClient()

        // Check database connectivity
        const { error } = await supabase.from('organizations').select('count').limit(1).single()

        if (error && error.code !== 'PGRST116') {
            // PGRST116 is "no rows returned" which means DB is working
            return NextResponse.json(
                { status: 'unhealthy', error: 'Database connection failed' },
                { status: 503 }
            )
        }

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
        })
    } catch (error) {
        console.error('[Health Check] Failed:', error)
        return NextResponse.json(
            { status: 'unhealthy', error: 'Internal server error' },
            { status: 500 }
        )
    }
}
