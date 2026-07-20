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
