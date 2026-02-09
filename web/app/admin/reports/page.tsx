import { requireOrgAdmin } from '@/lib/auth'
import Reports from '@/components/admin/Reports'

// Ensure this page runs in Node runtime (not Edge) to support Supabase
export const runtime = 'nodejs'

export default async function ReportsPage() {
  try {
    await requireOrgAdmin()
    return <Reports />
  } catch (error) {
    console.error('[ReportsPage] Error:', error)
    throw error
  }
}
