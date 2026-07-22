import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { NotificationPanel } from './NotificationPanel'

const navIconClass = 'flex items-center justify-center text-chalk-dim hover:text-dart-red transition-colors relative p-1'

export function NavBar() {
  const navigate = useNavigate()
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (active) setIsSignedIn(!!user)
    }

    load()
    return () => {
      active = false
    }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/sign-in')
  }

  return (
    <nav className="border-b border-brass/35">
      <div className="max-w-[600px] mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-sm font-bold tracking-[0.15em] uppercase text-chalk">
          ThrowLink
        </Link>

        <div className="flex items-center gap-3.5">
          <Link to="/players" title="プレイヤー一覧" className={navIconClass}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Link>
          <Link to="/stores" title="店舗一覧" className={navIconClass}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l1-4h16l1 4" />
              <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
              <path d="M9 20v-6h6v6" />
              <line x1="3" y1="9" x2="21" y2="9" />
            </svg>
          </Link>

          {isSignedIn && (
            <>
              <span className="w-px h-4 bg-brass/35" />
              <Link to="/me" title="マイページ" className={navIconClass}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <path d="M9 22V12h6v10" />
                </svg>
              </Link>
              <button type="button" onClick={() => setNotificationsOpen(true)} title="お知らせ" className={navIconClass}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </button>
              <button type="button" onClick={handleSignOut} title="サインアウト" className={navIconClass}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </button>
            </>
          )}

          {isSignedIn === false && (
            <Link to="/sign-in" className="font-tl-mono text-xs text-chalk-dim tracking-wide hover:text-dart-red transition-colors">
              サインイン
            </Link>
          )}
        </div>
      </div>

      <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </nav>
  )
}
