import { useState } from 'react'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type OfferConditions = Database['public']['Tables']['pro_offer_conditions']['Row']
type SnsLink = { platform: string; url: string }

interface ProfileEditFormProps {
  profile: Profile
  offerConditions: OfferConditions | null
  onSave: (updates: {
    profile: Partial<Profile>
    offerConditions: { unit_price: string; notes: string } | null
  }) => Promise<void>
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/

const SNS_PLATFORMS = [
  { key: 'x', label: 'X', pattern: /^https:\/\/(www\.)?(x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/?$/, hint: 'https://x.com/ユーザー名' },
  { key: 'instagram', label: 'Instagram', pattern: /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.]{1,30}\/?$/, hint: 'https://instagram.com/ユーザー名' },
  { key: 'youtube', label: 'YouTube', pattern: /^https:\/\/(www\.)?youtube\.com\/(@[A-Za-z0-9_.-]+|channel\/[A-Za-z0-9_-]+|c\/[A-Za-z0-9_-]+)\/?$/, hint: 'https://youtube.com/@チャンネル名' },
  { key: 'tiktok', label: 'TikTok', pattern: /^https:\/\/(www\.)?tiktok\.com\/@[A-Za-z0-9_.]{1,24}\/?$/, hint: 'https://tiktok.com/@ユーザー名' },
] as const

const DIRECTORY_PATTERNS = [
  /^https:\/\/livescore\.japanprodarts\.jp\/directory_detail\.php\?p=\d+$/,
  /^https:\/\/member\.prodarts\.jp\/players_detail\.php\?mem_no=\d+$/,
]
const DIRECTORY_HINT = 'JAPAN(livescore.japanprodarts.jp)またはPerfect(member.prodarts.jp)の選手ページURL'

function findSnsUrl(links: Profile['sns_links'], platform: string): string {
  if (!Array.isArray(links)) return ''
  const found = links.find(
    (item): item is SnsLink => typeof item === 'object' && item !== null && (item as SnsLink).platform === platform
  )
  return found?.url ?? ''
}

const inputClass =
  'w-full bg-ink-2 border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans focus:outline-none focus:border-dart-red transition-colors'

export function ProfileEditForm({ profile, offerConditions, onSave }: ProfileEditFormProps) {
  const isPlayerAccount = profile.role === 'player'

  const [displayName, setDisplayName] = useState(profile.display_name)
  const [slug, setSlug] = useState(profile.slug ?? '')
  const [bioText, setBioText] = useState(profile.bio_text ?? '')
  const [location, setLocation] = useState(profile.location ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [directoryUrl, setDirectoryUrl] = useState(profile.player_directory_url ?? '')
  const [isPro, setIsPro] = useState(profile.is_pro)
  const [unitPrice, setUnitPrice] = useState(offerConditions?.unit_price ?? '')
  const [notes, setNotes] = useState(offerConditions?.notes ?? '')
  const [snsUrls, setSnsUrls] = useState<Record<string, string>>(
    Object.fromEntries(SNS_PLATFORMS.map((p) => [p.key, findSnsUrl(profile.sns_links, p.key)]))
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const nextErrors: Record<string, string> = {}

    if (isPlayerAccount && !SLUG_PATTERN.test(slug)) {
      nextErrors.slug = '小文字英数字とハイフンのみ、3〜30文字で入力してください'
    }

    for (const p of SNS_PLATFORMS) {
      const value = snsUrls[p.key]?.trim()
      if (value && !p.pattern.test(value)) {
        nextErrors[p.key] = `形式が正しくありません（例: ${p.hint}）`
      }
    }

    if (isPlayerAccount && directoryUrl.trim() && !DIRECTORY_PATTERNS.some((re) => re.test(directoryUrl.trim()))) {
      nextErrors.directoryUrl = DIRECTORY_HINT
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})
    setSaving(true)

    const snsLinks: SnsLink[] = SNS_PLATFORMS.filter((p) => snsUrls[p.key]?.trim()).map((p) => ({
      platform: p.key,
      url: snsUrls[p.key].trim(),
    }))

    await onSave({
      profile: {
        display_name: displayName,
        slug: isPlayerAccount ? slug : profile.slug,
        bio_text: bioText || null,
        location: location || null,
        avatar_url: avatarUrl || null,
        player_directory_url: isPlayerAccount ? directoryUrl || null : null,
        is_pro: isPlayerAccount ? isPro : false,
        sns_links: snsLinks,
      },
      offerConditions: isPlayerAccount && isPro ? { unit_price: unitPrice, notes } : null,
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
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">
              {isPlayerAccount ? '表示名' : '店舗名'}
            </label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className={inputClass} />
          </div>

          {isPlayerAccount && (
            <div>
              <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">プロフィールURL</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} required className={inputClass} />
              {errors.slug ? (
                <p className="mt-1 text-xs text-dart-red font-tl-mono">{errors.slug}</p>
              ) : (
                <p className="mt-1 text-xs text-chalk-dim font-tl-mono">throwlink.app/players/{slug || '...'}</p>
              )}
            </div>
          )}

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">
              {isPlayerAccount ? '活動拠点' : '所在地・エリア'}
            </label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">
              {isPlayerAccount ? '自己紹介' : '店舗紹介'}
            </label>
            <textarea value={bioText} onChange={(e) => setBioText(e.target.value)} rows={4} className={`${inputClass} resize-none`} />
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">
              {isPlayerAccount ? 'プロフィール画像URL' : '店舗ロゴ・写真URL'}
            </label>
            <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." className={inputClass} />
          </div>
        </div>

        <div className="space-y-4 pb-8 border-b border-brass/35 mb-8">
          <p className="font-tl-mono text-xs text-chalk-dim tracking-wide">SNSリンク(自己申告・未検証として表示されます)</p>
          {SNS_PLATFORMS.map((p) => (
            <div key={p.key}>
              <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">{p.label}</label>
              <input
                type="url"
                value={snsUrls[p.key]}
                onChange={(e) => setSnsUrls((prev) => ({ ...prev, [p.key]: e.target.value }))}
                placeholder={p.hint}
                className={inputClass}
              />
              {errors[p.key] && <p className="mt-1 text-xs text-dart-red font-tl-mono">{errors[p.key]}</p>}
            </div>
          ))}
        </div>

        {isPlayerAccount && (
          <>
            <label className="flex items-center gap-3 mb-8 cursor-pointer">
              <input type="checkbox" checked={isPro} onChange={(e) => setIsPro(e.target.checked)} className="w-4 h-4 accent-dart-red" />
              <span className="font-tl-mono text-sm text-chalk tracking-wide">プロプレイヤーとして活動する</span>
            </label>

            {isPro && (
              <div className="space-y-6 pb-8 border-b border-brass/35 mb-8">
                <div>
                  <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">選手名鑑URL(JAPANまたはPerfect)</label>
                  <input type="url" value={directoryUrl} onChange={(e) => setDirectoryUrl(e.target.value)} placeholder="https://..." className={inputClass} />
                  {errors.directoryUrl && <p className="mt-1 text-xs text-dart-red font-tl-mono">{errors.directoryUrl}</p>}
                </div>
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
          </>
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
