'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, Share2, ThumbsUp } from 'lucide-react'
import { getSiteUrl } from '@/lib/url'

interface Props {
  postId: string
  postTitle?: string
  sharePath?: string
}

interface PostComment {
  id: string
  content: string
  author_name: string | null
  created_at: string
  parent_comment_id: string | null
  like_count: number
  user_has_liked: boolean
}

interface ReactionUser {
  user_id: string
  full_name?: string | null
}

export default function BlogReactions({ postId, postTitle = 'Fundflow Blog', sharePath }: Props) {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [count, setCount] = useState(0)
  const [hasReacted, setHasReacted] = useState(false)
  const [commentCount, setCommentCount] = useState(0)
  const [comments, setComments] = useState<PostComment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)
  const [recentLikers, setRecentLikers] = useState<ReactionUser[]>([])
  const canUseNativeShare =
    typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const [replyFor, setReplyFor] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  const getShareUrl = () => {
    const path = sharePath || `/member/blog#post-${postId}`
    return `${getSiteUrl()}${path}`
  }

  const loadComments = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error: commentError } = await supabase
        .from('news_post_comments')
        .select('id, content, author_name, created_at, parent_comment_id, reactions:news_comment_reactions(user_id)')
        .eq('post_id', postId)
        .eq('is_visible', true)
        .order('created_at', { ascending: true })
        .limit(100)

      if (commentError) throw commentError

      const mapped: PostComment[] = (data || []).map((row: any) => {
        const reactions = (row.reactions || []) as { user_id: string }[]
        const like_count = reactions.length
        const user_has_liked = !!(user && reactions.some((r) => r.user_id === user.id))
        return {
          id: row.id,
          content: row.content,
          author_name: row.author_name,
          created_at: row.created_at,
          parent_comment_id: row.parent_comment_id,
          like_count,
          user_has_liked,
        }
      })

      setComments(mapped)
    } catch (e: any) {
      setError(e.message || 'Unable to load comments')
    }
  }

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const supabase = createClient()

        const {
          data: { user },
        } = await supabase.auth.getUser()

        const { count: totalCount } = await supabase
          .from('news_post_reactions')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)

        const { count: totalComments } = await supabase
          .from('news_post_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)
          .eq('is_visible', true)

        let reacted = false
        if (user) {
          const { data: existing } = await supabase
            .from('news_post_reactions')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .maybeSingle()
          reacted = !!existing
        }

        if (!cancelled) {
          setCount(totalCount || 0)
          setHasReacted(reacted)
          setCommentCount(totalComments || 0)
        }

        // Load a small preview of who liked (best-effort; depends on DB relationships/columns)
        try {
          const { data: likerRows } = await supabase
            .from('news_post_reactions')
            .select('user_id, users:users(full_name)')
            .eq('post_id', postId)
            .order('created_at', { ascending: false })
            .limit(5)

          if (!cancelled && Array.isArray(likerRows)) {
            const mapped = likerRows.map((row: any) => ({
              user_id: row.user_id,
              full_name: row.users?.full_name ?? null,
            }))
            setRecentLikers(mapped)
          }
        } catch {
          // If the join isn't available, skip showing names.
          if (!cancelled) setRecentLikers([])
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Unable to load reactions')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [postId])

  useEffect(() => {
    if (!showComments) return
    loadComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments, postId])

  const handleToggle = async () => {
    setError(null)
    setUpdating(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('You need to be signed in to react.')
        return
      }

      // Helper to refresh the global like count from the database
      const refreshCount = async () => {
        const { count: latestCount } = await supabase
          .from('news_post_reactions')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId)
        setCount(latestCount || 0)
      }

      if (hasReacted) {
        const { error: deleteError } = await supabase
          .from('news_post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)

        if (deleteError) throw deleteError

        setHasReacted(false)
        await refreshCount()
      } else {
        const { error: insertError } = await supabase
          .from('news_post_reactions')
          .insert({ post_id: postId, user_id: user.id })

        if (insertError) throw insertError

        setHasReacted(true)
        await refreshCount()
      }
    } catch (e: any) {
      setError(e.message || 'Unable to update reaction')
    } finally {
      setUpdating(false)
    }
  }

  const handleAddComment = async () => {
    const content = commentText.trim()
    if (!content) return

    setError(null)
    setCommenting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('You need to be signed in to comment.')
        return
      }

      const fallbackName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email ||
        'Member'

      const { data, error: insertError } = await supabase
        .from('news_post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
          author_name: fallbackName,
        })
        .select('id, content, author_name, created_at')
        .single()

      if (insertError) throw insertError

      setComments((prev) => [data as PostComment, ...prev])
      setCommentCount((c) => c + 1)
      setCommentText('')
      setShowComments(true)
    } catch (e: any) {
      setError(e.message || 'Unable to post comment')
    } finally {
      setCommenting(false)
    }
  }

  const handleToggleCommentLike = async (commentId: string) => {
    setError(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('You need to be signed in to react.')
        return
      }

      const comment = comments.find((c) => c.id === commentId)
      if (!comment) return

      const currentlyLiked = comment.user_has_liked

      if (currentlyLiked) {
        const { error: delError } = await supabase
          .from('news_comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
        if (delError) throw delError
      } else {
        const { error: insError } = await supabase
          .from('news_comment_reactions')
          .insert({ comment_id: commentId, user_id: user.id })
        if (insError) throw insError
      }

      const { count: latestCount } = await supabase
        .from('news_comment_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId)

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                user_has_liked: !currentlyLiked,
                like_count: latestCount || 0,
              }
            : c,
        ),
      )
    } catch (e: any) {
      setError(e.message || 'Unable to update comment reaction')
    }
  }

  const handleAddReply = async (parentId: string) => {
    const content = replyText.trim()
    if (!content) return

    setError(null)
    setCommenting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('You need to be signed in to reply.')
        return
      }

      const fallbackName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        user.email ||
        'Member'

      const { data, error: insertError } = await supabase
        .from('news_post_comments')
        .insert({
          post_id: postId,
          parent_comment_id: parentId,
          user_id: user.id,
          content,
          author_name: fallbackName,
        })
        .select('id, content, author_name, created_at, parent_comment_id')
        .single()

      if (insertError) throw insertError

      const newComment: PostComment = {
        id: data.id,
        content: data.content,
        author_name: data.author_name,
        created_at: data.created_at,
        parent_comment_id: data.parent_comment_id,
        like_count: 0,
        user_has_liked: false,
      }

      setComments((prev) => [...prev, newComment])
      setCommentCount((c) => c + 1)
      setReplyText('')
      setReplyFor(null)
      setShowComments(true)
    } catch (e: any) {
      setError(e.message || 'Unable to post reply')
    } finally {
      setCommenting(false)
    }
  }

  const handleShare = async (platform: 'native' | 'copy' | 'x' | 'facebook' | 'linkedin' | 'whatsapp') => {
    const shareUrl = getShareUrl()
    const encodedUrl = encodeURIComponent(shareUrl)
    const text = encodeURIComponent(`${postTitle}`)
    const combined = encodeURIComponent(`${postTitle} ${shareUrl}`)

    try {
      if (platform === 'native' && navigator.share) {
        await navigator.share({ title: postTitle, text: postTitle, url: shareUrl })
        setShareFeedback('Shared successfully')
      } else if (platform === 'copy') {
        await navigator.clipboard.writeText(shareUrl)
        setShareFeedback('Link copied')
      } else if (platform === 'x') {
        window.open(`https://twitter.com/intent/tweet?text=${combined}`, '_blank', 'noopener,noreferrer')
      } else if (platform === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank', 'noopener,noreferrer')
      } else if (platform === 'linkedin') {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, '_blank', 'noopener,noreferrer')
      } else if (platform === 'whatsapp') {
        window.open(`https://wa.me/?text=${text}%20${encodedUrl}`, '_blank', 'noopener,noreferrer')
      }
    } catch (e: any) {
      setError(e.message || 'Unable to share this post')
    } finally {
      setShareMenuOpen(false)
      if (platform !== 'x' && platform !== 'facebook' && platform !== 'linkedin' && platform !== 'whatsapp') {
        setTimeout(() => setShareFeedback(null), 2500)
      }
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading || updating}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            hasReacted
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
          } disabled:opacity-60`}
        >
          <ThumbsUp
            className={`h-3.5 w-3.5 ${
              hasReacted ? 'fill-blue-600 text-blue-600' : 'text-gray-500'
            }`}
          />
          <span>{hasReacted ? 'Liked' : 'Like'}</span>
          <span className="text-[11px] text-gray-400">· {count}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span>Comment</span>
          <span className="text-[11px] text-gray-400">· {commentCount}</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShareMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share</span>
          </button>

          {shareMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-gray-200 bg-white shadow-xl z-30 overflow-hidden">
              {/* Header */}
              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                <p className="text-[11px] font-semibold text-gray-700">Share post</p>
                <p className="text-[11px] text-gray-400 truncate">
                  {postTitle}
                </p>
              </div>

              {/* Options */}
              <div className="py-1">
                {canUseNativeShare && (
                  <button
                    type="button"
                    onClick={() => handleShare('native')}
                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold">
                      ↑
                    </span>
                    <span className="text-gray-800 font-medium">Share via device</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleShare('copy')}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-700 text-[11px] font-bold">
                    ⧉
                  </span>
                  <div className="flex flex-col">
                    <span className="text-gray-800 font-medium">Copy link</span>
                    <span className="text-[10px] text-gray-400">Copy to share anywhere</span>
                  </div>
                </button>

                <div className="mt-1 border-t border-gray-100" />

                <button
                  type="button"
                  onClick={() => handleShare('whatsapp')}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 text-[11px] font-bold">
                    WA
                  </span>
                  <span className="text-gray-800 font-medium">Share to WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare('facebook')}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-[11px] font-bold">
                    f
                  </span>
                  <span className="text-gray-800 font-medium">Share to Facebook</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare('x')}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-bold">
                    X
                  </span>
                  <span className="text-gray-800 font-medium">Share to X (Twitter)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare('linkedin')}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-[11px] font-bold">
                    in
                  </span>
                  <span className="text-gray-800 font-medium">Share to LinkedIn</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {shareFeedback && (
        <p className="text-[11px] text-green-600">{shareFeedback}</p>
      )}

      {count > 0 && (
        <p className="text-[11px] text-gray-500">
          {recentLikers.length > 0
            ? (() => {
                const names = recentLikers
                  .map((u) => u.full_name)
                  .filter(Boolean) as string[]
                if (names.length === 0) return `${count} like${count === 1 ? '' : 's'}`
                const preview = names.slice(0, 2).join(', ')
                const extra = Math.max(0, count - names.length)
                return extra > 0
                  ? `Liked by ${preview} and ${extra} other${extra === 1 ? '' : 's'}`
                  : `Liked by ${preview}`
              })()
            : `${count} like${count === 1 ? '' : 's'}`}
        </p>
      )}

      {showComments && (() => {
        const topLevel = comments.filter((c) => !c.parent_comment_id)
        const repliesByParent = comments.reduce<Record<string, PostComment[]>>((acc, c) => {
          if (c.parent_comment_id) {
            acc[c.parent_comment_id] = acc[c.parent_comment_id] || []
            acc[c.parent_comment_id].push(c)
          }
          return acc
        }, {})

        return (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={commenting || !commentText.trim()}
                className="rounded-md bg-primary-600 text-white px-3 py-2 text-xs font-medium hover:bg-primary-700 disabled:opacity-60"
              >
                {commenting ? 'Posting...' : 'Post'}
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {topLevel.length === 0 ? (
                <p className="text-[11px] text-gray-500">No comments yet. Be the first to comment.</p>
              ) : (
                topLevel.map((comment) => (
                  <div key={comment.id} className="rounded-md border border-gray-200 bg-white px-3 py-2 text-[11px]">
                    <p className="font-semibold text-gray-700">{comment.author_name || 'Member'}</p>
                    <p className="text-xs text-gray-700 mt-1 whitespace-pre-line">{comment.content}</p>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-500">
                      <button
                        type="button"
                        onClick={() => handleToggleCommentLike(comment.id)}
                        className="inline-flex items-center gap-1 hover:text-blue-600"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        <span>{comment.user_has_liked ? 'Unlike' : 'Like'} · {comment.like_count}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyFor(comment.id)
                          setReplyText('')
                        }}
                        className="inline-flex items-center gap-1 hover:text-blue-600"
                      >
                        <MessageCircle className="h-3 w-3" />
                        <span>Reply</span>
                      </button>
                    </div>

                    {replyFor === comment.id && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddReply(comment.id)}
                          disabled={commenting || !replyText.trim()}
                          className="rounded-md bg-primary-600 text-white px-3 py-1 text-[11px] font-medium hover:bg-primary-700 disabled:opacity-60"
                        >
                          {commenting ? 'Posting...' : 'Reply'}
                        </button>
                      </div>
                    )}

                    {repliesByParent[comment.id] && (
                      <div className="mt-2 space-y-1 pl-3 border-l border-gray-200">
                        {repliesByParent[comment.id].map((reply) => (
                          <div key={reply.id} className="rounded-md bg-gray-50 px-2 py-1.5">
                            <p className="font-semibold text-gray-700">{reply.author_name || 'Member'}</p>
                            <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-line">{reply.content}</p>
                            <div className="mt-0.5 flex items-center gap-3 text-[11px] text-gray-500">
                              <button
                                type="button"
                                onClick={() => handleToggleCommentLike(reply.id)}
                                className="inline-flex items-center gap-1 hover:text-blue-600"
                              >
                                <ThumbsUp className="h-3 w-3" />
                                <span>{reply.user_has_liked ? 'Unlike' : 'Like'} · {reply.like_count}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })()}

      {error && (
        <span className="block text-[11px] text-red-500 truncate">
          {error}
        </span>
      )}
    </div>
  )
}

