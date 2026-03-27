import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import BlogReactions from '@/components/member/BlogReactions'

interface MemberBlogPageProps {
  searchParams?: {
    page?: string
  }
}

export default async function MemberBlogPage({ searchParams }: MemberBlogPageProps) {
  const supabase = await createClient()

  const pageSize = 5
  const page = Math.max(1, Number(searchParams?.page ?? '1') || 1)

  const { count: totalCount } = await supabase
    .from('news_posts')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true)

  const totalPages = totalCount ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1
  const currentPage = Math.min(page, totalPages)
  const from = (currentPage - 1) * pageSize
  const to = from + pageSize - 1

  const { data: posts } = await supabase
    .from('news_posts')
    .select('id, title, content, created_at, author_name, image_url')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .range(from, to)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
        <p className="text-sm text-gray-500 mt-1">
          Latest news and updates from your organization
        </p>
      </div>

      {(!posts || posts.length === 0) ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-500">
          No news has been posted yet. Please check back later.
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post) => (
              <article
                key={post.id}
                id={`post-${post.id}`}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4 space-y-1">
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    {post.image_url && (
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.image_url}
                          alt={post.title || 'Blog image'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h2 className="text-base font-semibold text-gray-900">
                          {post.title}
                        </h2>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {format(new Date(post.created_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      {post.author_name && (
                        <p className="text-[11px] text-gray-500 mb-2">
                          By {post.author_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-3">
                    {post.content}
                  </p>
                  <BlogReactions
                    postId={post.id}
                    postTitle={post.title}
                    sharePath={`/member/blog#post-${post.id}`}
                  />
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <a
                href={currentPage > 1 ? `/member/blog?page=${currentPage - 1}` : '#'}
                aria-disabled={currentPage === 1}
                className={`px-3 py-1.5 text-sm rounded-md border ${
                  currentPage === 1
                    ? 'cursor-not-allowed border-gray-200 text-gray-300'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </a>
              <span className="text-xs text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <a
                href={currentPage < totalPages ? `/member/blog?page=${currentPage + 1}` : '#'}
                aria-disabled={currentPage === totalPages}
                className={`px-3 py-1.5 text-sm rounded-md border ${
                  currentPage === totalPages
                    ? 'cursor-not-allowed border-gray-200 text-gray-300'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </a>
            </div>
          )}
        </>
      )}
    </div>
  )
}
