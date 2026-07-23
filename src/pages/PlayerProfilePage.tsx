import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { supabase } from '../lib/supabase'
import { PlayerProfileCard } from '../components/PlayerProfileCard'
import { addDaysToDateString } from '../lib/datetime'
import type { EventListItem } from '../components/EventListSection'
import type { CalendarMarker } from '../components/MonthCalendar'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']
type PlayerWithHomeShop = PlayerRow & { home_shop: { display_name: string; slug: string | null } | null }
type ScheduleEntry = Database['public']['Tables']['player_schedule_entries']['Row']

function buildVenue(store: { display_name: string; stores: { address: string | null } | null } | null): string | undefined {
  if (!store) return undefined
  return [store.display_name, store.stores?.address].filter(Boolean).join(' ・ ')
}

export function PlayerProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [player, setPlayer] = useState<PlayerWithHomeShop | null>(null)
  const [events, setEvents] = useState<EventListItem[]>([])
  const [myUpcomingEvents, setMyUpcomingEvents] = useState<EventListItem[]>([])
  const [employedStores, setEmployedStores] = useState<{ display_name: string; slug: string | null }[]>([])
  const [upcomingSchedule, setUpcomingSchedule] = useState<ScheduleEntry[]>([])
  const [calendarMarkers, setCalendarMarkers] = useState<CalendarMarker[]>([])
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

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', profileData.id)
        .maybeSingle()

      if (playerError) console.error('players fetch error:', playerError)

      let playerWithShop: PlayerWithHomeShop | null = playerData ? { ...playerData, home_shop: null } : null

      if (playerData?.home_shop_id) {
        const { data: shopData } = await supabase
          .from('profiles')
          .select('display_name, slug')
          .eq('id', playerData.home_shop_id)
          .maybeSingle()
        if (playerWithShop) playerWithShop.home_shop = shopData ?? null
      }

      setPlayer(playerWithShop)

      const { data: { user } } = await supabase.auth.getUser()
      const isOwnerNow = user?.id === profileData.id
      setIsOwner(isOwnerNow)

      const { data: staffData } = await supabase
        .from('store_staff')
        .select('store_id')
        .eq('player_id', profileData.id)
        .eq('status', 'active')

      const staffStoreIds = (staffData ?? []).map((s) => s.store_id)
      if (staffStoreIds.length > 0) {
        const { data: staffStoresData } = await supabase
          .from('profiles')
          .select('display_name, slug')
          .in('id', staffStoreIds)
        setEmployedStores(staffStoresData ?? [])
      }

      if (playerData?.is_pro) {
        const { data: offersData } = await supabase
          .from('event_offers')
          .select('events(id, event_title, event_start_at, status, profiles!events_store_id_fkey(display_name, stores(address)))')
          .eq('pro_id', profileData.id)
          .eq('offer_status', 'accepted')

        const items: EventListItem[] = (offersData ?? [])
          .map((o) => o.events)
          .filter((e): e is NonNullable<typeof e> => !!e && (e.status === 'published' || e.status === 'completed'))
          .map((e) => ({
            id: e.id,
            title: e.event_title,
            startAt: e.event_start_at,
            status: e.status,
            venue: buildVenue(e.profiles),
          }))
        setEvents(items)
      }

      if (isOwnerNow) {
        const { data: reservationsData } = await supabase
          .from('reservations')
          .select('events(id, event_title, event_start_at, status, profiles!events_store_id_fkey(display_name, stores(address)))')
          .eq('user_id', profileData.id)
          .in('status', ['confirmed', 'waitlisted'])

        const upcoming: EventListItem[] = (reservationsData ?? [])
          .map((r) => r.events)
          .filter((e): e is NonNullable<typeof e> => !!e && e.status === 'published')
          .map((e) => ({
            id: e.id,
            title: e.event_title,
            startAt: e.event_start_at,
            status: e.status,
            venue: buildVenue(e.profiles),
          }))
        setMyUpcomingEvents(upcoming)
      }

      const { data: scheduleData } = await supabase
        .from('player_schedule_entries')
        .select('*')
        .eq('player_id', profileData.id)
        .eq('visibility', 'public')
        .order('start_date', { ascending: true })
      setUpcomingSchedule(scheduleData ?? [])

      // カレンダー用: 公開予定+承諾済みイベントの日付一覧をマージする。
      const markers: CalendarMarker[] = []
      for (const entry of scheduleData ?? []) {
        let cursor = entry.start_date
        while (cursor <= entry.end_date) {
          markers.push({ date: cursor, kind: 'schedule' })
          cursor = addDaysToDateString(cursor, 1)
        }
      }
      if (playerData?.is_pro) {
        const { data: acceptedOffers } = await supabase
          .from('event_offers')
          .select('events(event_start_at, event_end_at)')
          .eq('pro_id', profileData.id)
          .eq('offer_status', 'accepted')
        for (const o of acceptedOffers ?? []) {
          if (!o.events?.event_start_at) continue
          markers.push({ date: o.events.event_start_at.slice(0, 10), kind: 'event' })
        }
      }
      setCalendarMarkers(markers)

      setStatus('ready')
    }

    load(slug)
  }, [slug])

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
      player={player}
      events={events}
      myUpcomingEvents={myUpcomingEvents}
      employedStores={employedStores}
      upcomingSchedule={upcomingSchedule}
      calendarMarkers={calendarMarkers}
      isOwner={isOwner}
    />
  )
}
