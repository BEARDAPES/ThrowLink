import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type StaffRow = Database['public']['Tables']['store_staff']['Row'] & {
  players: {
    is_pro: boolean
    profiles: { display_name: string; avatar_url: string | null; slug: string | null } | null
  } | null
}
type PlayerOption = { id: string; display_name: string; avatar_url: string | null }

const STATUS_LABEL: Record<string, string> = {
  invited: '招待中',
  active: '在籍中',
  declined: '辞退',
  left: '離職',
  withdrawn: '招待取り消し',
}

export function StoreStaffPage() {
  const navigate = useNavigate()
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [status, setStatus] = useState<'loading' | 'ready'>('loading')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlayerOption[]>([])
  const [storeId, setStoreId] = useState<string | null>(null)
  const [storeSlug, setStoreSlug] = useState<string | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/sign-in')
      return
    }
    setStoreId(user.id)

    const { data: profileData } = await supabase.from('profiles').select('slug').eq('id', user.id).maybeSingle()
    setStoreSlug(profileData?.slug ?? null)

    const { data } = await supabase
      .from('store_staff')
      .select('*, players(is_pro, profiles(display_name, avatar_url, slug))')
      .eq('store_id', user.id)
      .order('created_at', { ascending: false })

    setStaff((data as StaffRow[]) ?? [])
    setStatus('ready')
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('role', 'player')
        .ilike('display_name', `%${query}%`)
        .limit(5)
      const currentlyLinked = new Set(
        staff.filter((s) => s.status === 'invited' || s.status === 'active').map((s) => s.player_id)
      )
      setResults((data ?? []).filter((p) => !currentlyLinked.has(p.id)))
    }, 250)
    return () => clearTimeout(timer)
  }, [query, staff])

  // 検索経由(新規 or 過去の相手)と、過去スタッフ一覧の「再雇用」ボタンの
  // 両方から呼ばれる共通処理。既存行があればinvitedに戻し、無ければ新規作成する。
  async function inviteOrReinvite(playerId: string) {
    if (!storeId) return
    const existing = staff.find((s) => s.player_id === playerId)

    if (existing) {
      await supabase
        .from('store_staff')
        .update({ status: 'invited', is_admin: false })
        .eq('store_id', storeId)
        .eq('player_id', playerId)
    } else {
      await supabase.from('store_staff').insert({ store_id: storeId, player_id: playerId })
    }

    setQuery('')
    setResults([])
    await load()
  }

  async function toggleAdmin(row: StaffRow) {
    if (!storeId) return
    await supabase.from('store_staff').update({ is_admin: !row.is_admin }).eq('store_id', storeId).eq('player_id', row.player_id)
    await load()
  }

  async function markAsLeft(row: StaffRow) {
    if (!storeId) return
    await supabase.from('store_staff').update({ status: 'left' }).eq('store_id', storeId).eq('player_id', row.player_id)
    await load()
  }

  async function cancelInvitation(row: StaffRow) {
    if (!storeId) return
    await supabase.from('store_staff').update({ status: 'withdrawn' }).eq('store_id', storeId).eq('player_id', row.player_id)
    await load()
  }

  if (status === 'loading') return null

  const invited = staff.filter((s) => s.status === 'invited')
  const active = staff.filter((s) => s.status === 'active')
  const inactive = staff.filter((s) => s.status === 'declined' || s.status === 'left' || s.status === 'withdrawn')

  return (
    <div className="min-h-screen bg-ink font-tl-sans px-6 py-16 flex justify-center">
      <div className="w-full max-w-[560px]">
        {storeSlug && (
          <Link
            to={`/stores/${storeSlug}`}
            className="flex items-center gap-1 font-tl-mono text-xs text-chalk-dim tracking-wide hover:text-dart-red transition-colors mb-6"
          >
            ← 店舗ホーム
          </Link>
        )}

        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-chalk mb-10">
          スタッフ管理
        </h1>

        {active.length > 0 && (
          <div className="mb-8">
            <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">在籍中</p>
            <div className="space-y-2">
              {active.map((row) => (
                <div key={row.player_id} className="bg-ink-2 border border-brass/50 rounded-sm px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-full border border-brass/50 overflow-hidden shrink-0 bg-ink flex items-center justify-center font-display text-[10px] text-chalk">
                        {row.players?.profiles?.avatar_url ? (
                          <img src={row.players.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          row.players?.profiles?.display_name?.trim().slice(0, 2) ?? '?'
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="text-chalk text-sm truncate">{row.players?.profiles?.display_name}</div>
                        {row.players?.is_pro && (
                          <span className="font-tl-mono text-[9px] font-semibold tracking-widest text-ink bg-dart-red px-1.5 py-0.5 rounded-sm">PRO</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => markAsLeft(row)}
                      className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors shrink-0"
                    >
                      離職にする
                    </button>
                  </div>
                  <label className="flex items-center gap-2 mt-2.5 cursor-pointer">
                    <input type="checkbox" checked={row.is_admin} onChange={() => toggleAdmin(row)} className="w-3.5 h-3.5 accent-dart-red" />
                    <span className="font-tl-mono text-xs text-chalk-dim">管理者権限(イベント作成・オファー送信・スケジュール代理編集が可能)</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {invited.length > 0 && (
          <div className="mb-8">
            <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">招待中</p>
            <div className="space-y-2">
              {invited.map((row) => (
                <div key={row.player_id} className="flex items-center justify-between bg-ink-2 border border-brass/50 rounded-sm px-3 py-2">
                  <span className="text-chalk text-sm">{row.players?.profiles?.display_name}</span>
                  <button
                    type="button"
                    onClick={() => cancelInvitation(row)}
                    className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
                  >
                    招待を取り消す
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">スタッフを招待する</p>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="プレイヤー名で検索"
            className="w-full bg-ink-2 border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans focus:outline-none focus:border-dart-red transition-colors"
          />
          {results.length > 0 && (
            <div className="mt-2 border border-brass/50 rounded-sm divide-y divide-brass/20">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => inviteOrReinvite(p.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-chalk hover:bg-ink-2 transition-colors"
                >
                  <span>{p.display_name}</span>
                  <span className="font-tl-mono text-xs text-chalk-dim">招待する</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {inactive.length > 0 && (
          <div>
            <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">過去のスタッフ</p>
            <div className="space-y-2">
              {inactive.map((row) => (
                <div key={row.player_id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <span className="text-chalk-dim text-sm">{row.players?.profiles?.display_name}</span>
                    <span className="font-tl-mono text-xs text-chalk-dim ml-2">{STATUS_LABEL[row.status]}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => inviteOrReinvite(row.player_id)}
                    className="font-tl-mono text-xs text-dart-red hover:opacity-80 transition-opacity shrink-0"
                  >
                    再雇用する
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
