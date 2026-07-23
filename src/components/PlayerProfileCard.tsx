import { useState } from 'react'
import { Link } from 'react-router'
import { FaXTwitter, FaInstagram, FaYoutube, FaTiktok } from 'react-icons/fa6'
import { EventListSection, type EventListItem } from './EventListSection'
import { MonthCalendar, type CalendarMarker } from './MonthCalendar'
import { getDartsLiveInfo, getPhoenixInfo, DARTSLIVE_COLORS } from '../lib/ratings'
import { PRO_ONLY_STATUS_TAGS } from '../lib/statusTags'
import { StarWatchButtons } from './StarWatchButtons'
import { PlayerManagementMenu } from './PlayerManagementMenu'
import { parseLocalDate } from '../lib/datetime'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']
type PlayerWithHomeShop = PlayerRow & { home_shop: { display_name: string; slug: string | null } | null }
type ScheduleEntry = Database['public']['Tables']['player_schedule_entries']['Row']

interface PlayerProfileCardProps {
  profile: Profile
  player: PlayerWithHomeShop | null
  events: EventListItem[]
  myUpcomingEvents: EventListItem[]
  employedStores: { display_name: string; slug: string | null }[]
  upcomingSchedule: ScheduleEntry[]
  calendarMarkers: CalendarMarker[]
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

function directoryLabel(url: string): string {
  if (url.includes('livescore.japanprodarts.jp')) return '選手名鑑（JAPAN）'
  if (url.includes('member.prodarts.jp')) return '選手名鑑（Perfect）'
  return '選手名鑑'
}

function faviconUrl(url: string): string {
  try {
    const { hostname } = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
  } catch {
    return ''
  }
}

function formatShortDateWithWeekday(iso: string): string {
  const d = new Date(iso)
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday})`
}

function formatDateRange(start: string, end: string): string {
  const s = parseLocalDate(start)
  const e = parseLocalDate(end)
  const fmt = (d: Date) => `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
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

export function PlayerProfileCard({
  profile,
  player,
  events,
  myUpcomingEvents,
  employedStores,
  upcomingSchedule,
  calendarMarkers,
  isOwner,
}: PlayerProfileCardProps) {
  const initials = profile.display_name.trim().slice(0, 2) || '?'
  const snsLinks = parseSnsLinks(profile.sns_links)
  const isPro = player?.is_pro ?? false

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())

  function prevMonth() {
    if (calMonth === 0) {
      setCalYear((y) => y - 1)
      setCalMonth(11)
    } else {
      setCalMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (calMonth === 11) {
      setCalYear((y) => y + 1)
      setCalMonth(0)
    } else {
      setCalMonth((m) => m + 1)
    }
  }

  const nextEvent = [...events]
    .filter((e) => e.status === 'published')
    .sort((a, b) => new Date(a.startAt ?? 0).getTime() - new Date(b.startAt ?? 0).getTime())[0]

  const dlInfo = player?.darts_live_rating ? getDartsLiveInfo(player.darts_live_rating) : null
  const phxInfo = player?.phoenix_rating ? getPhoenixInfo(player.phoenix_rating) : null
  const hasRatingRow = dlInfo || phxInfo
  const achievements = Array.isArray(player?.achievements) ? (player.achievements as string[]) : []
  const statusTags = Array.isArray(player?.status_tags) ? (player.status_tags as string[]) : []

  const links = [
    ...snsLinks.map((link) => ({
      key: link.platform,
      href: link.url,
      label: SNS_LABELS[link.platform] ?? link.platform,
      icon: SNS_ICONS[link.platform] ?? null,
    })),
    ...(isPro && player?.player_directory_url
      ? [
          {
            key: 'directory',
            href: player.player_directory_url,
            label: directoryLabel(player.player_directory_url),
            icon: <img src={faviconUrl(player.player_directory_url)} alt="" className="w-full h-full object-contain" />,
          },
        ]
      : []),
  ]

  // カレンダー月連動リスト用: イベント(単日)+自己申告の予定(期間あり)を統合し、
  // 「表示中の月と、開始〜終了の範囲が重なっているか」で判定する
  // (開始日だけで判定すると、月をまたぐ予定が正しく出てこないため)。
  const rawCalendarItems = [
    ...events
      .filter((e) => (e.status === 'published' || e.status === 'completed') && e.startAt)
      .map((e) => {
        const d = e.startAt!.slice(0, 10)
        return { key: `evt-${e.id}`, startDate: d, endDate: d, dot: 'bg-brass', dateLabel: formatDateRange(d, d), title: e.title, isPast: e.status === 'completed' }
      }),
    ...upcomingSchedule.map((entry) => ({
      key: `sch-${entry.id}`,
      startDate: entry.start_date,
      endDate: entry.end_date,
      dot: 'bg-dart-red',
      dateLabel: formatDateRange(entry.start_date, entry.end_date),
      title: entry.reason ?? '',
      isPast: entry.end_date < today,
    })),
  ]

  console.log('calYear/calMonth:', calYear, calMonth)
  console.log('rawCalendarItems:', rawCalendarItems)

  const calendarListItems = rawCalendarItems
    .filter((item) => {
      const monthStart = new Date(calYear, calMonth, 1)
      const monthEnd = new Date(calYear, calMonth + 1, 0)
      const itemStart = parseLocalDate(item.startDate)
      const itemEnd = parseLocalDate(item.endDate)
      return itemStart <= monthEnd && itemEnd >= monthStart
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

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
              <PlayerManagementMenu isPro={isPro} />
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

            <div className="flex items-center flex-wrap gap-1.5 mt-2">
              {isPro && (
                <span className="font-tl-mono text-[10px] font-semibold tracking-widest text-ink bg-dart-red px-1.5 py-0.5 rounded-sm leading-none">
                  PRO
                </span>
              )}
              {player?.location && <span className="font-tl-mono text-xs text-chalk-dim leading-none">{player.location}</span>}
              {isPro && (
                <span className="font-tl-mono text-[11px] text-chalk border border-brass rounded-sm px-2 py-0.5 inline-flex items-center gap-1.5 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: nextEvent ? '#3B6B4E' : '#B7AF9C' }} />
                  次の出演: {nextEvent?.startAt ? formatShortDateWithWeekday(nextEvent.startAt) : '未定'}
                </span>
              )}
            </div>

            {statusTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {statusTags.map((tag) => {
                  const isProTag = (PRO_ONLY_STATUS_TAGS as readonly string[]).includes(tag)
                  return (
                    <span
                      key={tag}
                      className={`font-tl-mono text-[10px] rounded-full px-2.5 py-0.5 border leading-none ${
                        isProTag ? 'border-dart-red text-chalk' : 'border-brass/50 text-chalk-dim'
                      }`}
                    >
                      {tag}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {(employedStores.length > 0 || player?.home_shop || player?.home_shop_text || player?.sake_rating != null || hasRatingRow || player?.years_playing != null || player?.dart_setup || achievements.length > 0) && (
          <div className="space-y-3.5 mb-7">
            {employedStores.length > 0 && (
              <div>
                <div className="font-tl-mono text-[10px] text-chalk-dim tracking-wide mb-1 leading-none">勤務店舗</div>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {employedStores.map((s) => (
                    <Link
                      key={s.slug}
                      to={`/stores/${s.slug}`}
                      className="text-[13px] text-chalk underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
                    >
                      {s.display_name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(player?.home_shop || player?.home_shop_text) && (
              <div>
                <div className="font-tl-mono text-[10px] text-chalk-dim tracking-wide mb-1 leading-none">ホームショップ</div>
                {player?.home_shop ? (
                  <Link
                    to={`/stores/${player.home_shop.slug}`}
                    className="text-[13px] text-chalk underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
                  >
                    {player.home_shop.display_name}
                  </Link>
                ) : (
                  <div className="text-[13px] text-chalk">{player?.home_shop_text}</div>
                )}
              </div>
            )}

            {player?.sake_rating != null && (
              <div>
                <div className="font-tl-mono text-[10px] text-chalk-dim tracking-wide mb-1 leading-none">酒レーティング</div>
                <div className="flex items-center gap-[3px] flex-wrap">
                  {Array.from({ length: 18 }, (_, i) => (
                    <span
                      key={i}
                      className="w-[11px] h-[11px] rounded-sm"
                      style={{
                        background: i < player.sake_rating! ? DARTSLIVE_COLORS[i] : 'transparent',
                        border: i < player.sake_rating! ? 'none' : '1px solid rgba(176,141,70,0.3)',
                      }}
                    />
                  ))}
                  <span className="ml-2 font-tl-mono text-xs text-chalk">{player.sake_rating} / 18</span>
                </div>
              </div>
            )}

            {hasRatingRow && (
              <div>
                <div className="font-tl-mono text-[10px] text-chalk-dim tracking-wide mb-1 leading-none">レーティング</div>
                <div className="flex flex-wrap gap-2">
                  {dlInfo && (
                    <span
                      className="font-tl-mono text-[11px] font-semibold px-2.5 py-1 rounded-sm leading-none"
                      style={{ background: dlInfo.color, color: '#1A1200' }}
                    >
                      DARTSLIVE {player!.darts_live_rating} ・ {dlInfo.flight}
                    </span>
                  )}
                  {phxInfo && (
                    <span
                      className="font-tl-mono text-[11px] font-semibold px-2.5 py-1 rounded-sm leading-none"
                      style={{ background: phxInfo.color, color: '#1A1200' }}
                    >
                      PHOENIX {player!.phoenix_rating} ・ {phxInfo.flight}
                    </span>
                  )}
                </div>
              </div>
            )}

            {player?.years_playing != null && (
              <div>
                <div className="font-tl-mono text-[10px] text-chalk-dim tracking-wide mb-1 leading-none">ダーツ歴</div>
                <div className="text-[13px] text-chalk">{player.years_playing}年</div>
              </div>
            )}

            {player?.dart_setup && (
              <div>
                <div className="font-tl-mono text-[10px] text-chalk-dim tracking-wide mb-1 leading-none">使用セッティング</div>
                <div className="text-[13px] text-chalk">{player.dart_setup}</div>
              </div>
            )}

            {achievements.length > 0 && (
              <div>
                <div className="font-tl-mono text-[10px] text-chalk-dim tracking-wide mb-1 leading-none">実績</div>
                <ul className="list-none">
                  {achievements.map((a, i) => (
                    <li key={i} className="relative text-[13px] text-chalk py-0.5 pl-3.5">
                      <span className="absolute left-0 top-[9px] w-[5px] h-[5px] rounded-full bg-brass" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {profile.bio_text && (
          <div className="mb-10 pb-8 border-b border-brass/35">
            <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-2.5 leading-none">自己紹介</p>
            <p className="text-[15px] leading-loose text-chalk">{profile.bio_text}</p>
          </div>
        )}

        {(calendarMarkers.length > 0 || upcomingSchedule.length > 0 || events.length > 0) && (
          <div className="mb-10">
            <MonthCalendar markers={calendarMarkers} year={calYear} month={calMonth} onPrevMonth={prevMonth} onNextMonth={nextMonth} />
            <div className="mt-4 space-y-2">
              {calendarListItems.map((item) => (
                <div key={item.key} className="flex items-center gap-2 py-2 border-b border-brass/20">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.dot}`} />
                  <span className="font-tl-mono text-xs text-chalk-dim shrink-0">{item.dateLabel}</span>
                  <span className="text-chalk text-sm truncate flex-1">{item.title}</span>
                  <span
                    className={`font-tl-mono text-[9px] shrink-0 px-1.5 py-0.5 rounded-sm ${
                      item.isPast ? 'text-chalk-dim border border-brass/40' : 'text-ink bg-safe-green'
                    }`}
                  >
                    {item.isPast ? 'END' : 'UPCOMING'}
                  </span>
                </div>
              ))}
              {calendarListItems.length === 0 && <p className="text-xs text-chalk-dim">この月の予定はありません。</p>}
            </div>
          </div>
        )}

        {isPro &&
          (() => {
            const scheduleItems = [
              ...events
                .filter((e) => e.status === 'published' && e.startAt)
                .map((e) => ({
                  key: `evt-${e.id}`,
                  sortDate: e.startAt!.slice(0, 10),
                  dateLabel: formatDateRange(e.startAt!.slice(0, 10), e.startAt!.slice(0, 10)),
                  title: e.title,
                  venue: e.venue,
                  href: `/events/${e.id}`,
                })),
              ...upcomingSchedule
                .filter((entry) => entry.end_date >= today)
                .map((entry) => ({
                  key: `sch-${entry.id}`,
                  sortDate: entry.start_date,
                  dateLabel: formatDateRange(entry.start_date, entry.end_date),
                  title: entry.reason || '予定あり',
                  venue: undefined as string | undefined,
                  href: undefined as string | undefined,
                })),
            ].sort((a, b) => a.sortDate.localeCompare(b.sortDate))

            if (scheduleItems.length === 0) return null

            return (
              <div className="mb-10">
                <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">スケジュール</p>
                <div>
                  {scheduleItems.map((item) =>
                    item.href ? (
                      <Link
                        key={item.key}
                        to={item.href}
                        className="flex items-center justify-between gap-2.5 py-3 px-2.5 -mx-2.5 rounded-sm border-b border-brass/20 hover:bg-ink-2 transition-colors group"
                      >
                        <div className="min-w-0">
                          <div className="font-tl-mono text-xs text-chalk-dim tracking-wide">{item.dateLabel}</div>
                          <div className="text-chalk text-sm mt-0.5 truncate">{item.title}</div>
                          {item.venue && <div className="font-tl-mono text-xs text-chalk-dim mt-0.5 truncate">{item.venue}</div>}
                        </div>
                        <span className="text-brass text-lg shrink-0 group-hover:text-dart-red transition-colors">›</span>
                      </Link>
                    ) : (
                      <div key={item.key} className="py-3 border-b border-brass/20">
                        <div className="font-tl-mono text-xs text-chalk-dim tracking-wide">{item.dateLabel}</div>
                        <div className="text-chalk text-sm mt-0.5">{item.title}</div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          })()}

        {isOwner && myUpcomingEvents.length > 0 && (
          <div className="mb-10">
            <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3 leading-none">参加予定のイベント</p>
            <EventListSection events={myUpcomingEvents} />
          </div>
        )}

        {links.length > 0 && (
          <div className="border-t border-brass/35 mb-10">
            {links.map((link) => (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 py-3 border-b border-brass/20 text-chalk hover:text-dart-red transition-colors group"
              >
                <span className="w-5 h-5 flex items-center justify-center shrink-0 text-chalk-dim text-lg group-hover:text-dart-red transition-colors">
                  {link.icon}
                </span>
                <span className="font-tl-mono text-sm tracking-wide flex-1">{link.label}</span>
                <span className="text-chalk-dim text-xs group-hover:text-dart-red transition-colors">↗</span>
              </a>
            ))}
          </div>
        )}

        {!isOwner && (
          <div className="mt-4 pt-6 border-t border-brass/35 text-xs text-chalk-dim text-center leading-relaxed">
            店舗の方へ: 出演のご依頼はプロフィール所有者からの承認制です。
          </div>
        )}
      </div>
    </div>
  )
}
