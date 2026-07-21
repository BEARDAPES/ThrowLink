import { Link } from 'react-router'

export interface EventListItem {
  id: string
  title: string
  startAt: string | null
  status: string
}

interface EventListSectionProps {
  events: EventListItem[]
}

function EventRow({ event }: { event: EventListItem }) {
  return (
    <Link to={`/events/${event.id}`} className="block py-3 border-b border-brass/20 hover:text-dart-red transition-colors">
      <div className="font-tl-mono text-xs text-chalk-dim tracking-wide">
        {event.startAt ? new Date(event.startAt).toLocaleDateString('ja-JP') : '日程未定'}
      </div>
      <div className="text-chalk text-sm mt-0.5">{event.title}</div>
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
          <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">開催予定</p>
          <div className="border-t border-brass/35">
            {upcoming.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">過去の開催</p>
          <div className="border-t border-brass/35">
            {past.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
