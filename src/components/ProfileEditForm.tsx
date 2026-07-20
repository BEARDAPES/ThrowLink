import { useState } from 'react'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type OfferConditions = Database['public']['Tables']['pro_offer_conditions']['Row']

interface ProfileEditFormProps {
  profile: Profile
  offerConditions: OfferConditions | null
  onSave: (updates: {
    profile: Partial<Profile>
    offerConditions: { unit_price: string; notes: string } | null
  }) => Promise<void>
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/

const inputClass =
  'w-full bg-ink-2 border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans focus:outline-none focus:border-dart-red transition-colors'

export function ProfileEditForm({ profile, offerConditions, onSave }: ProfileEditFormProps) {
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [slug, setSlug] = useState(profile.slug ?? '')
  const [bioText, setBioText] = useState(profile.bio_text ?? '')
  const [location, setLocation] = useState(profile.location ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [statsUrl, setStatsUrl] = useState(profile.stats_url ?? '')
  const [isPro, setIsPro] = useState(profile.is_pro)
  const [unitPrice, setUnitPrice] = useState(offerConditions?.unit_price ?? '')
  const [notes, setNotes] = useState(offerConditions?.notes ?? '')

  const [slugError, setSlugError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!SLUG_PATTERN.test(slug)) {
      setSlugError('小文字英数字とハイフンのみ、3〜30文字で入力してください')
      return
    }
    setSlugError(null)
    setSaving(true)

    await onSave({
      profile: {
        display_name: displayName,
        slug,
        bio_text: bioText || null,
        location: location || null,
        avatar_url: avatarUrl || null,
        stats_url: statsUrl || null,
        is_pro: isPro,
      },
      offerConditions: isPro ? { unit_price: unitPrice, notes } : null,
    })

    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-screen bg-ink font-tl-sans px-6 py-16 sm:py-24 flex justify-center">
      <div className="w-full max-w-[560px]">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-chalk mb-10">
          プロフィール編集
        </h1>

        <div className="space-y-6 pb-8 border-b border-brass/35 mb-8">
          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">表示名</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className={inputClass} />
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">プロフィールURL</label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required className={inputClass} />
            {slugError ? (
              <p className="mt-1 text-xs text-dart-red font-tl-mono">{slugError}</p>
            ) : (
              <p className="mt-1 text-xs text-chalk-dim font-tl-mono">throwlink.app/players/{slug || '...'}</p>
            )}
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">活動拠点</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">自己紹介</label>
            <textarea value={bioText} onChange={(e) => setBioText(e.target.value)} rows={4} className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">プロフィール画像URL</label>
            <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className={inputClass} />
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">公式記録リンク</label>
            <input type="url" value={statsUrl} onChange={(e) => setStatsUrl(e.target.value)} placeholder="https://..." className={inputClass} />
          </div>
        </div>

        <label className="flex items-center gap-3 mb-8 cursor-pointer">
          <input type="checkbox" checked={isPro} onChange={(e) => setIsPro(e.target.checked)} className="w-4 h-4 accent-dart-red" />
          <span className="font-tl-mono text-sm text-chalk tracking-wide">プロプレイヤーとして活動する</span>
        </label>

        {isPro && (
          <div className="space-y-6 pb-8 border-b border-brass/35 mb-8">
            <p className="font-tl-mono text-xs text-chalk-dim tracking-wide">以下は店舗アカウントにのみ公開されます</p>
            <div>
              <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">単価などの出演条件</label>
              <input type="text" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">備考</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="font-tl-mono text-sm font-semibold tracking-wide text-ink bg-dart-red px-4 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存する'}
        </button>
      </div>
    </form>
  )
}
