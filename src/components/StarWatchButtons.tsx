import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface StarWatchButtonsProps {
  targetId: string
  isOwner: boolean
}

const pillClass = 'flex items-center gap-1.5 h-8 px-2.5 border rounded-sm font-tl-mono text-xs leading-none transition-colors'

export function StarWatchButtons({ targetId, isOwner }: StarWatchButtonsProps) {
  const [starCount, setStarCount] = useState(0)
  const [watchCount, setWatchCount] = useState(0)
  const [isStarred, setIsStarred] = useState(false)
  const [isWatched, setIsWatched] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const [{ count: stars }, { count: watches }] = await Promise.all([
      supabase.from('profile_follows').select('*', { count: 'exact', head: true }).eq('target_id', targetId).eq('kind', 'star'),
      supabase.from('profile_follows').select('*', { count: 'exact', head: true }).eq('target_id', targetId).eq('kind', 'watch'),
    ])
    setStarCount(stars ?? 0)
    setWatchCount(watches ?? 0)

    if (!isOwner) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profile_follows')
          .select('kind')
          .eq('follower_id', user.id)
          .eq('target_id', targetId)
        const kinds = new Set((data ?? []).map((d) => d.kind))
        setIsStarred(kinds.has('star'))
        setIsWatched(kinds.has('watch'))
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [targetId, isOwner])

  async function toggle(kind: 'star' | 'watch') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const active = kind === 'star' ? isStarred : isWatched
    if (active) {
      await supabase.from('profile_follows').delete().eq('follower_id', user.id).eq('target_id', targetId).eq('kind', kind)
    } else {
      await supabase.from('profile_follows').insert({ follower_id: user.id, target_id: targetId, kind })
    }
    await load()
  }

  if (loading) return null

  return (
    <>
      <button
        type="button"
        disabled={isOwner}
        onClick={() => toggle('star')}
        title="Star"
        className={`${pillClass} ${
          isStarred ? 'border-dart-red text-chalk bg-dart-red/15' : 'border-brass/40 text-chalk-dim'
        } ${isOwner ? 'cursor-default' : 'hover:border-dart-red hover:text-chalk cursor-pointer'}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill={isStarred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isStarred ? 0 : 1.6}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        {starCount}
      </button>
      <button
        type="button"
        disabled={isOwner}
        onClick={() => toggle('watch')}
        title="Watch"
        className={`${pillClass} ${
          isWatched ? 'border-dart-red text-chalk bg-dart-red/15' : 'border-brass/40 text-chalk-dim'
        } ${isOwner ? 'cursor-default' : 'hover:border-dart-red hover:text-chalk cursor-pointer'}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {watchCount}
      </button>
    </>
  )
}
