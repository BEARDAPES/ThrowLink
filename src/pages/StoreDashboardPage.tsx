import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type EventRow = Database['public']['Tables']['events']['Row'] & {
  profiles: { display_name: string; slug: string | null } | null
}

const STATUS_GROUPS = [
  { key: 'pending_pro', label: '打診中' },
  { key: 'published', label: '確定' },
  { key: 'completed', label: '終了' },
  { key: 'cancelled', label: 'キャンセル' },
] as const

export function StoreDashboardPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventRow[] | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/sign-in')
        return
      }

      const { data } = await supabase
        .from('events')
        .select('*, profiles!events_pro_id_fkey(display_name, slug)')
        .eq('store_id', user.id)
        .order('event_date', { ascending: false })

      setEvents((data as EventRow[]) ?? [])
    }

    load()
  }, [navigate])

  if (events === null) return null

  return (
    <div className="min-h-screen bg-ink font-tl-sans px-6 py-16 sm:py-24 flex justify-center">
      <div className="w-full max-w-[560px]">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-chalk mb-10">
          依頼・イベント管理
        </h1>

        {events.length === 0 ? (
          <p className="text-sm text-chalk-dim">まだ依頼したイベントはありません。</p>
        ) : (
          STATUS_GROUPS.map((group) => {
            const items = events.filter((e) => e.status === group.key)
            if (items.length === 0) return null
            return (
              <div key={group.key} className="mb-10">
                <h2 className="font-tl-mono text-xs text-chalk-dim tracking-widest uppercase mb-3">
                  {group.label}（{items.length}）
                </h2>
                <div className="border-t border-brass/35">
                  {items.map((event) => (
                    <div key={event.id} className="py-4 border-b border-brass/20">
                      <div className="font-tl-mono text-xs text-chalk-dim tracking-wide">
                        {new Date(event.event_date).toLocaleDateString('ja-JP')}
                      </div>
                      <div className="text-chalk mt-1">{event.event_title}</div>
                      {event.profiles?.slug && (
                        <Link
                          to={`/players/${event.profiles.slug}`}
                          className="text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors mt-0.5 inline-block"
                        >
                          {event.profiles.display_name}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
