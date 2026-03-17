'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ThumbsUp } from 'lucide-react'

interface Props {
  postId: string
}

export default function BlogReactions({ postId }: Props) {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [count, setCount] = useState(0)
  const [hasReacted, setHasReacted] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      if (hasReacted) {
        const { error: deleteError } = await supabase
          .from('news_post_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)

        if (deleteError) throw deleteError

        setHasReacted(false)
        setCount((c) => Math.max(0, c - 1))
      } else {
        const { error: insertError } = await supabase
          .from('news_post_reactions')
          .insert({ post_id: postId, user_id: user.id })

        if (insertError) throw insertError

        setHasReacted(true)
        setCount((c) => c + 1)
      }
    } catch (e: any) {
      setError(e.message || 'Unable to update reaction')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="mt-3 flex items-center justify-between">
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
      {error && (
        <span className="ml-2 text-[11px] text-red-500 truncate max-w-[60%]">
          {error}
        </span>
      )}
    </div>
  )
}

