import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'

const NAV_LINKS = [
  { to: '/players', label: 'プレイヤー一覧' },
  { to: '/stores', label: '店舗一覧' },
]

export function NavBar() {
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsSignedIn(!!data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session?.user)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <header className="bg-ink border-b border-brass/35 px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-display text-sm font-bold uppercase tracking-[0.15em] text-chalk">
          ThrowLink
        </Link>
        <nav className="flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="font-tl-mono text-xs text-chalk-dim tracking-wide hover:text-dart-red transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to={isSignedIn ? '/me' : '/sign-in'}
            className="font-tl-mono text-xs text-chalk-dim tracking-wide hover:text-dart-red transition-colors"
          >
            {isSignedIn ? 'マイページ' : 'サインイン'}
          </Link>
        </nav>
      </div>
    </header>
  )
}
