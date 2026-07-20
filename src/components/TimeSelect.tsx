const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '10', '20', '30', '40', '50']

const selectClass =
  'bg-ink-2 border border-brass/50 rounded-sm px-2 py-2 text-chalk font-tl-mono text-sm focus:outline-none focus:border-dart-red transition-colors'

interface TimeSelectProps {
  hour: string
  minute: string
  onChange: (hour: string, minute: string) => void
}

export function TimeSelect({ hour, minute, onChange }: TimeSelectProps) {
  return (
    <div className="flex items-center gap-1">
      <select value={hour} onChange={(e) => onChange(e.target.value, minute)} className={selectClass}>
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-chalk-dim">:</span>
      <select value={minute} onChange={(e) => onChange(hour, e.target.value)} className={selectClass}>
        {MINUTES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  )
}
