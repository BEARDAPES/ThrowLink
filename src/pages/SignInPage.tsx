import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { supabase } from '../lib/supabase'

const inputClass =
  'w-full bg-ink-2 border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans focus:outline-none focus:border-dart-red transition-colors'

export function SignInPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const startInReset = searchParams.get('mode') === 'reset'
  const resetJustSucceeded = searchParams.get('reset') === 'success'

  const [showEmailForm, setShowEmailForm] = useState(startInReset || resetJustSucceeded)
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(startInReset ? 'reset' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(
    resetJustSucceeded ? 'パスワードを再設定しました。新しいパスワードでサインインしてください。' : null
  )
  const [submitting, setSubmitting] = useState(false)
  const [actionCompleted, setActionCompleted] = useState(false)

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/me` },
    })
  }

  function switchMode(next: 'signin' | 'signup' | 'reset') {
    setMode(next)
    setError(null)
    setInfo(null)
    setActionCompleted(false)
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    setActionCompleted(false)
    setInfo(null)
  }

  function handlePasswordChange(value: string) {
    setPassword(value)
    setActionCompleted(false)
    setInfo(null)
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      setSubmitting(false)
      if (error) {
        setError(error.message)
        return
      }
      setInfo('パスワード再設定用のメールを送信しました。メール内のリンクをクリックしてください。')
      setActionCompleted(true)
      return
    }

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setSubmitting(false)
      if (error) {
        setError(error.message)
        return
      }
      navigate('/me')
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/me` },
    })
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data.session) {
      navigate('/me')
      return
    }
    setInfo('確認メールを送信しました。メール内のリンクをクリックしてください。')
    setActionCompleted(true)
  }

  const submitDisabled = submitting || actionCompleted
  const linkClass = 'font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-chalk transition-colors'

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6 font-tl-sans">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl font-bold text-chalk mb-8 uppercase tracking-wide">
          Sign in
        </h1>

        <button
          onClick={handleGoogleSignIn}
          className="w-full font-tl-mono text-sm font-semibold tracking-wide text-ink bg-chalk px-4 py-3 rounded-sm hover:opacity-90 transition-opacity"
        >
          Googleでサインイン
        </button>

        {!showEmailForm ? (
          <button type="button" onClick={() => setShowEmailForm(true)} className={`mt-6 ${linkClass}`}>
            メールアドレスで続ける
          </button>
        ) : (
          <form onSubmit={handleEmailSubmit} className="mt-6 text-left space-y-4">
            {mode !== 'reset' && (
              <div className="flex items-center justify-center gap-4 font-tl-mono text-xs tracking-wide">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className={mode === 'signin' ? 'text-dart-red' : 'text-chalk-dim hover:text-chalk transition-colors'}
                >
                  サインイン
                </button>
                <span className="text-brass/50">/</span>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={mode === 'signup' ? 'text-dart-red' : 'text-chalk-dim hover:text-chalk transition-colors'}
                >
                  新規登録
                </button>
              </div>
            )}

            <div>
              <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1">メールアドレス</label>
              <input type="email" value={email} onChange={(e) => handleEmailChange(e.target.value)} required className={inputClass} />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1">パスワード</label>
                <input type="password" value={password} onChange={(e) => handlePasswordChange(e.target.value)} required minLength={6} className={inputClass} />
              </div>
            )}

            {error && <p className="text-dart-red text-sm">{error}</p>}
            {info && <p className="text-chalk-dim text-sm">{info}</p>}

            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full font-tl-mono text-sm font-semibold tracking-wide text-chalk border border-brass px-4 py-2 rounded-sm hover:border-dart-red hover:text-dart-red transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '送信中...' : mode === 'signin' ? 'サインイン' : mode === 'signup' ? 'アカウントを作成' : 'リセットリンクを送信'}
            </button>

            <div className="text-center">
              {mode === 'signin' && (
                <button type="button" onClick={() => switchMode('reset')} className={linkClass}>
                  パスワードをお忘れですか？
                </button>
              )}
              {mode === 'reset' && (
                <button type="button" onClick={() => switchMode('signin')} className={linkClass}>
                  サインインに戻る
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
