import { z } from 'zod'

const envSchema = z.object({
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required').optional(),

    // Monime Payment Gateway
    NEXT_PUBLIC_MONIME_BASE_URL: z.string().url('Invalid Monime base URL'),
    NEXT_PUBLIC_MONIME_API_KEY: z.string().min(1, 'Monime API key is required'),
    MONIME_WEBHOOK_SECRET: z.string().min(1, 'Monime webhook secret is required').optional(),

    // Application
    NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL').optional(),
    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
})

type Env = z.infer<typeof envSchema>

function validateEnv(): Env {
    try {
        const env = {
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
            NEXT_PUBLIC_MONIME_BASE_URL: process.env.NEXT_PUBLIC_MONIME_BASE_URL,
            NEXT_PUBLIC_MONIME_API_KEY: process.env.NEXT_PUBLIC_MONIME_API_KEY,
            MONIME_WEBHOOK_SECRET: process.env.MONIME_WEBHOOK_SECRET,
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
            NODE_ENV: process.env.NODE_ENV,
        }

        return envSchema.parse(env)
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join('\n')
            throw new Error(`Environment variable validation failed:\n${missingVars}`)
        }
        throw error
    }
}

// Validate on module load (fail fast)
export const env = validateEnv()

// Helper to check if running in production
export const isProduction = env.NODE_ENV === 'production'
export const isDevelopment = env.NODE_ENV === 'development'
