export function splitIso(iso: string | null): { date: string; hour: string; minute: string } {
  if (!iso) return { date: '', hour: '', minute: '' }
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hour: pad(d.getHours()),
    minute: pad(d.getMinutes()),
  }
}

export function combineToIso(date: string, hour: string, minute: string): string | null {
  if (!date || !hour || !minute) return null
  return new Date(`${date}T${hour}:${minute}`).toISOString()
}

export function formatDateTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('ja-JP') : '未設定'
}

// 'YYYY-MM-DD'の文字列を、UTCではなく必ずローカル時刻として解釈してDateに変換する。
// new Date('YYYY-MM-DD')は文字列パースだとUTC扱いになり、
// new Date(y, m, d)のような数値組み立てのDateと比較するとタイムゾーン分ズレるため、
// 日付だけを扱う場所では常にこちらを使う。
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// シフトの時刻は24時以降(翌1〜5時ぶん、25〜29時)も入力できるようにしている。
// DB側は通常のtime型(00:00-23:59)で持つため、保存時は24を引いて正規化し、
// 表示時は「終了時刻が開始時刻より前(=日をまたいでいる)」場合に+24して復元する。
export function normalizeShiftTime(extendedHour: string, minute: string): string {
  const h = Number(extendedHour) % 24
  return `${String(h).padStart(2, '0')}:${minute}:00`
}

export function extendedHourForDisplay(time: string, startTime: string): string {
  const hour = Number(time.slice(0, 2))
  const startHour = Number(startTime.slice(0, 2))
  const wrapsToNextDay = hour < startHour
  return String(hour + (wrapsToNextDay ? 24 : 0)).padStart(2, '0')
}
