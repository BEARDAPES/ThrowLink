import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'

type Status = 'loading' | 'signed-out' | 'none' | 'confirmed' | 'waitlisted'

interface EventReservationPanelProps {
  eventId: string
  capacity: number
}

export function EventReservationPanel({ eventId, capacity }: EventReservationPanelProps) {
  const [status, setStatus] = useState<Status>('loading')
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatus('signed-out')
      return
    }

    const { data: reservation } = await supabase
      .from('reservations')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .neq('status', 'cancelled')
      .maybeSingle()

    const { count } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'confirmed')

    setConfirmedCount(count ?? 0)
    setStatus(reservation ? (reservation.status as 'confirmed' | 'waitlisted') : 'none')
  }

  useEffect(() => {
    load()
  }, [eventId])

  async function reserve() {
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('reservations').insert({ event_id: eventId, user_id: user.id })
    setBusy(false)
    await load()
  }

  async function cancel() {
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('reservations').update({ status: 'cancelled' }).eq('event_id', eventId).eq('user_id', user.id)
    setBusy(false)
    await load()
  }

  if (status === 'loading') return null

  return (
    <div className="mb-10 pb-8 border-b border-brass/35">
      <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">
        参加申し込み(定員 {capacity}名 / 確定 {confirmedCount}名)
      </p>

      {status === 'signed-out' && (
        <Link
          to="/sign-in"
          className="inline-block font-tl-mono text-sm font-semibold tracking-wide text-ink bg-dart-red px-4 py-2 rounded-sm hover:opacity-90 transition-opacity"
        >
          サインインして申し込む
        </Link>
      )}

      {status === 'none' && (
        <button
          type="button"
          onClick={reserve}
          disabled={busy}
          className="font-tl-mono text-sm font-semibold tracking-wide text-ink bg-dart-red px-4 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {busy ? '送信中...' : '参加を申し込む'}
        </button>
      )}

      {(status === 'confirmed' || status === 'waitlisted') && (
        <div>
          <p className="text-sm text-chalk mb-3">
            {status === 'confirmed'
              ? '参加が確定しています。'
              : 'キャンセル待ちです。空きが出次第、自動的に繰り上がります。'}
          </p>
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
          >
            キャンセルする
          </button>
        </div>
      )}
    </div>
  )
}
