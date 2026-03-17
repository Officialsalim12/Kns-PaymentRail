import { requireOrgAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import BlogManagement from '@/components/admin/BlogManagement'

export default async function AdminBlogPage() {
  const user = await requireOrgAdmin()
  const supabase = await createClient()

  const organizationId = user.profile?.organization_id

  const { data: posts } = await supabase
    .from('news_posts')
    .select('id, title, content, created_at, is_published')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog / News</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage news posts for your members.
          </p>
        </div>
      </div>

      <BlogManagement initialPosts={posts || []} />
    </div>
  )
}

