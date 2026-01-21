import { requireOrgAdmin } from '@/lib/auth'
import Reports from '@/components/admin/Reports'

export default async function ReportsPage() {
  await requireOrgAdmin()

  return <Reports />
}
