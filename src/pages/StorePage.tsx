import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { StoreProfileCard } from '../components/StoreProfileCard'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export function StorePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
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
        .eq('role', 'store')
        .maybeSingle()

      if (error || !profileData) {
        setStatus('not-found')
        return
      }

      setProfile(profileData)

      const { data: { user } } = await supabase.auth.getUser()
      setIsOwner(user?.id === profileData.id)

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
        <p>この店舗ページは見つかりませんでした。</p>
      </div>
    )
  }

  return <StoreProfileCard profile={profile} isOwner={isOwner} onSignOut={handleSignOut} />
}
