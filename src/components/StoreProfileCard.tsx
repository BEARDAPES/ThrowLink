import { Link } from 'react-router'
import { FaXTwitter, FaInstagram, FaYoutube, FaTiktok } from 'react-icons/fa6'
import { EventListSection, type EventListItem } from './EventListSection'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface StoreProfileCardProps {
  profile: Profile
  events: EventListItem[]
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

export function StoreProfileCard({ profile, events, isOwner, onSignOut }: StoreProfileCardProps) {
  const initials = profile.display_name.trim().slice(0, 2) || '?'
  const snsLinks = parseSnsLinks(profile.sns_links)

  return (
    <div className="min-h-screen bg-ink font-tl-sans flex justify-center px-6 py-16 sm:py-24">
      <div className="w-full max-w-[560px] animate-tl-rise text-left">
        <header className="flex flex-col items-center text-center mb-12">
          <div
            className="w-[132px] h-[132px] rounded-full p-1.5 border-2 border-brass flex items-center justify-center mb-5"
            style={{ background: DART_RING }}
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full rounded-full object-cover border-[3px] border-dart-red"
              />
            ) : (
              <div className="w-full h-full rounded-full border-[3px] border-dart-red bg-ink-2 flex items-center justify-center font-display text-3xl font-semibold text-chalk">
                {initials}
              </div>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wide text-chalk">
            {profile.display_name}
          </h1>

          <div className="mt-2 flex items-center gap-2">
            <span className="font-tl-mono text-[11px] font-semibold tracking-widest text-ink bg-brass px-2 py-0.5 rounded-sm">
              STORE
            </span>
            {profile.location && (
              <span className="font-tl-mono text-[13px] text-chalk-dim tracking-wide">
                {profile.location}
              </span>
            )}
          </div>
        </header>

        {profile.bio_text && (
          <p className="text-[15px] leading-loose text-chalk mb-10">
            {profile.bio_text}
          </p>
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
                <span className="font-tl-mono text-sm tracking-wide flex-1">
                  {SNS_LABELS[link.platform] ?? link.platform}
                </span>
                <span className="text-chalk-dim text-xs group-hover:text-dart-red transition-colors">↗</span>
              </a>
            ))}
          </div>
        )}

        {isOwner ? (
          <div className="mt-4 pt-6 border-t border-brass/35 text-center">
            <Link to="/me/dashboard" className={footerLinkClass}>
              依頼・イベント管理
            </Link>
            <span className="mx-3 text-brass/50">・</span>
            <Link to="/me/edit" className={footerLinkClass}>
              編集する
            </Link>
            <span className="mx-3 text-brass/50">・</span>
            <button type="button" onClick={onSignOut} className={footerLinkClass}>
              サインアウト
            </button>
          </div>
        ) : (
          <div className="mt-4 pt-6 border-t border-brass/35 text-xs text-chalk-dim text-center leading-relaxed">
            ダーツバー・店舗として登録されています。
          </div>
        )}
      </div>
    </div>
  )
}
