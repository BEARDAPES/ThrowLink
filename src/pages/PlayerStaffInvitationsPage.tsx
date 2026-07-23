import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type StaffRow = Database['public']['Tables']['store_staff']['Row']
type StoreInfo = { display_name: string; avatar_url: string | null; slug: string | null }
type InvitationRow = StaffRow & { store: StoreInfo | null }

export function PlayerStaffInvitationsPage() {
  const navigate = useNavigate()
  const [invitations, setInvitations] = useState<InvitationRow[]>([])
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/sign-in')
      return
    }
    setPlayerId(user.id)

    const { data: staffData } = await supabase
      .from('store_staff')
      .select('*')
      .eq('player_id', user.id)
      .eq('status', 'invited')
      .order('created_at', { ascending: false })

    const storeIds = (staffData ?? []).map((s) => s.store_id)
    let storesById: Record<string, StoreInfo> = {}

    if (storeIds.length > 0) {
      const { data: storesData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, slug')
        .in('id', storeIds)
      storesById = Object.fromEntries((storesData ?? []).map((s) => [s.id, s]))
    }

    const combined: InvitationRow[] = (staffData ?? []).map((s) => ({
      ...s,
      store: storesById[s.store_id] ?? null,
    }))

    setInvitations(combined)
    setStatus('ready')
  }

  useEffect(() => {
    load()
  }, [])

  async function respond(storeId: string, accept: boolean) {
    if (!playerId) return
    await supabase
      .from('store_staff')
      .update({ status: accept ? 'active' : 'declined' })
      .eq('store_id', storeId)
      .eq('player_id', playerId)
    await load()
  }

  if (status === 'loading') return null

  return (
    <div className="min-h-screen bg-ink font-tl-sans px-6 py-16 flex justify-center">
      <div className="w-full max-w-[560px]">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-chalk mb-10">
          スタッフ招待
        </h1>

        {invitations.length === 0 ? (
          <p className="text-sm text-chalk-dim">現在届いている招待はありません。</p>
        ) : (
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div key={inv.store_id} className="bg-ink-2 border border-brass/50 rounded-sm px-4 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 rounded-full border border-brass/50 overflow-hidden shrink-0 bg-ink flex items-center justify-center font-display text-xs text-chalk">
                    {inv.store?.avatar_url ? (
                      <img src={inv.store.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      inv.store?.display_name?.trim().slice(0, 2) ?? '?'
                    )}
                  </span>
                  <div>
                    <div className="text-chalk text-sm">
                      {inv.store?.slug ? (
                        <Link to={`/stores/${inv.store.slug}`} className="underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors">
                          {inv.store.display_name}
                        </Link>
                      ) : (
                        inv.store?.display_name
                      )}
                    </div>
                    <div className="font-tl-mono text-xs text-chalk-dim">からスタッフ招待が届いています</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => respond(inv.store_id, true)}
                    className="font-tl-mono text-xs font-semibold text-ink bg-dart-red px-3 py-2 rounded-sm hover:opacity-90 transition-opacity"
                  >
                    承諾する
                  </button>
                  <button
                    type="button"
                    onClick={() => respond(inv.store_id, false)}
                    className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
                  >
                    辞退する
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
