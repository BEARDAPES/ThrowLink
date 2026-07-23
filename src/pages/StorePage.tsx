import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { supabase } from '../lib/supabase'
import { StoreProfileCard, type StaffMember } from '../components/StoreProfileCard'
import type { EventListItem } from '../components/EventListSection'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type StoreRow = Database['public']['Tables']['stores']['Row']

export function StorePage() {
  const { slug } = useParams<{ slug: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [store, setStore] = useState<StoreRow | null>(null)
  const [events, setEvents] = useState<EventListItem[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
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

      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('id', profileData.id)
        .maybeSingle()
      setStore(storeData)

      const { data: { user } } = await supabase.auth.getUser()
      setIsOwner(user?.id === profileData.id)

      const { data: eventsData } = await supabase
        .from('events')
        .select('id, event_title, event_start_at, status')
        .eq('store_id', profileData.id)
        .in('status', ['published', 'completed'])

      setEvents(
        (eventsData ?? []).map((e) => ({ id: e.id, title: e.event_title, startAt: e.event_start_at, status: e.status }))
      )

      // 在籍中のスタッフ一覧(店舗の公開ページ用、ADMIN情報は含めない)
      const { data: staffRows } = await supabase
        .from('store_staff')
        .select('player_id')
        .eq('store_id', profileData.id)
        .eq('status', 'active')

      const staffIds = (staffRows ?? []).map((s) => s.player_id)
      if (staffIds.length > 0) {
        const { data: staffProfiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, slug, players(is_pro)')
          .in('id', staffIds)
        setStaff(
          (staffProfiles ?? []).map((p) => ({
            id: p.id,
            displayName: p.display_name,
            avatarUrl: p.avatar_url,
            slug: p.slug,
            isPro: p.players?.is_pro ?? false,
          }))
        )
      }

      setStatus('ready')
    }

    load(slug)
  }, [slug])

  if (status === 'loading') return null

  if (status === 'not-found' || !profile) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-chalk font-tl-sans">
        <p>この店舗ページは見つかりませんでした。</p>
      </div>
    )
  }

  return <StoreProfileCard profile={profile} store={store} events={events} staff={staff} isOwner={isOwner} />
}
