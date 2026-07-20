import { useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'

export function OnboardingPage() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  async function choose(role: 'player' | 'store') {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/sign-in')
      return
    }
    await supabase.from('profiles').update({ role }).eq('id', user.id)
    navigate('/me/edit')
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6 font-tl-sans">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-2xl font-bold text-chalk mb-2 uppercase tracking-wide">
          ようこそ
        </h1>
        <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-10">
          アカウントの種類を選んでください
        </p>
        <div className="space-y-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => choose('player')}
            className="w-full font-tl-mono text-sm font-semibold tracking-wide text-ink bg-dart-red px-4 py-3 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            プレイヤー / ファンとして登録
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => choose('store')}
            className="w-full font-tl-mono text-sm font-semibold tracking-wide text-chalk border border-brass px-4 py-3 rounded-sm hover:border-dart-red hover:text-dart-red transition-colors disabled:opacity-50"
          >
            店舗として登録
          </button>
        </div>
      </div>
    </div>
  )
}
