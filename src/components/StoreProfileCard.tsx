import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { FaXTwitter, FaInstagram, FaYoutube, FaTiktok } from 'react-icons/fa6'
import { EventListSection, type EventListItem } from './EventListSection'
import { StarWatchButtons } from './StarWatchButtons'
import { StoreManagementMenu } from './StoreManagementMenu'
import { MonthCalendar, type CalendarMarker } from './MonthCalendar'
import { AttendanceControls, type StoreAffiliation } from './AttendanceControls'
import { supabase } from '../lib/supabase'
import { clockIn, clockOut } from '../lib/attendance'
import { addDaysToDateString, parseLocalDate } from '../lib/datetime'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type StoreRow = Database['public']['Tables']['stores']['Row']
type ScheduleEntry = Database['public']['Tables']['player_schedule_entries']['Row']

export interface StaffMember {
  id: string
  displayName: string
  avatarUrl: string | null
  slug: string | null
  isPro: boolean
}

interface PresentStaffInfo {
  source: 'attendance' | 'event'
  untilTime: string | null
}

interface StoreProfileCardProps {
  profile: Profile
  store: StoreRow | null
  events: EventListItem[]
  staff: StaffMember[]
  isOwner?: boolean
  myAffiliation: StoreAffiliation | null
  viewerId: string | null
  viewerIsAdmin: boolean
}

type SnsLink = { platform: string; url: string }
type TabKey = 'info' | 'events' | 'staff' | 'sns'

const SNS_ICONS: Record<string, React.ReactNode> = {
  x: <FaXTwitter />,
  instagram: <FaInstagram />,
  youtube: <FaYoutube />,
  tiktok: <FaTiktok />,
}
const SNS_LABELS: Record<string, string> = {
  x: 'X',
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
}

function parseSnsLinks(raw: Profile['sns_links']): SnsLink[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is SnsLink =>
      typeof item === 'object' && item !== null && 'platform' in item && 'url' in item && !!(item as SnsLink).url
  )
}

function formatTime(t: string | null): string {
  if (!t) return ''
  return t.slice(0, 5)
}

function isOpenNow(open: string | null, close: string | null): boolean | null {
  if (!open || !close) return null
  const now = new Date()
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = open.split(':').map(Number)
  const [ch, cm] = close.split(':').map(Number)
  const openMin = oh * 60 + om
  let closeMin = ch * 60 + cm
  if (closeMin <= openMin) closeMin += 24 * 60
  const adjustedNow = minutesNow < openMin ? minutesNow + 24 * 60 : minutesNow
  return adjustedNow >= openMin && adjustedNow < closeMin
}

function formatDateRange(start: string, end: string): string {
  const currentYear = new Date().getFullYear()
  const s = parseLocalDate(start)
  const e = parseLocalDate(end)
  const fmt = (d: Date) =>
    d.getFullYear() !== currentYear ? `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}` : `${d.getMonth() + 1}/${d.getDate()}`
  return start === end ? fmt(s) : `${fmt(s)} 〜 ${fmt(e)}`
}

const DART_RING = `conic-gradient(
  var(--color-cream) 0deg 22.5deg, var(--color-ink-2) 22.5deg 45deg,
  var(--color-cream) 45deg 67.5deg, var(--color-ink-2) 67.5deg 90deg,
  var(--color-cream) 90deg 112.5deg, var(--color-ink-2) 112.5deg 135deg,
  var(--color-cream) 135deg 157.5deg, var(--color-ink-2) 157.5deg 180deg,
  var(--color-cream) 180deg 202.5deg, var(--color-ink-2) 202.5deg 225deg,
  var(--color-cream) 225deg 247.5deg, var(--color-ink-2) 247.5deg 270deg,
  var(--color-cream) 270deg 292.5deg, var(--color-ink-2) 292.5deg 315deg,
  var(--color-cream) 315deg 337.5deg, var(--color-ink-2) 337.5deg 360deg
)`

const TAB_LABELS: Record<TabKey, string> = {
  info: '店舗情報',
  events: 'イベント',
  staff: 'スタッフ',
  sns: 'SNS',
}

// タブジャンプ時の着地位置と、スクロール終端の位置、両方で共有する余白。
// 値を変えたいときはここ1箇所だけ直せばよい。
const TAB_JUMP_OFFSET = 24

export function StoreProfileCard({ profile, store, events, staff, isOwner, myAffiliation, viewerId, viewerIsAdmin }: StoreProfileCardProps) {
  const initials = profile.display_name.trim().slice(0, 2) || '?'
  const snsLinks = parseSnsLinks(profile.sns_links)
  const atmosphereTags = Array.isArray(store?.atmosphere_tags) ? (store.atmosphere_tags as string[]) : []
  const openNow = store ? isOpenNow(store.business_open_time, store.business_close_time) : null

  const hasInfoSection = !!(store?.address || store?.phone_number || (store?.business_open_time && store?.business_close_time))
  const hasEventsSection = events.length > 0
  const hasStaffSection = staff.length > 0
  const hasSnsSection = snsLinks.length > 0

  const availableTabs: TabKey[] = [
    ...(hasInfoSection ? (['info'] as const) : []),
    ...(hasEventsSection ? (['events'] as const) : []),
    ...(hasStaffSection ? (['staff'] as const) : []),
    ...(hasSnsSection ? (['sns'] as const) : []),
  ]
  const lastTabKey = availableTabs[availableTabs.length - 1]

  const now = new Date()

  const [evYear, setEvYear] = useState(now.getFullYear())
  const [evMonth, setEvMonth] = useState(now.getMonth())
  const eventMarkers: CalendarMarker[] = events
    .filter((e) => (e.status === 'published' || e.status === 'completed') && e.startAt)
    .map((e) => ({ date: e.startAt!.slice(0, 10), kind: 'event' as const }))

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(staff[0]?.id ?? null)
  const [staYear, setStaYear] = useState(now.getFullYear())
  const [staMonth, setStaMonth] = useState(now.getMonth())
  const [staffSchedule, setStaffSchedule] = useState<ScheduleEntry[]>([])
  const [staffMarkers, setStaffMarkers] = useState<CalendarMarker[]>([])
  const [navbarHeight, setNavbarHeight] = useState(66)
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(150)
  const [presentStaffInfo, setPresentStaffInfo] = useState<Record<string, PresentStaffInfo>>({})

  useEffect(() => {
    async function loadStaffSchedule() {
      if (!selectedStaffId) {
        setStaffSchedule([])
        setStaffMarkers([])
        return
      }
      const { data } = await supabase
        .from('player_schedule_entries')
        .select('*')
        .eq('player_id', selectedStaffId)
        .eq('visibility', 'public')
        .order('start_date', { ascending: true })
      setStaffSchedule(data ?? [])

      const markers: CalendarMarker[] = []
      for (const entry of data ?? []) {
        let cursor = entry.start_date
        while (cursor <= entry.end_date) {
          markers.push({ date: cursor, kind: 'schedule' })
          cursor = addDaysToDateString(cursor, 1)
        }
      }
      setStaffMarkers(markers)
    }
    loadStaffSchedule()
  }, [selectedStaffId])

  async function loadPresentStaff() {
    if (staff.length === 0) return
    const staffIds = staff.map((s) => s.id)
    const nowIso = new Date().toISOString()

    const { data: attendanceRows } = await supabase
      .from('store_staff_attendance_logs')
      .select('player_id')
      .eq('store_id', profile.id)
      .in('player_id', staffIds)
      .is('clocked_out_at', null)

    const { data: acceptedOffers } = await supabase
      .from('event_offers')
      .select('pro_id, event_id')
      .in('pro_id', staffIds)
      .eq('offer_status', 'accepted')

    const eventIds = (acceptedOffers ?? []).map((o) => o.event_id)
    const ongoingEndTimeByProId: Record<string, string> = {}

    if (eventIds.length > 0) {
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, event_end_at')
        .in('id', eventIds)
        .eq('store_id', profile.id)
        .lte('event_start_at', nowIso)
        .gte('event_end_at', nowIso)

      const endTimeByEventId = Object.fromEntries((eventsData ?? []).map((e) => [e.id, e.event_end_at]))
      for (const offer of acceptedOffers ?? []) {
        const endTime = endTimeByEventId[offer.event_id]
        if (endTime) {
          ongoingEndTimeByProId[offer.pro_id] = endTime
        }
      }
    }

    const info: Record<string, PresentStaffInfo> = {}
    for (const [proId, endTime] of Object.entries(ongoingEndTimeByProId)) {
      info[proId] = { source: 'event', untilTime: endTime }
    }
    for (const row of attendanceRows ?? []) {
      if (!info[row.player_id]) {
        info[row.player_id] = { source: 'attendance', untilTime: null }
      }
    }
    setPresentStaffInfo(info)
  }

  useEffect(() => {
    loadPresentStaff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staff, profile.id])

  async function toggleStaffAttendance(staffId: string) {
    if (presentStaffInfo[staffId]) {
      await clockOut(profile.id, staffId)
    } else {
      await clockIn(profile.id, staffId)
    }
    await loadPresentStaff()
  }

  const eventListItems = events
    .filter((e) => (e.status === 'published' || e.status === 'completed') && e.startAt)
    .filter((e) => {
      const d = new Date(e.startAt!)
      return d.getFullYear() === evYear && d.getMonth() === evMonth
    })
    .sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''))

  const staffListItems = staffSchedule
    .filter((entry) => {
      const monthStart = new Date(staYear, staMonth, 1)
      const monthEnd = new Date(staYear, staMonth + 1, 0)
      return parseLocalDate(entry.start_date) <= monthEnd && parseLocalDate(entry.end_date) >= monthStart
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  const condensedBarRef = useRef<HTMLDivElement>(null)
  const sectionRefs = {
    info: useRef<HTMLDivElement>(null),
    events: useRef<HTMLDivElement>(null),
    staff: useRef<HTMLDivElement>(null),
    sns: useRef<HTMLDivElement>(null),
  }
  const titleRowRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<TabKey | null>(availableTabs[0] ?? null)
  const [condensedTitleVisible, setCondensedTitleVisible] = useState(false)

  useEffect(() => {
    const condensedBar = condensedBarRef.current
    const titleRow = titleRowRef.current
    if (!condensedBar || !titleRow) return

    const navbarEl = document.querySelector('nav')
    const measuredNavbarHeight = navbarEl?.getBoundingClientRect().height ?? 66
    setNavbarHeight(measuredNavbarHeight)

    const stickThreshold = condensedBar.offsetTop - measuredNavbarHeight

    const collapsedHeaderHeight = condensedBar.getBoundingClientRect().height
    const titleRowExpandedHeight = titleRow.scrollHeight
    const headerHeight = measuredNavbarHeight + collapsedHeaderHeight + titleRowExpandedHeight
    setStickyHeaderHeight(headerHeight)

    function onScroll() {
      setCondensedTitleVisible(window.scrollY >= stickThreshold - 1)

      const spyPoint = condensedBar!.getBoundingClientRect().bottom
      let current: TabKey | null = null
      for (const key of availableTabs) {
        const el = sectionRefs[key].current
        if (el && el.getBoundingClientRect().top <= spyPoint + 40) current = key
      }
      if (current) setActiveTab(current)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTabs.join(',')])

  return (
    <div className="font-tl-sans px-6 pt-10 sm:pt-14">
      <div className="w-full max-w-[560px] mx-auto">
        <div className="animate-tl-rise text-left">
          <div className="flex justify-end items-center gap-2 mb-5">
            <StarWatchButtons targetId={profile.id} isOwner={!!isOwner} />
            {isOwner && (
              <>
                <Link
                  to="/me/edit"
                  title="編集する"
                  className="flex items-center justify-center w-8 h-8 border border-brass/40 rounded-sm text-chalk-dim hover:text-dart-red hover:border-dart-red transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </Link>
                <StoreManagementMenu />
              </>
            )}
          </div>

          {myAffiliation && viewerId && (
            <div className="mb-5">
              <AttendanceControls playerId={viewerId} stores={[myAffiliation]} />
            </div>
          )}

          <div className="flex gap-4 items-start mb-3.5">
            <div
              className="w-[110px] h-[110px] rounded-full p-1 border-2 border-brass flex items-center justify-center shrink-0"
              style={{ background: DART_RING }}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover border-2 border-dart-red" />
              ) : (
                <div className="w-full h-full rounded-full border-2 border-dart-red bg-ink-2 flex items-center justify-center font-display text-2xl font-semibold text-chalk leading-none">
                  {initials}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <h1 className="font-display text-2xl sm:text-[26px] font-bold uppercase tracking-wide text-chalk leading-[1.1]">
                {profile.display_name}
              </h1>

              {openNow !== null && (
                <div className="mt-2">
                  <span
                    className="inline-flex items-center gap-1.5 font-tl-mono text-[11px] rounded-sm px-2.5 py-0.5 leading-none"
                    style={{
                      color: 'var(--color-chalk)',
                      border: `1px solid ${openNow ? 'var(--color-safe-green)' : 'rgba(183,175,154,0.5)'}`,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: openNow ? 'var(--color-safe-green)' : 'var(--color-chalk-dim)' }} />
                    {openNow ? `営業中(〜${formatTime(store!.business_close_time)})` : '営業時間外'}
                  </span>
                </div>
              )}

              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                {store?.dartslive_shop_url && (
                  <a
                    href={store.dartslive_shop_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-tl-mono text-[10px] font-semibold px-2 py-0.5 rounded-sm leading-none"
                    style={{ background: '#E8720C', color: '#2A1200' }}
                  >
                    DARTSLIVE設置店 ↗
                  </a>
                )}
                {store?.phoenix_shop_url && (
                  <a
                    href={store.phoenix_shop_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-tl-mono text-[10px] font-semibold px-2 py-0.5 rounded-sm leading-none"
                    style={{ background: '#D6304A', color: '#2A0007' }}
                  >
                    PHOENIX設置店 ↗
                  </a>
                )}
                {store?.smoking_allowed != null && (
                  <span
                    title={store.smoking_allowed ? '喫煙可' : '禁煙'}
                    className="inline-flex items-center justify-center w-[22px] h-[22px] border border-brass/50 rounded-sm text-chalk-dim"
                  >
                    {store.smoking_allowed ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 17h14"/><path d="M2 21h18"/><path d="M18 13v-1a2 2 0 0 1 4 0v1"/><path d="M18 17v-1a2 2 0 0 1 4 0v1"/></svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 17h9"/><path d="M2 21h13"/><path d="m19 21-1-4"/><path d="M13 13v-1a2 2 0 0 1 4 0"/><path d="M2 2l20 20"/></svg>
                    )}
                  </span>
                )}
                {store?.parking_available != null && (
                  <span
                    title={store.parking_available ? '駐車場あり' : '駐車場なし'}
                    className="inline-flex items-center justify-center w-[22px] h-[22px] border border-brass/50 rounded-sm text-chalk-dim"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>
                  </span>
                )}
              </div>

              {atmosphereTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {atmosphereTags.map((tag) => (
                    <span key={tag} className="font-tl-mono text-[10px] rounded-full px-2.5 py-0.5 border border-brass/50 text-chalk-dim leading-none">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {Object.keys(presentStaffInfo).length > 0 && (
            <div className="border border-safe-green/60 rounded-sm px-3 py-2 mb-5">
              <p className="font-tl-mono text-[9px] text-safe-green tracking-wide mb-1.5">本日出勤中のスタッフ</p>
              <div className="flex flex-wrap gap-2.5">
                {staff
                  .filter((s) => presentStaffInfo[s.id])
                  .map((s) => {
                    const info = presentStaffInfo[s.id]
                    return (
                      <Link key={s.id} to={s.slug ? `/players/${s.slug}` : '#'} className="flex items-center gap-1.5 hover:text-dart-red transition-colors">
                        <span className="w-6 h-6 rounded-full border border-brass/50 overflow-hidden shrink-0 bg-ink-2 flex items-center justify-center font-display text-[9px] text-chalk">
                          {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" /> : s.displayName.trim().slice(0, 2)}
                        </span>
                        <span>
                          <span className="text-chalk text-xs leading-tight flex items-center gap-1.5">
                            {s.displayName}
                            {s.isPro && (
                              <span className="font-tl-mono text-[9px] font-semibold tracking-widest text-ink bg-dart-red px-1 py-0.5 rounded-sm">PRO</span>
                            )}
                          </span>
                          {info.source === 'event' && info.untilTime && (
                            <span className="font-tl-mono text-[10px] text-chalk-dim block">
                              〜{new Date(info.untilTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}まで出演
                            </span>
                          )}
                        </span>
                      </Link>
                    )
                  })}
              </div>
            </div>
          )}
        </div>

        {availableTabs.length > 0 && (
          <div
            ref={condensedBarRef}
            className="sticky z-40 bg-ink -mx-6 px-6 pt-2.5 border-b border-brass/35"
            style={{ top: navbarHeight, marginTop: '0.5rem' }}
          >
            <div
              ref={titleRowRef}
              className="flex items-center gap-2.5 overflow-hidden pb-2 transition-[max-height,opacity] duration-150 ease-out"
              style={condensedTitleVisible ? { maxHeight: 32, opacity: 1 } : { maxHeight: 0, opacity: 0 }}
            >
              <span className="w-[22px] h-[22px] rounded-full border border-brass overflow-hidden shrink-0 bg-ink-2">
                {profile.avatar_url && <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />}
              </span>
              <span className="font-display text-[13px] font-semibold uppercase tracking-wide text-chalk truncate">
                {profile.display_name}
              </span>
              {openNow !== null && (
                <span className="ml-auto pl-2.5 shrink-0 inline-flex items-center gap-1 font-tl-mono text-[10px] text-chalk-dim">
                  <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: openNow ? 'var(--color-safe-green)' : 'var(--color-chalk-dim)' }} />
                  {openNow ? '営業中' : '営業時間外'}
                </span>
              )}
            </div>
            <div className="flex">
              {availableTabs.map((tab) => (
                <a
                  key={tab}
                  href={`#${tab}`}
                  className={`font-tl-mono text-xs pb-2.5 mr-5 border-b-2 transition-colors ${
                    activeTab === tab ? 'text-chalk border-dart-red' : 'text-chalk-dim border-transparent hover:text-chalk'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="pt-8 text-left">
          {hasInfoSection && (
            <div
              id="info"
              ref={sectionRefs.info}
              className="mb-10"
              style={{
                scrollMarginTop: stickyHeaderHeight + TAB_JUMP_OFFSET,
                ...(lastTabKey === 'info' ? { minHeight: `calc(100vh - ${stickyHeaderHeight + TAB_JUMP_OFFSET}px)` } : {}),
              }}
            >
              <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">店舗情報</p>
              <div className="space-y-3.5">
                {store?.address && (
                  <div>
                    <div className="font-tl-mono text-[10px] text-chalk-dim tracking-wide mb-1 leading-none">住所</div>
                    <div className="text-[13px] text-chalk">{store.address}</div>
                    <div className="border border-brass/40 rounded-sm overflow-hidden mt-2">
                      <iframe
                        title="店舗地図"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(store.address)}&output=embed`}
                        className="w-full h-[160px] border-0"
                        loading="lazy"
                      />
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-center py-2 font-tl-mono text-[11px] text-chalk-dim hover:text-dart-red transition-colors border-t border-brass/30"
                      >
                        Googleマップで開く ↗
                      </a>
                    </div>
                  </div>
                )}
                {store?.phone_number && (
                  <div>
                    <div className="font-tl-mono text-[10px] text-chalk-dim tracking-wide mb-1 leading-none">電話番号</div>
                    <a href={`tel:${store.phone_number}`} className="text-[13px] text-chalk underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors">
                      {store.phone_number}
                    </a>
                  </div>
                )}
                {store?.business_open_time && store?.business_close_time && (
                  <div>
                    <div className="font-tl-mono text-[10px] text-chalk-dim tracking-wide mb-1 leading-none">営業時間</div>
                    <div className="text-[13px] text-chalk">
                      {formatTime(store.business_open_time)} 〜 {formatTime(store.business_close_time)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {profile.bio_text && (
            <div className="mb-10 pb-8 border-b border-brass/35">
              <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-2.5 leading-none">お店について</p>
              <p className="text-[15px] leading-loose text-chalk">{profile.bio_text}</p>
            </div>
          )}

          {hasEventsSection && (
            <div
              id="events"
              ref={sectionRefs.events}
              className="mb-10"
              style={{
                scrollMarginTop: stickyHeaderHeight + TAB_JUMP_OFFSET,
                ...(lastTabKey === 'events' ? { minHeight: `calc(100vh - ${stickyHeaderHeight + TAB_JUMP_OFFSET}px)` } : {}),
              }}
            >
              <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">イベントカレンダー</p>
              <MonthCalendar
                markers={eventMarkers}
                year={evYear}
                month={evMonth}
                onPrevMonth={() => (evMonth === 0 ? (setEvYear((y) => y - 1), setEvMonth(11)) : setEvMonth((m) => m - 1))}
                onNextMonth={() => (evMonth === 11 ? (setEvYear((y) => y + 1), setEvMonth(0)) : setEvMonth((m) => m + 1))}
              />
              <div className="mt-4 space-y-2 mb-6">
                {eventListItems.length === 0 ? (
                  <p className="text-xs text-chalk-dim">この月のイベントはありません。</p>
                ) : (
                  eventListItems.map((e) => (
                    <Link key={e.id} to={`/events/${e.id}`} className="flex items-center gap-2 py-2 border-b border-brass/20 hover:text-dart-red transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full bg-brass shrink-0" />
                      <span className="font-tl-mono text-xs text-chalk-dim shrink-0">
                        {new Date(e.startAt!).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}
                      </span>
                      <span className="text-chalk text-sm truncate">{e.title}</span>
                    </Link>
                  ))
                )}
              </div>
              <EventListSection events={events} />
            </div>
          )}

          {hasStaffSection && (
            <div
              id="staff"
              ref={sectionRefs.staff}
              className="mb-10"
              style={{
                scrollMarginTop: stickyHeaderHeight + TAB_JUMP_OFFSET,
                ...(lastTabKey === 'staff' ? { minHeight: `calc(100vh - ${stickyHeaderHeight + TAB_JUMP_OFFSET}px)` } : {}),
              }}
            >
              <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">スタッフ稼働カレンダー</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {staff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStaffId(s.id)}
                    className={`font-tl-mono text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                      selectedStaffId === s.id ? 'border-brass bg-ink-2 text-chalk' : 'border-brass/35 text-chalk-dim hover:border-brass'
                    }`}
                  >
                    {s.displayName}
                  </button>
                ))}
              </div>
              <MonthCalendar
                markers={staffMarkers}
                year={staYear}
                month={staMonth}
                onPrevMonth={() => (staMonth === 0 ? (setStaYear((y) => y - 1), setStaMonth(11)) : setStaMonth((m) => m - 1))}
                onNextMonth={() => (staMonth === 11 ? (setStaYear((y) => y + 1), setStaMonth(0)) : setStaMonth((m) => m + 1))}
              />
              <div className="mt-4 space-y-2 mb-6">
                {staffListItems.length === 0 ? (
                  <p className="text-xs text-chalk-dim">この月の不在予定はありません。</p>
                ) : (
                  staffListItems.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2 py-2 border-b border-brass/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-dart-red shrink-0" />
                      <span className="font-tl-mono text-xs text-chalk-dim shrink-0">{formatDateRange(entry.start_date, entry.end_date)}</span>
                      {entry.reason && <span className="text-chalk text-sm truncate">{entry.reason}</span>}
                    </div>
                  ))
                )}
              </div>

              <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">所属スタッフ</p>
              <div>
                {staff.map((s) => {
                  const isPresent = !!presentStaffInfo[s.id]
                  return (
                    <Link key={s.id} to={s.slug ? `/players/${s.slug}` : '#'} className="flex items-center gap-3 py-3 border-b border-brass/20 hover:text-dart-red transition-colors">
                      <span className="w-9 h-9 rounded-full border border-brass/50 overflow-hidden shrink-0 bg-ink-2 flex items-center justify-center font-display text-xs text-chalk">
                        {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" /> : s.displayName.trim().slice(0, 2)}
                      </span>
                      <span className="flex-1 min-w-0 text-chalk text-sm truncate">{s.displayName}</span>
                      {s.isPro && (
                        <span className="font-tl-mono text-[10px] font-semibold tracking-widest text-ink bg-dart-red px-1.5 py-0.5 rounded-sm shrink-0">PRO</span>
                      )}
                      {viewerIsAdmin ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleStaffAttendance(s.id)
                          }}
                          className={`font-tl-mono text-[10px] font-semibold px-2 py-1 rounded-sm shrink-0 border transition-colors ${
                            isPresent ? 'text-safe-green border-safe-green bg-safe-green/10' : 'text-chalk-dim border-brass/40'
                          }`}
                        >
                          {isPresent ? '出勤中' : '未出勤'}
                        </button>
                      ) : (
                        isPresent && (
                          <span className="font-tl-mono text-[10px] text-safe-green border border-safe-green/60 px-2 py-1 rounded-sm shrink-0">
                            出勤中
                          </span>
                        )
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {hasSnsSection && (
            <div
              id="sns"
              ref={sectionRefs.sns}
              className="mb-10"
              style={{
                scrollMarginTop: stickyHeaderHeight + TAB_JUMP_OFFSET,
                ...(lastTabKey === 'sns' ? { minHeight: `calc(100vh - ${stickyHeaderHeight + TAB_JUMP_OFFSET}px)` } : {}),
              }}
            >
              <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">SNS</p>
              <div className="border-t border-brass/35">
                {snsLinks.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 py-3 border-b border-brass/20 text-chalk hover:text-dart-red transition-colors group"
                  >
                    <span className="w-5 h-5 flex items-center justify-center shrink-0 text-chalk-dim text-lg group-hover:text-dart-red transition-colors">
                      {SNS_ICONS[link.platform]}
                    </span>
                    <span className="font-tl-mono text-sm tracking-wide flex-1">{SNS_LABELS[link.platform] ?? link.platform}</span>
                    <span className="text-chalk-dim text-xs group-hover:text-dart-red transition-colors">↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
