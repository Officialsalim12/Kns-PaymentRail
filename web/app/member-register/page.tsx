import { createClient } from '@/lib/supabase/server'
import MemberRegistrationForm from '@/components/member/RegistrationForm'
import AuthLayout from '@/components/auth/AuthLayout'
import Link from 'next/link'

export default async function MemberRegisterPage() {
  const supabase = await createClient()

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, organization_type, status')
    .eq('status', 'approved')
    .order('name', { ascending: true })

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join an organization and start managing your payments"
    >
      <MemberRegistrationForm organizations={organizations || []} />

      <div className="mt-6 text-center text-sm">
        <span className="text-gray-500">Already have an account? </span>
        <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
          Sign in
        </Link>
      </div>
      <div className="mt-2 text-center text-sm">
        <span className="text-gray-500">Organisation Admin? </span>
        <Link href="/organization/register" className="font-medium text-primary-600 hover:text-primary-500">
          Register Organization
        </Link>
      </div>
    </AuthLayout>
  )
}


