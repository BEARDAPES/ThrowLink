import { Link } from 'react-router'
import { FaXTwitter, FaInstagram, FaYoutube, FaTiktok } from 'react-icons/fa6'
import { EventListSection, type EventListItem } from './EventListSection'
import { StarWatchButtons } from './StarWatchButtons'
import { StoreManagementMenu } from './StoreManagementMenu'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type StoreRow = Database['public']['Tables']['stores']['Row']

interface StoreProfileCardProps {
  profile: Profile
  store: StoreRow | null
  events: EventListItem[]
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

export function StoreProfileCard({ profile, store, events, isOwner }: StoreProfileCardProps) {
  const initials = profile.display_name.trim().slice(0, 2) || '?'
  const snsLinks = parseSnsLinks(profile.sns_links)
  const atmosphereTags = Array.isArray(store?.atmosphere_tags) ? (store.atmosphere_tags as string[]) : []
  const openNow = store ? isOpenNow(store.business_open_time, store.business_close_time) : null

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
