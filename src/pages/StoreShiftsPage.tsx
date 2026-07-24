import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { supabase } from '../lib/supabase'
import { ShiftTimeSelect } from '../components/ShiftTimeSelect'
import { MonthCalendar, type CalendarMarker } from '../components/MonthCalendar'
import { normalizeShiftTime, extendedHourForDisplay, addDaysToDateString } from '../lib/datetime'
import type { Database } from '../types/database.types'

type ShiftRow = Database['public']['Tables']['store_staff_shift_entries']['Row']

interface StaffOption {
  id: string
  displayName: string
  isPro: boolean
}

interface DayState {
  date: string
  weekdayLabel: string
  checked: boolean
  startHour: string
  startMinute: string
  endHour: string
  endMinute: string
  original: ShiftRow | null
  updatedByName: string | null
}

interface StoreCalendarItem {
  key: string
  date: string
  kind: 'event' | 'shift' | 'schedule'
  time: string | null
  text: string
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function CategoryBadge({ kind }: { kind: 'event' | 'shift' | 'schedule' }) {
  const config = {
    event: { label: 'イベント', className: 'text-brass border-brass' },
    shift: { label: '出勤', className: 'text-safe-green border-safe-green' },
    schedule: { label: '個人予定', className: 'text-dart-red border-dart-red' },
  }[kind]
  return (
    <span className={`font-tl-mono text-[9px] w-14 shrink-0 text-center border rounded-sm py-0.5 ${config.className}`}>
      {config.label}
    </span>
  )
}

const DEFAULT_FALLBACK_START = '18'
const DEFAULT_FALLBACK_END = '27'

function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function StoreShiftsPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeSlug, setStoreSlug] = useState<string | null>(null)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [defaultStartHour, setDefaultStartHour] = useState(DEFAULT_FALLBACK_START)
  const [defaultEndHour, setDefaultEndHour] = useState(DEFAULT_FALLBACK_END)
  const [canManageAll, setCanManageAll] = useState(false)
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)

  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [days, setDays] = useState<DayState[]>([])
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState(false)

  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calendarMarkers, setCalendarMarkers] = useState<CalendarMarker[]>([])
  const [monthListItems, setMonthListItems] = useState<StoreCalendarItem[]>([])

  const [status, setStatus] = useState<'loading' | 'ready' | 'forbidden' | 'not-found'>('loading')

  useEffect(() => {
    if (!slug) return

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/sign-in')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, slug')
        .eq('slug', slug!)
        .eq('role', 'store')
        .maybeSingle()

      if (!profileData) {
        setStatus('not-found')
        return
      }

      setStoreId(profileData.id)
      setStoreSlug(profileData.slug)
      setViewerId(user.id)

      const { data: storeRow } = await supabase
        .from('stores')
        .select('business_open_time, business_close_time')
        .eq('id', profileData.id)
        .maybeSingle()

      if (storeRow?.business_open_time && storeRow?.business_close_time) {
        const openHour = storeRow.business_open_time.slice(0, 2)
        const closeHourRaw = Number(storeRow.business_close_time.slice(0, 2))
        const closeHour = closeHourRaw <= Number(openHour) ? String(closeHourRaw + 24).padStart(2, '0') : String(closeHourRaw).padStart(2, '0')
        setDefaultStartHour(openHour)
        setDefaultEndHour(closeHour)
      }

      const isOwner = user.id === profileData.id

      const { data: staffRow } = await supabase
        .from('store_staff')
        .select('is_admin')
        .eq('store_id', profileData.id)
        .eq('player_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      const isAdmin = !!staffRow?.is_admin
      const isActiveStaff = !!staffRow

      if (!isOwner && !isActiveStaff) {
        setStatus('forbidden')
        return
      }

      const manageAll = isOwner || isAdmin
      setCanManageAll(manageAll)

      if (manageAll) {
        const { data: staffRows } = await supabase
          .from('store_staff')
          .select('player_id')
          .eq('store_id', profileData.id)
          .eq('status', 'active')

        const staffIds = (staffRows ?? []).map((s) => s.player_id)
        if (staffIds.length > 0) {
          const { data: staffProfiles } = await supabase
            .from('profiles')
            .select('id, display_name, players(is_pro)')
            .in('id', staffIds)
          setStaffOptions(
            (staffProfiles ?? []).map((p) => ({
              id: p.id,
              displayName: p.display_name,
              isPro: p.players?.is_pro ?? false,
            }))
          )
        }
      } else {
        setSelectedStaffId(user.id)
      }

      const today = toDateKey(new Date())
      const inFiveDays = toDateKey(new Date(Date.now() + 4 * 86400000))
      setRangeStart(today)
      setRangeEnd(inFiveDays)

      setStatus('ready')
    }

    init()
  }, [slug, navigate])

  function selectStaff(staff: StaffOption) {
    setSelectedStaffId(staff.id)
  }

  async function loadDays() {
    if (!storeId || !selectedStaffId || !rangeStart || !rangeEnd) {
      setDays([])
      return
    }

    const { data: existingRows } = await supabase
      .from('store_staff_shift_entries')
      .select('*')
      .eq('store_id', storeId)
      .eq('player_id', selectedStaffId)
      .gte('date', rangeStart)
      .lte('date', rangeEnd)

    const existingByDate = Object.fromEntries((existingRows ?? []).map((r) => [r.date, r]))

    const updaterIds = [...new Set((existingRows ?? []).map((r) => r.updated_by))]
    let nameById: Record<string, string> = {}
    if (updaterIds.length > 0) {
      const { data: updaters } = await supabase.from('profiles').select('id, display_name').in('id', updaterIds)
      nameById = Object.fromEntries((updaters ?? []).map((u) => [u.id, u.display_name]))
    }

    const list: DayState[] = []
    const cursor = new Date(`${rangeStart}T00:00:00`)
    const end = new Date(`${rangeEnd}T00:00:00`)

    while (cursor <= end) {
      const dateKey = toDateKey(cursor)
      const existing = existingByDate[dateKey] ?? null
      const updatedByName = existing ? (nameById[existing.updated_by] ?? null) : null

      if (existing) {
        list.push({
          date: dateKey,
          weekdayLabel: WEEKDAYS[cursor.getDay()],
          checked: true,
          startHour: existing.start_time.slice(0, 2),
          startMinute: existing.start_time.slice(3, 5),
          endHour: extendedHourForDisplay(existing.end_time, existing.start_time),
          endMinute: existing.end_time.slice(3, 5),
          original: existing,
          updatedByName,
        })
      } else {
        list.push({
          date: dateKey,
          weekdayLabel: WEEKDAYS[cursor.getDay()],
          checked: false,
          startHour: defaultStartHour,
          startMinute: '00',
          endHour: defaultEndHour,
          endMinute: '00',
          original: null,
          updatedByName: null,
        })
      }

      cursor.setDate(cursor.getDate() + 1)
    }

    setDays(list)
  }

  useEffect(() => {
    loadDays()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, selectedStaffId, rangeStart, rangeEnd])

  useEffect(() => {
    async function loadStoreCalendar() {
      if (!storeId) return

      const monthStart = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`
      const monthEndDate = new Date(calYear, calMonth + 1, 0)
      const monthEnd = toDateKey(monthEndDate)

      const { data: staffRows } = await supabase
        .from('store_staff')
        .select('player_id')
        .eq('store_id', storeId)
        .eq('status', 'active')
      const staffIds = (staffRows ?? []).map((s) => s.player_id)

      const { data: staffProfiles } = staffIds.length > 0
        ? await supabase.from('profiles').select('id, display_name').in('id', staffIds)
        : { data: [] }
      const nameById = Object.fromEntries((staffProfiles ?? []).map((p) => [p.id, p.display_name]))

      const { data: eventsData } = await supabase
        .from('events')
        .select('id, event_title, event_start_at, event_end_at')
        .eq('store_id', storeId)
        .in('status', ['published', 'completed'])
        .gte('event_start_at', `${monthStart}T00:00:00`)
        .lte('event_start_at', `${monthEnd}T23:59:59`)

      const { data: shiftRows } = staffIds.length > 0
        ? await supabase
            .from('store_staff_shift_entries')
            .select('date, start_time, end_time, player_id')
            .eq('store_id', storeId)
            .in('player_id', staffIds)
            .gte('date', monthStart)
            .lte('date', monthEnd)
        : { data: [] }

      const { data: scheduleRows } = staffIds.length > 0
        ? await supabase
            .from('player_schedule_entries')
            .select('start_date, end_date, reason, player_id')
            .in('player_id', staffIds)
            .eq('visibility', 'public')
            .lte('start_date', monthEnd)
            .gte('end_date', monthStart)
        : { data: [] }

      const markers: CalendarMarker[] = []
      const items: StoreCalendarItem[] = []

      for (const e of eventsData ?? []) {
        const d = e.event_start_at!.slice(0, 10)
        const startTime = new Date(e.event_start_at!).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        const endTime = e.event_end_at ? new Date(e.event_end_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : null
        markers.push({ date: d, kind: 'event' })
        items.push({ key: `evt-${e.id}`, date: d, kind: 'event', time: endTime ? `${startTime}-${endTime}` : startTime, text: e.event_title })
      }

      for (const s of shiftRows ?? []) {
        markers.push({ date: s.date, kind: 'shift' })
        items.push({
          key: `shift-${s.player_id}-${s.date}`,
          date: s.date,
          kind: 'shift',
          time: `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`,
          text: nameById[s.player_id] ?? '不明',
        })
      }

      for (const p of scheduleRows ?? []) {
        let cursor = p.start_date
        while (cursor <= p.end_date) {
          if (cursor >= monthStart && cursor <= monthEnd) {
            markers.push({ date: cursor, kind: 'schedule' })
          }
          cursor = addDaysToDateString(cursor, 1)
        }
        items.push({
          key: `sched-${p.player_id}-${p.start_date}`,
          date: p.start_date,
          kind: 'schedule',
          time: null,
          text: `${nameById[p.player_id] ?? '不明'} ・ ${p.reason || '個人の予定'}`,
        })
      }

      setCalendarMarkers(markers)
      setMonthListItems(items.sort((a, b) => a.date.localeCompare(b.date)))
    }
    loadStoreCalendar()
  }, [storeId, calYear, calMonth])

  function updateDay(index: number, patch: Partial<DayState>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  function copyFirstToAll() {
    if (days.length === 0) return
    const first = days[0]
    setDays((prev) =>
      prev.map((d, i) => (i === 0 ? d : { ...d, checked: true, startHour: first.startHour, startMinute: first.startMinute, endHour: first.endHour, endMinute: first.endMinute }))
    )
  }

  async function handleSave() {
    if (!storeId || !selectedStaffId || !viewerId) return
    setSaving(true)

    for (const day of days) {
      if (day.checked) {
        const startTime = normalizeShiftTime(day.startHour, day.startMinute)
        const endTime = normalizeShiftTime(day.endHour, day.endMinute)
        await supabase.from('store_staff_shift_entries').upsert(
          {
            store_id: storeId,
            player_id: selectedStaffId,
            date: day.date,
            start_time: startTime,
            end_time: endTime,
            visibility: 'public',
            updated_by: viewerId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id,player_id,date' }
        )
      } else if (day.original) {
        await supabase.from('store_staff_shift_entries').delete().eq('id', day.original.id)
      }
    }

    setSaving(false)
    setSavedMessage(true)
    setTimeout(() => setSavedMessage(false), 4000)
    await loadDays()
  }

  const selectedStaff = staffOptions.find((s) => s.id === selectedStaffId)

  if (status === 'loading') return null

  if (status === 'not-found') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-chalk font-tl-sans">
        <p>この店舗ページは見つかりませんでした。</p>
      </div>
    )
  }

  if (status === 'forbidden') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-chalk font-tl-sans">
        <p>このページを表示する権限がありません。</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink font-tl-sans px-6 py-16 flex justify-center">
      <div className="w-full max-w-[560px]">
        {storeSlug && (
          <Link to={`/stores/${storeSlug}`} className="flex items-center gap-1 font-tl-mono text-xs text-chalk-dim tracking-wide hover:text-dart-red transition-colors mb-6">
            ← 店舗ホーム
          </Link>
        )}

        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-chalk mb-4">
          シフト管理
        </h1>
        <p className="text-xs text-chalk-dim mb-2 leading-relaxed">
          日付ごとに勤務予定を登録すると、店舗ページにそのまま表示されます(非公開にすれば、本人と管理者のみ閲覧できます)。お客様への表示用の情報で、正式な勤怠記録ではありません。
        </p>
        <p className="text-xs text-chalk-dim mb-8 leading-relaxed">
          (対象がプロの場合) シフトと時間が重なっていても、オファー自体は届きます。実際に出演するかどうかは本人の判断です。
        </p>

        {canManageAll && (
          <div className="mb-8">
            <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">スタッフを選択</p>
            <div className="flex flex-wrap gap-1.5">
              {staffOptions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectStaff(s)}
                  className={`font-tl-mono text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedStaffId === s.id ? 'border-brass bg-ink-2 text-chalk' : 'border-brass/35 text-chalk-dim hover:border-brass'
                  }`}
                >
                  {s.displayName}
                  {s.id === viewerId && '(自分)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedStaffId ? (
          <div>
            {canManageAll && (
              <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">
                {selectedStaff?.displayName ?? (selectedStaffId === viewerId ? '自分' : '')}のシフト
              </p>
            )}

            <div className="flex items-center gap-2 mb-4">
              <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="bg-ink-2 border border-brass/50 rounded-sm px-2 py-1.5 text-chalk font-tl-sans text-sm" />
              <span className="text-chalk-dim text-sm">〜</span>
              <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} min={rangeStart} className="bg-ink-2 border border-brass/50 rounded-sm px-2 py-1.5 text-chalk font-tl-sans text-sm" />
            </div>

            {days.length > 0 && (
              <button type="button" onClick={copyFirstToAll} className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-chalk transition-colors mb-4 inline-block">
                ↧ 1日目の時間をまとめて適用
              </button>
            )}

            <div className="space-y-2">
              {days.map((day, index) => {
                const startChanged = !!day.original && (day.original.start_time.slice(0, 5) !== `${day.startHour}:${day.startMinute}`)
                const endChangedRaw = day.original ? extendedHourForDisplay(day.original.end_time, day.original.start_time) : ''
                const endChanged = !!day.original && (`${endChangedRaw}:${day.original.end_time.slice(3, 5)}` !== `${day.endHour}:${day.endMinute}`)
                const isNew = day.checked && !day.original
                const willDelete = !day.checked && !!day.original

                return (
                  <div
                    key={day.date}
                    className={`bg-ink-2 border rounded-sm px-3 py-2.5 ${
                      willDelete ? 'border-dart-red' : isNew ? 'border-safe-green' : 'border-brass/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={day.checked}
                        onChange={(e) => updateDay(index, { checked: e.target.checked })}
                        className="w-4 h-4 accent-dart-red shrink-0"
                      />
                      <div className={`flex items-center gap-2 flex-1 ${!day.checked ? 'opacity-40' : ''}`}>
                        <span className="font-tl-mono text-sm text-chalk w-16 shrink-0">
                          {new Date(`${day.date}T00:00:00`).getMonth() + 1}/{new Date(`${day.date}T00:00:00`).getDate()}({day.weekdayLabel})
                        </span>
                        <ShiftTimeSelect
                          hour={day.startHour}
                          minute={day.startMinute}
                          disabled={!day.checked}
                          highlight={startChanged}
                          onChange={(h, m) => updateDay(index, { startHour: h, startMinute: m })}
                        />
                        <span className="text-chalk-dim text-xs shrink-0">〜</span>
                        <ShiftTimeSelect
                          hour={day.endHour}
                          minute={day.endMinute}
                          disabled={!day.checked}
                          highlight={endChanged}
                          onChange={(h, m) => updateDay(index, { endHour: h, endMinute: m })}
                        />
                        {isNew && (
                          <span className="font-tl-mono text-[9px] text-safe-green border border-safe-green px-1.5 py-0.5 rounded-sm shrink-0">新規</span>
                        )}
                      </div>
                    </div>
                    {day.original && day.checked && (
                      <p className={`font-tl-mono text-[10px] mt-2 pt-2 border-t border-brass/20 ${startChanged || endChanged ? 'text-dart-red' : 'text-chalk-dim'}`}>
                        既存の登録: {day.original.start_time.slice(0, 5)}〜{extendedHourForDisplay(day.original.end_time, day.original.start_time)}:{day.original.end_time.slice(3, 5)}
                        {' ・ 最終更新: '}{day.updatedByName ?? '不明'} ・ {formatDateTime(day.original.updated_at)}
                      </p>
                    )}
                    {willDelete && (
                      <p className="font-tl-mono text-[10px] text-dart-red mt-2 pt-2 border-t border-brass/20">
                        チェックが外れています。保存すると削除されます。
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="text-[11px] text-chalk-dim leading-relaxed mt-4 mb-6">
              保存すると、表示されている内容がそのまま反映されます。チェックが入っている日は表示中の時間で登録され、外れている日は休みとして扱われます(既存の登録は削除されます)。
              <br />
              <span className="text-safe-green">緑</span>は新規に登録される日、<span className="text-dart-red">赤</span>は既存の登録から内容が変わる箇所です。
            </p>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="font-tl-mono text-sm font-semibold tracking-wide text-ink bg-dart-red px-4 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存する'}
            </button>
            {savedMessage && (
              <span className="font-tl-mono text-xs text-safe-green ml-3">✓ 保存しました</span>
            )}
          </div>
        ) : (
          canManageAll && <p className="text-sm text-chalk-dim">編集するスタッフを選んでください。</p>
        )}

        {storeId && (
          <div className="mt-8 pt-8 border-t border-brass/35">
            <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">カレンダーで確認(店全体)</p>
            <MonthCalendar
              markers={calendarMarkers}
              year={calYear}
              month={calMonth}
              onPrevMonth={() => (calMonth === 0 ? (setCalYear((y) => y - 1), setCalMonth(11)) : setCalMonth((m) => m - 1))}
              onNextMonth={() => (calMonth === 11 ? (setCalYear((y) => y + 1), setCalMonth(0)) : setCalMonth((m) => m + 1))}
            />
            <div className="mt-4 space-y-2">
              {monthListItems.length === 0 ? (
                <p className="text-xs text-chalk-dim">この月の予定はありません。</p>
              ) : (
                Object.entries(
                  monthListItems.reduce<Record<string, StoreCalendarItem[]>>((acc, item) => {
                    acc[item.date] = [...(acc[item.date] ?? []), item]
                    return acc
                  }, {})
                )
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, items]) => (
                    <div key={date} className="mb-4">
                      <p className="font-tl-mono text-xs text-chalk-dim mb-1.5">
                        {new Date(`${date}T00:00:00`).getMonth() + 1}/{new Date(`${date}T00:00:00`).getDate()}
                      </p>
                      <div className="space-y-1.5">
                        {items.map((item) => (
                          <div key={item.key} className="flex items-center gap-3 py-1 border-b border-brass/10">
                            <CategoryBadge kind={item.kind} />
                            {item.time && (
                              <span className="font-tl-mono text-xs text-chalk-dim w-11 shrink-0">{item.time}</span>
                            )}
                            <span className="text-chalk text-sm truncate">{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
