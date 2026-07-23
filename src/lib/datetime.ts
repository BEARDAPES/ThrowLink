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
