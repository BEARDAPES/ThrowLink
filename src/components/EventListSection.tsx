import { Link } from 'react-router'

export interface EventListItem {
  id: string
  title: string
  startAt: string | null
  status: string
  venue?: string
}

interface EventListSectionProps {
  events: EventListItem[]
}

function EventRow({ event }: { event: EventListItem }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="flex items-center justify-between gap-2.5 py-3 px-2.5 -mx-2.5 rounded-sm border-b border-brass/20 hover:bg-ink-2 transition-colors group"
    >
      <div className="min-w-0">
        <div className="font-tl-mono text-xs text-chalk-dim tracking-wide">
          {event.startAt ? new Date(event.startAt).toLocaleDateString('ja-JP') : '日程未定'}
        </div>
        <div className="text-chalk text-sm mt-0.5 truncate">{event.title}</div>
        {event.venue && <div className="font-tl-mono text-xs text-chalk-dim mt-0.5 truncate">{event.venue}</div>}
      </div>
      <span className="text-brass text-lg shrink-0 group-hover:text-dart-red transition-colors">›</span>
    </Link>
  )
}

export function EventListSection({ events }: EventListSectionProps) {
  if (events.length === 0) return null

  const upcoming = events
    .filter((e) => e.status === 'published')
    .sort((a, b) => new Date(a.startAt ?? 0).getTime() - new Date(b.startAt ?? 0).getTime())

  const past = events
    .filter((e) => e.status === 'completed')
    .sort((a, b) => new Date(b.startAt ?? 0).getTime() - new Date(a.startAt ?? 0).getTime())

  return (
    <div className="mb-10">
      {upcoming.length > 0 && (
        <div className="mb-6">
          <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">イベント予定</p>
          <div>
            {upcoming.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">過去のイベント</p>
          <div>
            {past.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
