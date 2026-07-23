import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type OfferRow = Database['public']['Tables']['event_offers']['Row'] & {
  events: {
    event_title: string
    event_start_at: string | null
    profiles: { display_name: string } | null
  } | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: '返答待ち',
  accepted: '承諾済み',
  declined: '辞退済み',
  withdrawn: '取り下げ済み',
}

export function MyOffersPage() {
  const navigate = useNavigate()
  const [offers, setOffers] = useState<OfferRow[] | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/sign-in')
        return
      }
      const { data } = await supabase
        .from('event_offers')
        .select('*, events(event_title, event_start_at, profiles!events_store_id_fkey(display_name))')
        .eq('pro_id', user.id)
        .neq('offer_status', 'candidate')
        .order('created_at', { ascending: false })
      setOffers((data as OfferRow[]) ?? [])
    }
    load()
  }, [navigate])

  if (offers === null) return null

  return (
    <div className="min-h-screen bg-ink font-tl-sans px-6 py-16 flex justify-center">
      <div className="w-full max-w-[560px]">
        <Link to="/me" className="flex items-center gap-1 font-tl-mono text-xs text-chalk-dim tracking-wide hover:text-dart-red transition-colors mb-6">
          ← マイページ
        </Link>
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-chalk mb-10">
          オファー一覧
        </h1>

        {offers.length === 0 ? (
          <p className="text-sm text-chalk-dim">まだオファーはありません。</p>
        ) : (
          <div className="border-t border-brass/35">
            {offers.map((offer) => (
              <Link
                key={offer.event_id}
                to={`/events/${offer.event_id}`}
                className="block py-4 border-b border-brass/20 hover:text-dart-red transition-colors"
              >
                <div className="font-tl-mono text-xs text-chalk-dim tracking-wide">
                  {offer.events?.event_start_at ? new Date(offer.events.event_start_at).toLocaleDateString('ja-JP') : '日程未定'}
                </div>
                <div className="text-chalk mt-1">{offer.events?.event_title}</div>
                <div className="text-xs text-chalk-dim mt-0.5">
                  {offer.events?.profiles?.display_name} ・ {STATUS_LABEL[offer.offer_status]}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
