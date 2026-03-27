'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, MessageCircle } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  content: string
  created_at: string
  is_published: boolean
  image_url?: string | null
}

interface BlogComment {
  id: string
  content: string
  author_name: string | null
  created_at: string
  is_visible: boolean
  parent_comment_id: string | null
}

interface Props {
  initialPosts: BlogPost[]
}

export default function BlogManagement({ initialPosts }: Props) {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts)
  const [loading, setLoading] = useState(false)
  const [savingToggleId, setSavingToggleId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_published: true,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Comment moderation state
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
  const [comments, setComments] = useState<BlogComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [togglingCommentId, setTogglingCommentId] = useState<string | null>(null)
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({})

  // Load comment counts for all posts
  useEffect(() => {
    const loadCounts = async () => {
      const supabase = createClient()
      const counts: Record<string, number> = {}
      for (const post of posts) {
        const { count } = await supabase
          .from('news_post_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
        counts[post.id] = count || 0
      }
      setCommentCounts(counts)
    }
    loadCounts()
  }, [posts])

  const loadComments = useCallback(async (postId: string) => {
    setLoadingComments(true)
    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('news_post_comments')
        .select('id, content, author_name, created_at, is_visible, parent_comment_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
        .limit(200)

      if (fetchError) throw fetchError
      setComments((data || []) as BlogComment[])
    } catch (err: any) {
      setError(err.message || 'Failed to load comments')
    } finally {
      setLoadingComments(false)
    }
  }, [])

  const handleExpandComments = async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null)
      setComments([])
      return
    }
    setExpandedPostId(postId)
    await loadComments(postId)
  }

  const handleToggleCommentVisibility = async (comment: BlogComment) => {
    setTogglingCommentId(comment.id)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('news_post_comments')
        .update({ is_visible: !comment.is_visible })
        .eq('id', comment.id)

      if (updateError) throw updateError

      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id ? { ...c, is_visible: !comment.is_visible } : c
        )
      )
      setSuccess(comment.is_visible ? 'Comment hidden' : 'Comment visible')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to update comment')
    } finally {
      setTogglingCommentId(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('users')
        .select('organization_id, full_name')
        .eq('id', user.id)
        .single()

      if (!profile?.organization_id) {
        throw new Error('Organization not found for this admin')
      }

      // Optional: upload image to Supabase Storage (bucket: blog-images)
      let imageUrl: string | null = null
      if (imageFile) {
        const extension = imageFile.name.split('.').pop() || 'jpg'
        const filePath = `org-${profile.organization_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from('blog-images')
          .upload(filePath, imageFile, {
            contentType: imageFile.type || 'image/jpeg',
            upsert: false,
          })

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`)
        }

        const { data: publicData } = supabase.storage
          .from('blog-images')
          .getPublicUrl(filePath)

        imageUrl = publicData?.publicUrl || null
      }

      const { data: inserted, error: insertError } = await supabase
        .from('news_posts')
        .insert({
          organization_id: profile.organization_id,
          title: formData.title.trim(),
          content: formData.content.trim(),
          is_published: formData.is_published,
          author_name: profile.full_name || user.email,
          image_url: imageUrl,
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(insertError.message)
      }

      setPosts((prev) => [inserted as BlogPost, ...prev])
      setFormData({ title: '', content: '', is_published: true })
      setImageFile(null)
      setSuccess('Post created successfully')
      setTimeout(() => setSuccess(null), 4000)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePublished = async (post: BlogPost) => {
    setError(null)
    setSuccess(null)
    setSavingToggleId(post.id)
    try {
      const supabase = createClient()
      const { data: updated, error: updateError } = await supabase
        .from('news_posts')
        .update({ is_published: !post.is_published })
        .eq('id', post.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? (updated as BlogPost) : p)),
      )
      setSuccess('Post updated')
      setTimeout(() => setSuccess(null), 3000)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to update post')
    } finally {
      setSavingToggleId(null)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    setError(null)
    setSuccess(null)
    setDeletingId(postId)

    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('news_posts')
        .delete()
        .eq('id', postId)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId))
      if (expandedPostId === postId) {
        setExpandedPostId(null)
        setComments([])
      }
      setSuccess('Post deleted successfully')
      setTimeout(() => setSuccess(null), 3000)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete post')
    } finally {
      setDeletingId(null)
    }
  }

  const topLevelComments = comments.filter((c) => !c.parent_comment_id)
  const repliesByParent = comments.reduce<Record<string, BlogComment[]>>((acc, c) => {
    if (c.parent_comment_id) {
      acc[c.parent_comment_id] = acc[c.parent_comment_id] || []
      acc[c.parent_comment_id].push(c)
    }
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Create New Post
            </h2>

            {error && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                {success}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, title: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                  placeholder="Enter a short headline"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Content *
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, content: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                  placeholder="Write your news or update here"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Image (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setImageFile(file)
                  }}
                  className="mt-1 block w-full text-xs text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-700 hover:file:bg-primary-100"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Recommended: JPG or PNG, under 2MB.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) =>
                      setFormData((f) => ({
                        ...f,
                        is_published: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>Publish immediately</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Post
              </button>
            </form>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Existing Posts
            </h2>
          </div>

          {posts.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
              No posts yet. Create your first news post on the left.
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y">
              {posts.map((post) => (
                <div key={post.id} className="p-4">
                  {/* Post row */}
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      {post.image_url ? (
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {post.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                          {post.content}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {format(new Date(post.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Comment count & expand */}
                      <button
                        type="button"
                        onClick={() => handleExpandComments(post.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          expandedPostId === post.id
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        <span>{commentCounts[post.id] || 0}</span>
                        {expandedPostId === post.id ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePublished(post)}
                        disabled={savingToggleId === post.id || deletingId === post.id}
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${
                          post.is_published
                            ? 'border border-green-100 bg-green-50 text-green-700'
                            : 'border border-gray-200 bg-gray-50 text-gray-600'
                        } disabled:opacity-60 transition-colors hover:opacity-80`}
                      >
                        {savingToggleId === post.id && (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        )}
                        {post.is_published ? 'Published' : 'Draft'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(post.id)}
                        disabled={deletingId === post.id || savingToggleId === post.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                        title="Delete post"
                      >
                        {deletingId === post.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Comments section (expanded) */}
                  {expandedPostId === post.id && (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold text-gray-700">
                          Comments ({commentCounts[post.id] || 0})
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3 text-green-500" /> Visible
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <EyeOff className="h-3 w-3 text-red-400" /> Hidden
                          </span>
                        </div>
                      </div>

                      {loadingComments ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                      ) : topLevelComments.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">
                          No comments on this post yet.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {topLevelComments.map((comment) => (
                            <div key={comment.id}>
                              <div
                                className={`rounded-md border px-3 py-2 text-xs ${
                                  comment.is_visible
                                    ? 'border-gray-200 bg-white'
                                    : 'border-red-100 bg-red-50/50'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-700">
                                      {comment.author_name || 'Member'}
                                    </p>
                                    <p className="text-gray-600 mt-0.5 whitespace-pre-line">
                                      {comment.content}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                      {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCommentVisibility(comment)}
                                    disabled={togglingCommentId === comment.id}
                                    className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium border transition-all ${
                                      comment.is_visible
                                        ? 'border-green-200 bg-green-50 text-green-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                                        : 'border-red-200 bg-red-50 text-red-600 hover:border-green-200 hover:bg-green-50 hover:text-green-700'
                                    } disabled:opacity-50`}
                                    title={comment.is_visible ? 'Hide this comment' : 'Show this comment'}
                                  >
                                    {togglingCommentId === comment.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : comment.is_visible ? (
                                      <>
                                        <Eye className="h-3 w-3" />
                                        <span>Visible</span>
                                      </>
                                    ) : (
                                      <>
                                        <EyeOff className="h-3 w-3" />
                                        <span>Hidden</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Replies */}
                              {repliesByParent[comment.id] && (
                                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                                  {repliesByParent[comment.id].map((reply) => (
                                    <div
                                      key={reply.id}
                                      className={`rounded-md border px-2.5 py-1.5 text-[11px] ${
                                        reply.is_visible
                                          ? 'border-gray-200 bg-white'
                                          : 'border-red-100 bg-red-50/50'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          <p className="font-semibold text-gray-700">
                                            {reply.author_name || 'Member'}
                                          </p>
                                          <p className="text-gray-600 mt-0.5 whitespace-pre-line">
                                            {reply.content}
                                          </p>
                                          <p className="text-[10px] text-gray-400 mt-0.5">
                                            {format(new Date(reply.created_at), 'MMM dd, yyyy HH:mm')}
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleCommentVisibility(reply)}
                                          disabled={togglingCommentId === reply.id}
                                          className={`flex-shrink-0 p-1 rounded-full transition-all ${
                                            reply.is_visible
                                              ? 'text-green-600 hover:text-red-500 hover:bg-red-50'
                                              : 'text-red-500 hover:text-green-600 hover:bg-green-50'
                                          } disabled:opacity-50`}
                                          title={reply.is_visible ? 'Hide reply' : 'Show reply'}
                                        >
                                          {togglingCommentId === reply.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : reply.is_visible ? (
                                            <Eye className="h-3 w-3" />
                                          ) : (
                                            <EyeOff className="h-3 w-3" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
