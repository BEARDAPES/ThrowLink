import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'

const inputClass =
  'w-full bg-ink-2 border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans focus:outline-none focus:border-dart-red transition-colors'

type Status = 'checking' | 'ready' | 'invalid'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const url = new URL(window.location.href)
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
    const description = url.searchParams.get('error_description') || hashParams.get('error_description')

    if (description) {
      setStatus('invalid')
      window.history.replaceState({}, '', url.pathname)
      return
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStatus('ready')
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus('ready')
    })

    // イベントもエラーも検知できないまま時間が経った場合は、無効なリンクとして扱う。
    const timeout = setTimeout(() => {
      setStatus((current) => (current === 'checking' ? 'invalid' : current))
    }, 5000)

    return () => {
      sub.subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setSubmitting(false)
      setError(error.message)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ has_password_login: true }).eq('id', user.id)
    }

    // リセット直後に自動でログイン状態にはせず、改めてサインインしてもらう。
    await supabase.auth.signOut()
    navigate('/sign-in?reset=success')
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center font-tl-sans">
        <p className="text-sm text-chalk-dim">リンクを確認しています...</p>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center px-6 font-tl-sans text-center">
        <div>
          <p className="text-sm text-chalk mb-4">
            このリンクは無効か、有効期限が切れています。
          </p>
          <Link
            to="/sign-in?mode=reset"
            className="font-tl-mono text-xs text-dart-red underline decoration-brass/50 underline-offset-4 hover:opacity-80 transition-opacity"
          >
            もう一度パスワード再設定をリクエストする
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6 font-tl-sans">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-chalk mb-8 uppercase tracking-wide text-center">
          新しいパスワードを設定
        </h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
          placeholder="新しいパスワード(6文字以上)"
          className={inputClass}
        />
        {error && <p className="text-dart-red text-sm mt-2">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-4 font-tl-mono text-sm font-semibold tracking-wide text-ink bg-dart-red px-4 py-3 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? '設定中...' : 'パスワードを設定する'}
        </button>
      </form>
    </div>
  )
}
