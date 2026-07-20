import { Link } from 'react-router'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface ProStats {
  request_count: number
  total_mobilized: number
}

interface PlayerProfileCardProps {
  profile: Profile
  stats: ProStats
  isOwner?: boolean
  onSignOut?: () => void
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

export function PlayerProfileCard({ profile, stats, isOwner, onSignOut }: PlayerProfileCardProps) {
  const initials = profile.display_name.trim().slice(0, 2) || '?'

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
            {profile.is_pro && (
              <span className="font-tl-mono text-[11px] font-semibold tracking-widest text-ink bg-dart-red px-2 py-0.5 rounded-sm">
                PRO
              </span>
            )}
            {profile.location && (
              <span className="font-tl-mono text-[13px] text-chalk-dim tracking-wide">
                {profile.location}
              </span>
            )}
          </div>
        </header>

        <div className="grid grid-cols-2 border-t border-b border-brass py-6 mb-10">
          <div className="text-center">
            <div className="font-tl-mono text-4xl font-semibold text-chalk tabular-nums">
              {stats.request_count}
            </div>
            <div className="mt-1 text-xs text-chalk-dim tracking-wide">被依頼回数</div>
          </div>
          <div className="text-center border-l border-brass/35">
            <div className="font-tl-mono text-4xl font-semibold text-chalk tabular-nums">
              {stats.total_mobilized}
            </div>
            <div className="mt-1 text-xs text-chalk-dim tracking-wide">延べ動員数</div>
          </div>
        </div>

        {profile.bio_text && (
          <p className="text-[15px] leading-loose text-chalk mb-16">
            {profile.bio_text}
          </p>
        )}

        {profile.stats_url && (
          <a
            href={profile.stats_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 font-tl-mono text-sm font-semibold tracking-wide text-ink bg-dart-red px-4 py-2 rounded-sm hover:opacity-90 transition-opacity"
          >
            公式記録を見る ↗
          </a>
        )}

        {isOwner ? (
          <div className="mt-12 pt-6 border-t border-brass/35 text-center">
            <Link to="/me/edit" className={footerLinkClass}>
              編集する
            </Link>
            <span className="mx-3 text-brass/50">・</span>
            <button type="button" onClick={onSignOut} className={footerLinkClass}>
              サインアウト
            </button>
          </div>
        ) : (
          <div className="mt-12 pt-6 border-t border-brass/35 text-xs text-chalk-dim text-center leading-relaxed">
            店舗の方へ: 出演のご依頼はプロフィール所有者からの承認制です。
          </div>
        )}
      </div>
    </div>
  )
}
