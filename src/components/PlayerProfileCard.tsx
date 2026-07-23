import { Link } from 'react-router'
import { FaXTwitter, FaInstagram, FaYoutube, FaTiktok } from 'react-icons/fa6'
import { EventListSection, type EventListItem } from './EventListSection'
import { getDartsLiveInfo, getPhoenixInfo, DARTSLIVE_COLORS } from '../lib/ratings'
import { PRO_ONLY_STATUS_TAGS } from '../lib/statusTags'
import { StarWatchButtons } from './StarWatchButtons'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']
type PlayerWithHomeShop = PlayerRow & { home_shop: { display_name: string; slug: string | null } | null }

interface PlayerProfileCardProps {
  profile: Profile
  player: PlayerWithHomeShop | null
  events: EventListItem[]
  myUpcomingEvents: EventListItem[]
  isOwner?: boolean
  onSignOut?: () => void
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

const footerLinkClass =
  'font-tl-mono text-xs text-chalk-dim tracking-wide underline decoration-brass/50 underline-offset-4 hover:text-chalk transition-colors'

export function PlayerProfileCard({ profile, player, events, myUpcomingEvents, isOwner, onSignOut }: PlayerProfileCardProps) {
  const initials = profile.display_name.trim().slice(0, 2) || '?'
  const snsLinks = parseSnsLinks(profile.sns_links)
  const isPro = player?.is_pro ?? false

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

  return (
    <div className="min-h-screen bg-ink font-tl-sans flex justify-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-[560px] animate-tl-rise text-left">
        <div className="flex justify-end items-center gap-2 mb-5">
          <StarWatchButtons targetId={profile.id} isOwner={!!isOwner} />
          {isOwner && (
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
          )}
        </div>

        <div className="flex gap-4 items-start mb-7">
          <div
            className="w-[110px] h-[104px] rounded-full p-1 border-2 border-brass flex items-center justify-center shrink-0"
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

        {(player?.home_shop || player?.home_shop_text || player?.sake_rating != null || hasRatingRow || player?.years_playing != null || player?.dart_setup || achievements.length > 0) && (
          <div className="space-y-3.5 mb-7">
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

        {isPro && <EventListSection events={events} />}

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

        {isOwner ? (
          <div className="mt-4 pt-6 border-t border-brass/35 text-center">
            {isPro && (
              <>
                <Link to="/me/offers" className={footerLinkClass}>
                  オファー一覧
                </Link>
                <span className="mx-3 text-brass/50">・</span>
              </>
            )}
            <button type="button" onClick={onSignOut} className={footerLinkClass}>
              サインアウト
            </button>
          </div>
        ) : (
          <div className="mt-4 pt-6 border-t border-brass/35 text-xs text-chalk-dim text-center leading-relaxed">
            店舗の方へ: 出演のご依頼はプロフィール所有者からの承認制です。
          </div>
        )}
      </div>
    </div>
  )
}
