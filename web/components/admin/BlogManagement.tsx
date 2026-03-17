'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { FileText, Loader2 } from 'lucide-react'

interface BlogPost {
  id: string
  title: string
  content: string
  created_at: string
  is_published: boolean
  image_url?: string | null
}

interface Props {
  initialPosts: BlogPost[]
}

export default function BlogManagement({ initialPosts }: Props) {
  const router = useRouter()
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts)
  const [loading, setLoading] = useState(false)
  const [savingToggleId, setSavingToggleId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_published: true,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
                <div
                  key={post.id}
                  className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 text-gray-400" />
                    <div>
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

                  <button
                    type="button"
                    onClick={() => handleTogglePublished(post)}
                    disabled={savingToggleId === post.id}
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${
                      post.is_published
                        ? 'border border-green-100 bg-green-50 text-green-700'
                        : 'border border-gray-200 bg-gray-50 text-gray-600'
                    } disabled:opacity-60`}
                  >
                    {savingToggleId === post.id && (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    )}
                    {post.is_published ? 'Published' : 'Draft'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

