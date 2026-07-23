import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type ScheduleEntry = Database['public']['Tables']['player_schedule_entries']['Row']

const inputClass =
  'w-full bg-ink-2 border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans text-sm focus:outline-none focus:border-dart-red transition-colors'

function triButtonClass(active: boolean) {
  return `flex-1 font-tl-mono text-xs rounded-sm px-3 py-2 border transition-colors ${
    active ? 'border-dart-red text-chalk bg-dart-red/15' : 'border-brass/40 text-chalk-dim hover:border-brass'
  }`
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

export function PlayerSchedulePage() {
  const navigate = useNavigate()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [invitationCount, setInvitationCount] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')

  const [entryStatus, setEntryStatus] = useState<'present' | 'absent'>('absent')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [reason, setReason] = useState('')
  const [conflictNote, setConflictNote] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/sign-in')
      return
    }
    setPlayerId(user.id)

    const { data } = await supabase
      .from('player_schedule_entries')
      .select('*')
      .eq('player_id', user.id)
      .order('start_date', { ascending: false })
    setEntries(data ?? [])

    const { count } = await supabase
      .from('store_staff')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', user.id)
      .eq('status', 'invited')
    setInvitationCount(count ?? 0)

    setStatus('ready')
  }

  useEffect(() => {
    load()
  }, [])

  // 参考程度の注意喚起。すでに承諾済みのイベントと重なっていないかだけ軽く確認する
  // (ブロックはしない。ここでの入力自体はイベント化されていない個人の予定用)。
  useEffect(() => {
    async function checkConflict() {
      if (!playerId || !startDate || !endDate) {
        setConflictNote(null)
        return
      }
      const { data } = await supabase
        .from('event_offers')
        .select('events(event_title, event_start_at, event_end_at)')
        .eq('pro_id', playerId)
        .eq('offer_status', 'accepted')

      const rangeStart = new Date(`${startDate}T00:00:00`)
      const rangeEnd = new Date(`${endDate}T23:59:59`)

      const conflict = (data ?? [])
        .map((d) => d.events)
        .find((e) => e && e.event_start_at && e.event_end_at && new Date(e.event_start_at) < rangeEnd && new Date(e.event_end_at) > rangeStart)

      setConflictNote(conflict ? `この期間には既に確定済みのイベント出演があります(${conflict.event_title})。内容を確認のうえ登録してください。` : null)
    }
    checkConflict()
  }, [playerId, startDate, endDate])

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!playerId || !startDate || !endDate) return
    setSaving(true)

    await supabase.from('player_schedule_entries').insert({
      player_id: playerId,
      start_date: startDate,
      end_date: endDate,
      status: entryStatus,
      visibility,
      reason: reason || null,
    })

    setStartDate('')
    setEndDate('')
    setReason('')
    setSaving(false)
    await load()
  }

  async function removeEntry(id: string) {
    await supabase.from('player_schedule_entries').delete().eq('id', id)
    await load()
  }

  if (status === 'loading') return null

  return (
    <div className="min-h-screen bg-ink font-tl-sans px-6 py-16 flex justify-center">
      <div className="w-full max-w-[560px]">
        <Link to="/me" className="flex items-center gap-1 font-tl-mono text-xs text-chalk-dim tracking-wide hover:text-dart-red transition-colors mb-6">
          ← マイページ
        </Link>

        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-chalk mb-10">
          予定管理
        </h1>

        {invitationCount > 0 && (
          <Link
            to="/me/staff-invitations"
            className="block bg-ink-2 border border-brass/50 rounded-sm px-4 py-3 mb-8 hover:border-dart-red transition-colors"
          >
            <p className="text-sm text-chalk">店舗からスタッフ招待が{invitationCount}件届いています</p>
            <p className="font-tl-mono text-xs text-chalk-dim mt-1">タップして確認 ›</p>
          </Link>
        )}

        <form onSubmit={addEntry} className="space-y-4 pb-8 border-b border-brass/35 mb-8">
          <p className="font-tl-mono text-xs text-chalk-dim tracking-wide">予定を追加</p>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">状態</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEntryStatus('absent')} className={triButtonClass(entryStatus === 'absent')}>
                不在
              </button>
              <button type="button" onClick={() => setEntryStatus('present')} className={triButtonClass(entryStatus === 'present')}>
                在店
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">開始日</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={inputClass} />
            </div>
            <span className="text-chalk-dim mt-5 shrink-0">〜</span>
            <div className="flex-1">
              <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">終了日</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required min={startDate} className={inputClass} />
            </div>
          </div>

          {conflictNote && (
            <p className="text-xs text-dart-red bg-dart-red/10 border border-dart-red/30 rounded-sm px-3 py-2">{conflictNote}</p>
          )}

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">公開範囲</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setVisibility('public')} className={triButtonClass(visibility === 'public')}>
                公開(理由も見せる)
              </button>
              <button type="button" onClick={() => setVisibility('private')} className={triButtonClass(visibility === 'private')}>
                非公開
              </button>
            </div>
            <p className="mt-1 text-xs text-chalk-dim">
              {visibility === 'public'
                ? '店舗ページのカレンダーに理由付きで表示されます。'
                : 'カレンダーには表示されません。ただしこの期間のオファーは受けられなくなります。'}
            </p>
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">理由(任意)</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例: 海外遠征のため" className={inputClass} />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="font-tl-mono text-sm font-semibold tracking-wide text-ink bg-dart-red px-4 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? '保存中...' : '予定を追加する'}
          </button>
        </form>

        <div>
          <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">登録済みの予定</p>
          {entries.length === 0 ? (
            <p className="text-sm text-chalk-dim">まだ予定がありません。</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between bg-ink-2 border border-brass/50 rounded-sm px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-tl-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${
                          entry.status === 'present' ? 'text-chalk border border-safe-green' : 'text-chalk bg-dart-red'
                        }`}
                      >
                        {entry.status === 'present' ? '在店' : '不在'}
                      </span>
                      {entry.visibility === 'private' && (
                        <span className="font-tl-mono text-[10px] text-chalk-dim border border-brass/40 px-1.5 py-0.5 rounded-sm">非公開</span>
                      )}
                    </div>
                    <div className="text-chalk text-sm mt-1 truncate">
                      {formatDate(entry.start_date)} 〜 {formatDate(entry.end_date)}
                    </div>
                    {entry.reason && <div className="font-tl-mono text-xs text-chalk-dim mt-0.5 truncate">{entry.reason}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors shrink-0 ml-3"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
