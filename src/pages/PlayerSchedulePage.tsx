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

async function findConflict(playerId: string, startDate: string, endDate: string): Promise<string | null> {
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

  return conflict ? `この期間には既に確定済みのイベント出演があります(${conflict.event_title})。内容を確認のうえ登録してください。` : null
}

function ScheduleFormFields({
  startDate,
  endDate,
  visibility,
  reason,
  conflictNote,
  onStartDateChange,
  onEndDateChange,
  onVisibilityChange,
  onReasonChange,
}: {
  startDate: string
  endDate: string
  visibility: 'public' | 'private'
  reason: string
  conflictNote: string | null
  onStartDateChange: (v: string) => void
  onEndDateChange: (v: string) => void
  onVisibilityChange: (v: 'public' | 'private') => void
  onReasonChange: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">開始日</label>
          <input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} required className={inputClass} />
        </div>
        <span className="text-chalk-dim mt-5 shrink-0">〜</span>
        <div className="flex-1">
          <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">終了日</label>
          <input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} required min={startDate} className={inputClass} />
        </div>
      </div>

      {conflictNote && (
        <p className="text-xs text-dart-red bg-dart-red/10 border border-dart-red/30 rounded-sm px-3 py-2">{conflictNote}</p>
      )}

      <div>
        <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">公開範囲</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => onVisibilityChange('public')} className={triButtonClass(visibility === 'public')}>
            公開する
          </button>
          <button type="button" onClick={() => onVisibilityChange('private')} className={triButtonClass(visibility === 'private')}>
            非公開
          </button>
        </div>
        <p className="mt-1 text-xs text-chalk-dim">
          {visibility === 'public'
            ? 'あなたのプロフィールページ(勤務店舗があればそのカレンダーにも)に、内容付きで表示されます。'
            : 'あなた以外には表示されません。'}
        </p>
      </div>

      <div>
        <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">予定の内容(任意)</label>
        <input type="text" value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder="例: Japanツアー 神奈川大会出場" className={inputClass} />
      </div>
    </div>
  )
}

export function PlayerSchedulePage() {
  const navigate = useNavigate()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [invitationCount, setInvitationCount] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')

  // 新規追加フォーム専用のstate
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [newVisibility, setNewVisibility] = useState<'public' | 'private'>('public')
  const [newReason, setNewReason] = useState('')
  const [newConflictNote, setNewConflictNote] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // インライン編集用のstate(該当行だけがフォームに変わる)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editVisibility, setEditVisibility] = useState<'public' | 'private'>('public')
  const [editReason, setEditReason] = useState('')
  const [editConflictNote, setEditConflictNote] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

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

  useEffect(() => {
    if (!playerId || !newStartDate || !newEndDate) {
      setNewConflictNote(null)
      return
    }
    findConflict(playerId, newStartDate, newEndDate).then(setNewConflictNote)
  }, [playerId, newStartDate, newEndDate])

  useEffect(() => {
    if (!playerId || !editStartDate || !editEndDate) {
      setEditConflictNote(null)
      return
    }
    findConflict(playerId, editStartDate, editEndDate).then(setEditConflictNote)
  }, [playerId, editStartDate, editEndDate])

  function handleNewStartDateChange(value: string) {
    setNewStartDate(value)
    if (value && !newEndDate) setNewEndDate(value)
  }

  function handleNewEndDateChange(value: string) {
    setNewEndDate(value)
    if (value && !newStartDate) setNewStartDate(value)
  }

  function handleEditStartDateChange(value: string) {
    setEditStartDate(value)
    if (value && !editEndDate) setEditEndDate(value)
  }

  function handleEditEndDateChange(value: string) {
    setEditEndDate(value)
    if (value && !editStartDate) setEditStartDate(value)
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!playerId || !newStartDate || !newEndDate) return
    setSaving(true)

    await supabase.from('player_schedule_entries').insert({
      player_id: playerId,
      start_date: newStartDate,
      end_date: newEndDate,
      visibility: newVisibility,
      reason: newReason || null,
    })

    setNewStartDate('')
    setNewEndDate('')
    setNewVisibility('public')
    setNewReason('')
    setSaving(false)
    await load()
  }

  function startEdit(entry: ScheduleEntry) {
    setEditingId(entry.id)
    setEditStartDate(entry.start_date)
    setEditEndDate(entry.end_date)
    setEditVisibility(entry.visibility as 'public' | 'private')
    setEditReason(entry.reason ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId || !editStartDate || !editEndDate) return
    setEditSaving(true)

    await supabase
      .from('player_schedule_entries')
      .update({ start_date: editStartDate, end_date: editEndDate, visibility: editVisibility, reason: editReason || null })
      .eq('id', editingId)

    setEditSaving(false)
    setEditingId(null)
    await load()
  }

  async function removeEntry(id: string) {
    await supabase.from('player_schedule_entries').delete().eq('id', id)
    if (editingId === id) setEditingId(null)
    await load()
  }

  if (status === 'loading') return null

  return (
    <div className="min-h-screen bg-ink font-tl-sans px-6 py-16 flex justify-center">
      <div className="w-full max-w-[560px]">
        <Link to="/me" className="flex items-center gap-1 font-tl-mono text-xs text-chalk-dim tracking-wide hover:text-dart-red transition-colors mb-6">
          ← マイページ
        </Link>

        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-chalk mb-2">
          予定管理
        </h1>
        <p className="text-xs text-chalk-dim mb-10 leading-relaxed">
          遠征・大会出場など、ファンに知らせたい予定を登録できます。
          <br />
          公開した予定は、あなたのプロフィールページに表示されます。
          <br />
          登録した予定の期間は、公開・非公開にかかわらず新しいオファーを受けられなくなります。
        </p>

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
          <ScheduleFormFields
            startDate={newStartDate}
            endDate={newEndDate}
            visibility={newVisibility}
            reason={newReason}
            conflictNote={newConflictNote}
            onStartDateChange={handleNewStartDateChange}
            onEndDateChange={handleNewEndDateChange}
            onVisibilityChange={setNewVisibility}
            onReasonChange={setNewReason}
          />
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
              {entries.map((entry) =>
                editingId === entry.id ? (
                  <form key={entry.id} onSubmit={saveEdit} className="bg-ink-2 border border-brass/50 rounded-sm px-3 py-3 space-y-4">
                    <ScheduleFormFields
                      startDate={editStartDate}
                      endDate={editEndDate}
                      visibility={editVisibility}
                      reason={editReason}
                      conflictNote={editConflictNote}
                      onStartDateChange={handleEditStartDateChange}
                      onEndDateChange={handleEditEndDateChange}
                      onVisibilityChange={setEditVisibility}
                      onReasonChange={setEditReason}
                    />
                    <div className="flex items-center gap-4">
                      <button
                        type="submit"
                        disabled={editSaving}
                        className="font-tl-mono text-xs font-semibold text-ink bg-dart-red px-3 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {editSaving ? '保存中...' : '変更を保存する'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-chalk transition-colors"
                      >
                        編集をやめる
                      </button>
                    </div>
                  </form>
                ) : (
                  <div key={entry.id} className="flex items-center justify-between bg-ink-2 border border-brass/50 rounded-sm px-3 py-2.5">
                    <div className="min-w-0">
                      {entry.visibility === 'private' && (
                        <span className="font-tl-mono text-[10px] text-chalk-dim border border-brass/40 px-1.5 py-0.5 rounded-sm">非公開</span>
                      )}
                      <div className="text-chalk text-sm mt-1 truncate">
                        {formatDate(entry.start_date)} 〜 {formatDate(entry.end_date)}
                      </div>
                      {entry.reason && <div className="font-tl-mono text-xs text-chalk-dim mt-0.5 truncate">{entry.reason}</div>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <button
                        type="button"
                        onClick={() => startEdit(entry)}
                        className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
