import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { supabase } from '../lib/supabase'
import { StoreProfileCard, type StaffMember } from '../components/StoreProfileCard'
import type { StoreAffiliation } from '../components/AttendanceControls'
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
  const [myAffiliation, setMyAffiliation] = useState<StoreAffiliation | null>(null)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found'>('loading')
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false)

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
      setViewerId(user?.id ?? null)
      setIsOwner(user?.id === profileData.id)

      const { data: eventsData } = await supabase
        .from('events')
        .select('id, event_title, event_start_at, status')
        .eq('store_id', profileData.id)
        .in('status', ['published', 'completed'])

      setEvents(
        (eventsData ?? []).map((e) => ({ id: e.id, title: e.event_title, startAt: e.event_start_at, status: e.status }))
      )

      const { data: staffRows } = await supabase
        .from('store_staff')
        .select('player_id, is_admin')
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

      // 訪問者自身が、この店の在籍中スタッフかどうか(出退勤ボタン表示の判定用)。
      // 店舗オーナー本人は対象外。
      if (user && user.id !== profileData.id && staffIds.includes(user.id)) {
        setMyAffiliation({
          storeId: profileData.id,
          storeName: profileData.display_name,
          businessCloseTime: storeData?.business_close_time ?? null,
        })
      } else {
        setMyAffiliation(null)
      }

      const myStaffRow = (staffRows ?? []).find((s) => s.player_id === user?.id)
      setViewerIsAdmin(user?.id === profileData.id || !!myStaffRow?.is_admin)

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

  return (
    <StoreProfileCard
      profile={profile}
      store={store}
      events={events}
      staff={staff}
      isOwner={isOwner}
      myAffiliation={myAffiliation}
      viewerId={viewerId}
      viewerIsAdmin={viewerIsAdmin}
    />
  )
}
