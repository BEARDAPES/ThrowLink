import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { PlayerProfileCard } from '../components/PlayerProfileCard'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export function PlayerProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({ request_count: 0, total_mobilized: 0 })
  const [isOwner, setIsOwner] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found'>('loading')

  useEffect(() => {
    if (!slug) return

    async function load(slugValue: string) {
      setStatus('loading')

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('slug', slugValue)
        .maybeSingle()

      if (error || !profileData) {
        setStatus('not-found')
        return
      }

      setProfile(profileData)

      const { data: { user } } = await supabase.auth.getUser()
      setIsOwner(user?.id === profileData.id)

      const { data: statsData } = await supabase.rpc('pro_stats', {
        target_pro_id: profileData.id,
      })

      if (statsData && statsData.length > 0) {
        setStats({
          request_count: statsData[0].request_count,
          total_mobilized: statsData[0].total_mobilized,
        })
      }

      setStatus('ready')
    }

    load(slug)
  }, [slug])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/sign-in')
  }

  if (status === 'loading') return null

  if (status === 'not-found' || !profile) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-chalk font-tl-sans">
        <p>このプロフィールは見つかりませんでした。</p>
      </div>
    )
  }

  return (
    <PlayerProfileCard
      profile={profile}
      stats={stats}
      isOwner={isOwner}
      onSignOut={handleSignOut}
    />
  )
}
