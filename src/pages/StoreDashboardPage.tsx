import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type EventRow = Database['public']['Tables']['events']['Row']
type OfferRow = Database['public']['Tables']['event_offers']['Row'] & {
  profiles: { display_name: string } | null
}

const STATUS_GROUPS = [
  { key: 'draft', label: '公開準備中' },
  { key: 'published', label: '公開中' },
  { key: 'completed', label: '終了' },
  { key: 'cancelled', label: 'キャンセル' },
] as const

export function StoreDashboardPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventRow[] | null>(null)
  const [offersByEvent, setOffersByEvent] = useState<Record<string, OfferRow[]>>({})
  const [storeSlug, setStoreSlug] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/sign-in')
        return
      }

      const { data: profileData } = await supabase.from('profiles').select('slug').eq('id', user.id).maybeSingle()
      setStoreSlug(profileData?.slug ?? null)

      const { data: eventsData } = await supabase
        .from('events')
        .select('*')
        .eq('store_id', user.id)
        .order('event_start_at', { ascending: false })

      setEvents(eventsData ?? [])

      const eventIds = (eventsData ?? []).map((e) => e.id)
      if (eventIds.length > 0) {
        const { data: offersData } = await supabase
          .from('event_offers')
          .select('*, profiles(display_name)')
          .in('event_id', eventIds)

        const grouped: Record<string, OfferRow[]> = {}
        for (const offer of (offersData as OfferRow[]) ?? []) {
          grouped[offer.event_id] = [...(grouped[offer.event_id] ?? []), offer]
        }
        setOffersByEvent(grouped)
      }
    }

    load()
  }, [navigate])

  if (events === null) return null

  return (
    <div className="min-h-screen bg-ink font-tl-sans px-6 py-16 sm:py-24 flex justify-center">
      <div className="w-full max-w-[560px]">
        {storeSlug && (
          <Link
            to={`/stores/${storeSlug}`}
            className="flex items-center gap-1 font-tl-mono text-xs text-chalk-dim tracking-wide hover:text-dart-red transition-colors mb-6"
          >
            ← 店舗ホーム
          </Link>
        )}

        <div className="flex items-center justify-between mb-10">
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-chalk">
            依頼・イベント管理
          </h1>
          <Link
            to="/events/new"
            className="font-tl-mono text-xs font-semibold tracking-wide text-ink bg-dart-red px-3 py-2 rounded-sm hover:opacity-90 transition-opacity shrink-0"
          >
            + 新規作成
          </Link>
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-chalk-dim">まだイベントがありません。</p>
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
                  {items.map((event) => {
                    const offers = offersByEvent[event.id] ?? []
                    return (
                      <Link
                        key={event.id}
                        to={`/events/${event.id}`}
                        className="block py-4 border-b border-brass/20 hover:text-dart-red transition-colors"
                      >
                        <div className="font-tl-mono text-xs text-chalk-dim tracking-wide">
                          {event.event_start_at ? new Date(event.event_start_at).toLocaleDateString('ja-JP') : '日程未定'}
                        </div>
                        <div className="text-chalk mt-1">{event.event_title}</div>
                        {offers.length > 0 && (
                          <div className="text-xs text-chalk-dim mt-0.5">
                            {offers.map((o) => `${o.profiles?.display_name}(${
                              { candidate: '候補', pending: 'オファー中', accepted: '承諾', declined: '辞退', withdrawn: '取り下げ' }[o.offer_status]
                            })`).join(' / ')}
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
