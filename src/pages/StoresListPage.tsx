import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export function StoresListPage() {
  const [stores, setStores] = useState<Profile[] | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'store')
        .eq('onboarded', true)
        .not('slug', 'is', null)
        .order('created_at', { ascending: false })
      setStores(data ?? [])
    }
    load()
  }, [])

  if (stores === null) return null

  return (
    <div className="min-h-screen bg-ink font-tl-sans px-6 py-16 flex justify-center">
      <div className="w-full max-w-[560px]">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-chalk mb-10">
          店舗一覧
        </h1>

        {stores.length === 0 ? (
          <p className="text-sm text-chalk-dim">まだ店舗がいません。</p>
        ) : (
          <div className="border-t border-brass/35">
            {stores.map((store) => (
              <Link
                key={store.id}
                to={`/stores/${store.slug}`}
                className="flex items-center gap-3 py-3 border-b border-brass/20 hover:text-dart-red transition-colors group"
              >
                <span className="w-9 h-9 rounded-full border border-brass/50 overflow-hidden shrink-0 bg-ink-2 flex items-center justify-center font-display text-xs text-chalk">
                  {store.avatar_url ? (
                    <img src={store.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    store.display_name.trim().slice(0, 2) || '?'
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-chalk text-sm group-hover:text-dart-red transition-colors truncate">
                    {store.display_name}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
