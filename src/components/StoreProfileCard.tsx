import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { FaXTwitter, FaInstagram, FaYoutube, FaTiktok } from 'react-icons/fa6'
import { EventListSection, type EventListItem } from './EventListSection'
import { StarWatchButtons } from './StarWatchButtons'
import { StoreManagementMenu } from './StoreManagementMenu'
import { MonthCalendar, type CalendarMarker } from './MonthCalendar'
import { supabase } from '../lib/supabase'
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

interface StoreProfileCardProps {
  profile: Profile
  store: StoreRow | null
  events: EventListItem[]
  staff: StaffMember[]
  isOwner?: boolean
}

type SnsLink = { platform: string; url: string }

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

export function StoreProfileCard({ profile, store, events, staff, isOwner }: StoreProfileCardProps) {
  const initials = profile.display_name.trim().slice(0, 2) || '?'
  const snsLinks = parseSnsLinks(profile.sns_links)
  const atmosphereTags = Array.isArray(store?.atmosphere_tags) ? (store.atmosphere_tags as string[]) : []
  const openNow = store ? isOpenNow(store.business_open_time, store.business_close_time) : null

  const now = new Date()

  // イベントカレンダー
  const [evYear, setEvYear] = useState(now.getFullYear())
  const [evMonth, setEvMonth] = useState(now.getMonth())
  const eventMarkers: CalendarMarker[] = events
    .filter((e) => (e.status === 'published' || e.status === 'completed') && e.startAt)
    .map((e) => ({ date: e.startAt!.slice(0, 10), kind: 'event' as const }))

  // スタッフ稼働カレンダー(選択中のスタッフの公開予定を表示)
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(staff[0]?.id ?? null)
  const [staYear, setStaYear] = useState(now.getFullYear())
  const [staMonth, setStaMonth] = useState(now.getMonth())
  const [staffSchedule, setStaffSchedule] = useState<ScheduleEntry[]>([])
  const [staffMarkers, setStaffMarkers] = useState<CalendarMarker[]>([])

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

  return (
    <div className="min-h-screen bg-ink font-tl-sans flex justify-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-[560px] animate-tl-rise text-left">
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

        <div className="flex gap-4 items-start mb-7">
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

        {(store?.address || store?.phone_number || (store?.business_open_time && store?.business_close_time)) && (
          <div className="space-y-3.5 mb-7">
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
        )}

        {profile.bio_text && (
          <div className="mb-10 pb-8 border-b border-brass/35">
            <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-2.5 leading-none">お店について</p>
            <p className="text-[15px] leading-loose text-chalk">{profile.bio_text}</p>
          </div>
        )}

        {staff.length > 0 && (
          <div className="mb-10">
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
            <MonthCalendar markers={staffMarkers} year={staYear} month={staMonth} onPrevMonth={() => (staMonth === 0 ? (setStaYear((y) => y - 1), setStaMonth(11)) : setStaMonth((m) => m - 1))} onNextMonth={() => (staMonth === 11 ? (setStaYear((y) => y + 1), setStaMonth(0)) : setStaMonth((m) => m + 1))} />
            <div className="mt-4 space-y-2">
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
          </div>
        )}

        {events.length > 0 && (
          <div className="mb-10">
            <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">イベントカレンダー</p>
            <MonthCalendar markers={eventMarkers} year={evYear} month={evMonth} onPrevMonth={() => (evMonth === 0 ? (setEvYear((y) => y - 1), setEvMonth(11)) : setEvMonth((m) => m - 1))} onNextMonth={() => (evMonth === 11 ? (setEvYear((y) => y + 1), setEvMonth(0)) : setEvMonth((m) => m + 1))} />
            <div className="mt-4 space-y-2">
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
          </div>
        )}

        {staff.length > 0 && (
          <div className="mb-10">
            <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">所属スタッフ</p>
            <div>
              {staff.map((s) => (
                <Link key={s.id} to={s.slug ? `/players/${s.slug}` : '#'} className="flex items-center gap-3 py-3 border-b border-brass/20 hover:text-dart-red transition-colors">
                  <span className="w-9 h-9 rounded-full border border-brass/50 overflow-hidden shrink-0 bg-ink-2 flex items-center justify-center font-display text-xs text-chalk">
                    {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" /> : s.displayName.trim().slice(0, 2)}
                  </span>
                  <span className="flex-1 min-w-0 text-chalk text-sm truncate">{s.displayName}</span>
                  {s.isPro && (
                    <span className="font-tl-mono text-[10px] font-semibold tracking-widest text-ink bg-dart-red px-1.5 py-0.5 rounded-sm shrink-0">PRO</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        <EventListSection events={events} />

        {snsLinks.length > 0 && (
          <div className="border-t border-brass/35 mb-10">
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
        )}
      </div>
    </div>
  )
}
