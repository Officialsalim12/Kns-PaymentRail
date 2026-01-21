import { createClient } from '@/lib/supabase/server'
import MemberRegistrationForm from '@/components/member/RegistrationForm'

export default async function MemberRegisterPage() {
  const supabase = await createClient()

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, organization_type, status')
    .eq('status', 'approved')
    .order('name', { ascending: true })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Membership Registration
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Register your membership and link it to your organization
          </p>
        </div>
        <MemberRegistrationForm organizations={organizations || []} />
      </div>
    </div>
  )
}


