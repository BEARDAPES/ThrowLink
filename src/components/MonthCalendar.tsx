export interface CalendarMarker {
  date: string // 'YYYY-MM-DD'
  kind: 'schedule' | 'event' | 'shift'
}

interface MonthCalendarProps {
  markers: CalendarMarker[]
  year: number
  month: number // 0-indexed
  onPrevMonth: () => void
  onNextMonth: () => void
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toDateKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

export function MonthCalendar({ markers, year, month, onPrevMonth, onNextMonth }: MonthCalendarProps) {
  const now = new Date()
  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate())

  const markersByDate = new Map<string, Set<'schedule' | 'event' | 'shift'>>()
  for (const m of markers) {
    if (!markersByDate.has(m.date)) markersByDate.set(m.date, new Set())
    markersByDate.get(m.date)!.add(m.kind)
  }

  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: { key: string; day: number; faded: boolean }[] = []
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ key: toDateKey(year, month - 1, daysInPrevMonth - startWeekday + i + 1), day: daysInPrevMonth - startWeekday + i + 1, faded: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: toDateKey(year, month, d), day: d, faded: false })
  }
  let nextDay = 1
  while (cells.length < 42) {
    cells.push({ key: toDateKey(year, month + 1, nextDay), day: nextDay, faded: true })
    nextDay++
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={onPrevMonth} className="w-[22px] h-[22px] flex items-center justify-center text-chalk-dim hover:text-dart-red transition-colors">
          ‹
        </button>
        <span className="font-tl-mono text-xs text-chalk">{year}年{month + 1}月</span>
        <button type="button" onClick={onNextMonth} className="w-[22px] h-[22px] flex items-center justify-center text-chalk-dim hover:text-dart-red transition-colors">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-[2px]" style={{ gridTemplateRows: 'auto repeat(6, 1fr)' }}>
        {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
          <div key={d} className="text-center font-tl-mono text-[9px] text-chalk-dim pb-1">
            {d}
          </div>
        ))}
        {cells.map((cell) => {
          const kinds = markersByDate.get(cell.key)
          const hasSchedule = kinds?.has('schedule')
          const hasEvent = kinds?.has('event')
          const hasShift = kinds?.has('shift')
          const hasAny = hasSchedule || hasEvent || hasShift
          const isToday = cell.key === todayKey
          return (
            <div
              key={cell.key}
              className={`h-[26px] flex items-center justify-center font-tl-mono text-[10.5px] rounded-sm relative ${
                cell.faded ? 'opacity-25' : ''
              } ${isToday ? 'border border-brass text-chalk' : 'text-chalk-dim'} ${
                hasAny ? 'bg-ink-2 text-chalk' : ''
              }`}
            >
              {cell.day}
              {hasAny && (
                <span className="absolute bottom-[2px] flex gap-[2px]">
                  {hasEvent && <span className="w-[3px] h-[3px] rounded-full bg-brass" />}
                  {hasShift && <span className="w-[3px] h-[3px] rounded-full bg-safe-green" />}
                  {hasSchedule && <span className="w-[3px] h-[3px] rounded-full bg-dart-red" />}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
