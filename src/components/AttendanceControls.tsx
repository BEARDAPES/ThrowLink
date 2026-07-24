import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { clockIn, clockOut } from '../lib/attendance'
import { ConfirmDialog } from './ConfirmDialog'

export interface StoreAffiliation {
  storeId: string
  storeName: string
  businessCloseTime: string | null
}

interface AttendanceState {
  isClockedIn: boolean
  clockedInAt: string | null
}

interface AttendanceControlsProps {
  playerId: string
  stores: StoreAffiliation[]
}

function formatTime(t: string | null): string {
  if (!t) return ''
  return t.slice(0, 5)
}

export function AttendanceControls({ playerId, stores }: AttendanceControlsProps) {
  const [attendance, setAttendance] = useState<Record<string, AttendanceState>>({})
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')
  const [pendingClockIn, setPendingClockIn] = useState<StoreAffiliation | null>(null)
  const [conflictReason, setConflictReason] = useState<string | null>(null)

  async function load() {
    const nextAttendance: Record<string, AttendanceState> = {}
    for (const store of stores) {
      const { data: logData } = await supabase
        .from('store_staff_attendance_logs')
        .select('clocked_in_at, clocked_out_at')
        .eq('store_id', store.storeId)
        .eq('player_id', playerId)
        .order('clocked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      nextAttendance[store.storeId] = {
        isClockedIn: !!logData && !logData.clocked_out_at,
        clockedInAt: logData?.clocked_in_at ?? null,
      }
    }
    setAttendance(nextAttendance)
    setStatus('ready')
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores.map((s) => s.storeId).join(',')])

  async function checkTodayConflict(): Promise<string | null> {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('player_schedule_entries')
      .select('reason')
      .eq('player_id', playerId)
      .lte('start_date', today)
      .gte('end_date', today)
      .limit(1)
      .maybeSingle()
    return data ? data.reason || '個人の予定' : null
  }

  async function requestClockIn(store: StoreAffiliation) {
    const conflict = await checkTodayConflict()
    if (conflict) {
      setConflictReason(conflict)
      setPendingClockIn(store)
      return
    }
    await doClockIn(store)
  }

  async function doClockIn(store: StoreAffiliation) {
    await clockIn(store.storeId, playerId)
    setPendingClockIn(null)
    setConflictReason(null)
    await load()
  }

  async function doClockOut(store: StoreAffiliation) {
    await clockOut(store.storeId, playerId)
    await load()
  }

  if (status === 'loading') return null

  return (
    <div className="space-y-2">
      {stores.map((store) => {
        const state = attendance[store.storeId]
        return (
          <div key={store.storeId} className="flex items-center justify-between bg-ink-2 border border-brass/40 rounded-sm px-3 py-2">
            <div className="min-w-0">
              <div className="text-chalk text-xs truncate">{store.storeName}</div>
              {state?.isClockedIn ? (
                <div className="font-tl-mono text-[10px] text-safe-green mt-0.5">
                  在店中
                  {store.businessCloseTime && `(自動退勤 ${formatTime(store.businessCloseTime)})`}
                </div>
              ) : (
                <div className="font-tl-mono text-[10px] text-chalk-dim mt-0.5">未出勤</div>
              )}
            </div>
            {state?.isClockedIn ? (
              <button
                type="button"
                onClick={() => doClockOut(store)}
                className="font-tl-mono text-xs font-semibold text-chalk border border-brass px-2.5 py-1 rounded-sm hover:border-dart-red hover:text-dart-red transition-colors shrink-0"
              >
                退勤する
              </button>
            ) : (
              <button
                type="button"
                onClick={() => requestClockIn(store)}
                className="font-tl-mono text-xs font-semibold text-ink bg-dart-red px-2.5 py-1 rounded-sm hover:opacity-90 transition-opacity shrink-0"
              >
                出勤する
              </button>
            )}
          </div>
        )
      })}

      {pendingClockIn && (
        <ConfirmDialog
          title="予定と重なっています"
          description={`本日は「${conflictReason}」の予定が登録されています。このまま出勤しますか？`}
          confirmLabel="出勤する"
          cancelLabel="やめる"
          onConfirm={() => doClockIn(pendingClockIn)}
          onCancel={() => {
            setPendingClockIn(null)
            setConflictReason(null)
          }}
        />
      )}
    </div>
  )
}
