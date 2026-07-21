import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'

interface HistoryItem {
  eventTitle: string
  eventStartAt: string | null
  storeName: string | null
}

export function MyEventHistoryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<HistoryItem[] | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/sign-in')
        return
      }

      const { data: reservations } = await supabase
        .from('reservations')
        .select('events(event_title, event_start_at, status, store_id)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')

      const completed = (reservations ?? [])
        .map((r) => r.events)
        .filter((e): e is NonNullable<typeof e> => !!e && e.status === 'completed')

      const storeIds = [...new Set(completed.map((e) => e.store_id).filter((id): id is string => !!id))]
      const { data: stores } = storeIds.length
        ? await supabase.from('profiles').select('id, display_name').in('id', storeIds)
        : { data: [] }

      const storeNameById = new Map((stores ?? []).map((s) => [s.id, s.display_name]))

      const history = completed
        .map((e) => ({
          eventTitle: e.event_title,
          eventStartAt: e.event_start_at,
          storeName: e.store_id ? storeNameById.get(e.store_id) ?? null : null,
        }))
        .sort((a, b) => new Date(b.eventStartAt ?? 0).getTime() - new Date(a.eventStartAt ?? 0).getTime())

      setItems(history)
    }

    load()
  }, [navigate])

  if (items === null) return null

  return (
    <div className="min-h-screen bg-ink font-tl-sans px-6 py-16 sm:py-24 flex justify-center">
      <div className="w-full max-w-[560px]">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-chalk mb-10">
          参加したイベント
        </h1>

        {items.length === 0 ? (
          <p className="text-sm text-chalk-dim">まだ参加したイベントはありません。</p>
        ) : (
          <div className="border-t border-brass/35">
            {items.map((item, i) => (
              <div key={i} className="py-4 border-b border-brass/20">
                <div className="font-tl-mono text-xs text-chalk-dim tracking-wide">
                  {item.eventStartAt ? new Date(item.eventStartAt).toLocaleDateString('ja-JP') : '日程未定'}
                </div>
                <div className="text-chalk mt-1">{item.eventTitle}</div>
                {item.storeName && <div className="text-xs text-chalk-dim mt-0.5">{item.storeName}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
