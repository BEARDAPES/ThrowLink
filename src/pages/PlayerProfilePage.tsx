import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { PlayerProfileCard } from '../components/PlayerProfileCard'
import type { EventListItem } from '../components/EventListSection'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export function PlayerProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({ request_count: 0, total_mobilized: 0, participation_count: 0 })
  const [events, setEvents] = useState<EventListItem[]>([])
  const [myUpcomingEvents, setMyUpcomingEvents] = useState<EventListItem[]>([])
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
      const isOwnerNow = user?.id === profileData.id
      setIsOwner(isOwnerNow)

      const [{ data: proStatsData }, { data: fanStatsData }] = await Promise.all([
        supabase.rpc('pro_stats', { target_pro_id: profileData.id }),
        supabase.rpc('fan_stats', { target_user_id: profileData.id }),
      ])

      setStats({
        request_count: proStatsData?.[0]?.request_count ?? 0,
        total_mobilized: proStatsData?.[0]?.total_mobilized ?? 0,
        participation_count: fanStatsData?.[0]?.participation_count ?? 0,
      })

      if (profileData.is_pro) {
        const { data: offersData } = await supabase
          .from('event_offers')
          .select('events(id, event_title, event_start_at, status)')
          .eq('pro_id', profileData.id)
          .eq('offer_status', 'accepted')

        const items: EventListItem[] = (offersData ?? [])
          .map((o) => o.events)
          .filter((e): e is NonNullable<typeof e> => !!e && (e.status === 'published' || e.status === 'completed'))
          .map((e) => ({ id: e.id, title: e.event_title, startAt: e.event_start_at, status: e.status }))
        setEvents(items)
      }

      // is_proに関わらず、本人が見ているときだけ「参加予定のイベント」を取得する。
      if (isOwnerNow) {
        const { data: reservationsData } = await supabase
          .from('reservations')
          .select('events(id, event_title, event_start_at, status)')
          .eq('user_id', profileData.id)
          .in('status', ['confirmed', 'waitlisted'])

        const upcoming: EventListItem[] = (reservationsData ?? [])
          .map((r) => r.events)
          .filter((e): e is NonNullable<typeof e> => !!e && e.status === 'published')
          .map((e) => ({ id: e.id, title: e.event_title, startAt: e.event_start_at, status: e.status }))
        setMyUpcomingEvents(upcoming)
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
      events={events}
      myUpcomingEvents={myUpcomingEvents}
      isOwner={isOwner}
      onSignOut={handleSignOut}
    />
  )
}
