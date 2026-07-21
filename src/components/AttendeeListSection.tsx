import { Link } from 'react-router'

export interface Attendee {
  id: string
  displayName: string
  avatarUrl: string | null
  isPro: boolean
  slug: string | null
}

interface AttendeeListSectionProps {
  attendees: Attendee[]
  offeredProIds: Set<string>
  canOffer: boolean
  onOffer: (attendee: Attendee) => void
}

export function AttendeeListSection({ attendees, offeredProIds, canOffer, onOffer }: AttendeeListSectionProps) {
  if (attendees.length === 0) return null

  return (
    <div className="mb-10 pb-8 border-b border-brass/35">
      <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">
        参加予定者（{attendees.length}名）
      </p>
      <div className="space-y-2">
        {attendees.map((attendee) => (
          <div key={attendee.id} className="flex items-center justify-between bg-ink-2 border border-brass/50 rounded-sm px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-full border border-brass/50 overflow-hidden shrink-0 bg-ink flex items-center justify-center font-display text-[10px] text-chalk">
                {attendee.avatarUrl ? (
                  <img src={attendee.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  attendee.displayName.trim().slice(0, 2) || '?'
                )}
              </span>
              {attendee.slug ? (
                <Link to={`/players/${attendee.slug}`} className="text-chalk text-sm truncate hover:text-dart-red transition-colors">
                  {attendee.displayName}
                </Link>
              ) : (
                <span className="text-chalk text-sm truncate">{attendee.displayName}</span>
              )}
              {attendee.isPro && (
                <span className="font-tl-mono text-[10px] font-semibold tracking-widest text-ink bg-dart-red px-1.5 py-0.5 rounded-sm shrink-0">
                  PRO
                </span>
              )}
            </div>
            {canOffer && attendee.isPro && !offeredProIds.has(attendee.id) && (
              <button
                type="button"
                onClick={() => onOffer(attendee)}
                className="font-tl-mono text-xs text-dart-red hover:opacity-80 transition-opacity shrink-0"
              >
                オファーする
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
