import { useEffect, useState } from 'react'
import { FaGoogle, FaEnvelope } from 'react-icons/fa6'
import { supabase } from '../lib/supabase'
import type { UserIdentity } from '@supabase/supabase-js'

const PROVIDER_LABELS: Record<string, string> = {
  email: 'メールアドレス',
  google: 'Google',
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  email: <FaEnvelope />,
  google: <FaGoogle />,
}

const LINKABLE_OAUTH_PROVIDERS = [{ key: 'google', label: 'Google', icon: <FaGoogle /> }] as const

const inputClass =
  'w-full bg-ink border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans text-sm focus:outline-none focus:border-dart-red transition-colors'

const iconClass = 'w-4 h-4 flex items-center justify-center shrink-0 text-chalk-dim'

interface ConnectedAccountsPanelProps {
  hasPasswordLogin: boolean
}

export function ConnectedAccountsPanel({ hasPasswordLogin }: ConnectedAccountsPanelProps) {
  const [email, setEmail] = useState<string | null>(null)
  const [identities, setIdentities] = useState<UserIdentity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [passwordAdded, setPasswordAdded] = useState(hasPasswordLogin)

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    const url = new URL(window.location.href)
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
    const description = url.searchParams.get('error_description') || hashParams.get('error_description')

    if (description) {
      setError(
        description.toLowerCase().includes('already linked')
          ? 'このアカウントは既に別のユーザーに連携されているため、連携できませんでした。'
          : description
      )
      window.history.replaceState({}, '', url.pathname)
    }
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    setEmail(user?.email ?? null)

    const { data, error } = await supabase.auth.getUserIdentities()
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setIdentities(data.identities)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function linkProvider(provider: 'google') {
    setError(null)
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: `${window.location.origin}/me/edit` },
    })
    if (error) setError(error.message)
  }

  async function unlinkProvider(identity: UserIdentity) {
    setError(null)
    const { error } = await supabase.auth.unlinkIdentity(identity)
    if (error) {
      setError(
        passwordAdded
          ? 'パスワードでのログインは設定済みですが、認証基盤の仕様により解除できない場合があります。'
          : error.message
      )
      return
    }
    await load()
  }

  async function addPassword() {
    if (newPassword.trim().length < 6) return
    setSavingPassword(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setSavingPassword(false)
      setError(error.message)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ has_password_login: true }).eq('id', user.id)
    }

    setNewPassword('')
    setShowPasswordForm(false)
    setPasswordAdded(true)
    setSavingPassword(false)
  }

  if (loading) return null

  // 元からメール+パスワードでサインアップしたアカウントは、identities一覧に
  // 正規の'email'が含まれる。「後から追加したがバグで一覧に反映されない」ケースの
  // 補足行は、本物の'email'が無い場合だけ出す(重複表示を避けるため)。
  const hasEmailIdentity = identities.some((i) => i.provider === 'email')
  const showFallbackPasswordRow = passwordAdded && !hasEmailIdentity
  const hasAnyPasswordLogin = passwordAdded || hasEmailIdentity

  return (
    <div className="space-y-3 pb-8 border-b border-brass/35 mb-8">
      <p className="font-tl-mono text-xs text-chalk-dim tracking-wide">連携済みアカウント</p>

      {email && (
        <p className="text-xs text-chalk-dim">
          アカウントのメールアドレス: <span className="text-chalk">{email}</span>
          {hasAnyPasswordLogin && '(パスワードでのログインもこのアドレスで行います)'}
        </p>
      )}

      <div className="space-y-2">
        {identities.map((identity) => (
          <div key={identity.identity_id} className="flex items-center justify-between bg-ink-2 border border-brass/50 rounded-sm px-3 py-2">
            <span className="flex items-center gap-2 text-chalk text-sm">
              <span className={iconClass}>{PROVIDER_ICONS[identity.provider]}</span>
              {PROVIDER_LABELS[identity.provider] ?? identity.provider}
            </span>
            {(identities.length > 1 || passwordAdded) && (
              <button
                type="button"
                onClick={() => unlinkProvider(identity)}
                className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
              >
                解除
              </button>
            )}
          </div>
        ))}
        {showFallbackPasswordRow && (
          <div className="flex items-center justify-between bg-ink-2 border border-brass/50 rounded-sm px-3 py-2">
            <span className="flex items-center gap-2 text-chalk text-sm">
              <span className={iconClass}><FaEnvelope /></span>
              メールアドレス+パスワード
            </span>
          </div>
        )}
      </div>

      {!hasAnyPasswordLogin &&
        (showPasswordForm ? (
          <div className="space-y-2">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新しいパスワード(6文字以上)"
              className={inputClass}
            />
            <button
              type="button"
              onClick={addPassword}
              disabled={newPassword.trim().length < 6 || savingPassword}
              className="font-tl-mono text-xs font-semibold text-chalk border border-brass px-3 py-2 rounded-sm hover:border-dart-red hover:text-dart-red transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingPassword ? '設定中...' : 'パスワードを設定する'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPasswordForm(true)}
            className="flex items-center gap-2 font-tl-mono text-xs text-dart-red hover:opacity-80 transition-opacity"
          >
            <span className={iconClass}><FaEnvelope /></span>
            メール+パスワードでのログインを追加する
          </button>
        ))}

      {LINKABLE_OAUTH_PROVIDERS.filter((p) => !identities.some((i) => i.provider === p.key)).map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => linkProvider(p.key)}
          className="flex items-center gap-2 font-tl-mono text-xs text-dart-red hover:opacity-80 transition-opacity"
        >
          <span className={iconClass}>{p.icon}</span>
          {p.label}を連携する
        </button>
      ))}

      {error && <p className="text-xs text-dart-red">{error}</p>}
    </div>
  )
}
