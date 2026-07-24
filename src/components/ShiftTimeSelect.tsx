const HOURS = Array.from({ length: 30 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '30']

interface ShiftTimeSelectProps {
  hour: string
  minute: string
  onChange: (hour: string, minute: string) => void
  disabled?: boolean
  highlight?: boolean
}

const baseClass =
  'bg-ink-2 border rounded-sm px-1.5 py-1 text-chalk font-tl-mono text-xs focus:outline-none focus:border-dart-red disabled:opacity-40 disabled:cursor-not-allowed'

export function ShiftTimeSelect({ hour, minute, onChange, disabled, highlight }: ShiftTimeSelectProps) {
  const borderClass = highlight ? 'border-dart-red text-dart-red' : 'border-brass/50'

  return (
    <div className="flex items-center gap-1">
      <select
        value={hour}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value, minute)}
        className={`${baseClass} ${borderClass}`}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-chalk-dim text-xs">:</span>
      <select
        value={minute}
        disabled={disabled}
        onChange={(e) => onChange(hour, e.target.value)}
        className={`${baseClass} ${borderClass}`}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  )
}
