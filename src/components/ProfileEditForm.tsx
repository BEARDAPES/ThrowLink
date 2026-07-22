import { useEffect, useState } from 'react'
import { FaXTwitter, FaInstagram, FaYoutube, FaTiktok } from 'react-icons/fa6'
import { supabase } from '../lib/supabase'
import { getDartsLiveInfo, getPhoenixInfo, DARTSLIVE_COLORS } from '../lib/ratings'
import { GENERAL_STATUS_TAGS, PRO_ONLY_STATUS_TAGS, MAX_STATUS_TAGS } from '../lib/statusTags'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']
type OfferConditions = Database['public']['Tables']['pro_offer_conditions']['Row']
type StoreOption = { id: string; display_name: string }
type SnsLink = { platform: string; url: string }

interface ProfileEditFormProps {
  profile: Profile
  player: PlayerRow | null
  offerConditions: OfferConditions | null
  onSave: (updates: {
    profile: Partial<Profile>
    player: Partial<PlayerRow> | null
    offerConditions: { pricing_type: string; unit_price_amount: number | null; notes: string } | null
  }) => Promise<void>
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/

const SNS_PLATFORMS = [
  { key: 'x', label: 'X', icon: <FaXTwitter />, prefix: 'x.com/', pattern: /^[A-Za-z0-9_]{1,15}$/, hint: '半角英数字とアンダースコアのみ、15文字以内' },
  { key: 'instagram', label: 'Instagram', icon: <FaInstagram />, prefix: 'instagram.com/', pattern: /^[A-Za-z0-9_.]{1,30}$/, hint: '30文字以内' },
  { key: 'youtube', label: 'YouTube', icon: <FaYoutube />, prefix: 'youtube.com/@', pattern: /^[A-Za-z0-9_.-]{1,30}$/, hint: '30文字以内' },
  { key: 'tiktok', label: 'TikTok', icon: <FaTiktok />, prefix: 'tiktok.com/@', pattern: /^[A-Za-z0-9_.]{1,24}$/, hint: '24文字以内' },
] as const

const DIRECTORY_PATTERNS = [
  /^https:\/\/livescore\.japanprodarts\.jp\/directory_detail\.php\?p=\d+$/,
  /^https:\/\/member\.prodarts\.jp\/players_detail\.php\?mem_no=\d+$/,
]
const DIRECTORY_HINT = 'JAPAN(livescore.japanprodarts.jp)またはPerfect(member.prodarts.jp)の選手ページURL'

function extractSnsUsername(url: string): string {
  if (!url) return ''
  try {
    const path = new URL(url).pathname.replace(/^\//, '').replace(/\/$/, '')
    return path.replace(/^@/, '')
  } catch {
    return ''
  }
}

function buildSnsUrl(platformKey: string, username: string): string {
  const clean = username.trim().replace(/^@/, '')
  switch (platformKey) {
    case 'x': return `https://x.com/${clean}`
    case 'instagram': return `https://instagram.com/${clean}`
    case 'youtube': return `https://youtube.com/@${clean}`
    case 'tiktok': return `https://tiktok.com/@${clean}`
    default: return ''
  }
}

function findSnsUsername(links: Profile['sns_links'], platform: string): string {
  if (!Array.isArray(links)) return ''
  const found = links.find(
    (item): item is SnsLink => typeof item === 'object' && item !== null && (item as SnsLink).platform === platform
  )
  return found ? extractSnsUsername(found.url) : ''
}

const inputClass =
  'w-full bg-ink-2 border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans focus:outline-none focus:border-dart-red transition-colors'
const inputClassSm = `${inputClass} text-sm`

export function ProfileEditForm({ profile, player, offerConditions, onSave }: ProfileEditFormProps) {
  const isPlayerAccount = profile.role === 'player'
  const slugLocked = profile.onboarded

  const [displayName, setDisplayName] = useState(profile.display_name)
  const [slug, setSlug] = useState(profile.slug ?? '')
  const [bioText, setBioText] = useState(profile.bio_text ?? '')
  const [location, setLocation] = useState(profile.location ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [directoryUrl, setDirectoryUrl] = useState(player?.player_directory_url ?? '')
  const [isPro, setIsPro] = useState(player?.is_pro ?? false)
  const [pricingType, setPricingType] = useState<'per_event' | 'per_hour'>(
    (offerConditions?.pricing_type as 'per_event' | 'per_hour') ?? 'per_event'
  )
  const [unitPriceAmount, setUnitPriceAmount] = useState(
    offerConditions?.unit_price_amount != null ? String(offerConditions.unit_price_amount) : ''
  )
  const [notes, setNotes] = useState(offerConditions?.notes ?? '')
  const [snsUsernames, setSnsUsernames] = useState<Record<string, string>>(
    Object.fromEntries(SNS_PLATFORMS.map((p) => [p.key, findSnsUsername(profile.sns_links, p.key)]))
  )

  const [dartsLiveRating, setDartsLiveRating] = useState(player?.darts_live_rating ?? 0)
  const [phoenixRating, setPhoenixRating] = useState(player?.phoenix_rating ?? 0)
  const [yearsPlaying, setYearsPlaying] = useState(player?.years_playing != null ? String(player.years_playing) : '')
  const [dartSetup, setDartSetup] = useState(player?.dart_setup ?? '')
  const [sakeRating, setSakeRating] = useState(player?.sake_rating ?? 0)
  const [achievements, setAchievements] = useState<string[]>(
    Array.isArray(player?.achievements) ? (player.achievements as string[]) : []
  )
  const [newAchievement, setNewAchievement] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>(
    Array.isArray(player?.status_tags) ? (player.status_tags as string[]) : []
  )

  const [homeShopId, setHomeShopId] = useState<string | null>(player?.home_shop_id ?? null)
  const [homeShopText, setHomeShopText] = useState(player?.home_shop_text ?? '')
  const [homeShopSelectedName, setHomeShopSelectedName] = useState<string | null>(null)
  const [homeShopQuery, setHomeShopQuery] = useState('')
  const [homeShopResults, setHomeShopResults] = useState<StoreOption[]>([])
  const [homeShopFreeMode, setHomeShopFreeMode] = useState(!player?.home_shop_id && !!player?.home_shop_text)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadCurrentHomeShop() {
      if (!homeShopId) return
      const { data } = await supabase.from('profiles').select('display_name').eq('id', homeShopId).maybeSingle()
      if (data) setHomeShopSelectedName(data.display_name)
    }
    loadCurrentHomeShop()
  }, [])

  useEffect(() => {
    if (homeShopQuery.trim().length < 1) {
      setHomeShopResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('role', 'store')
        .ilike('display_name', `%${homeShopQuery}%`)
        .limit(5)
      setHomeShopResults(data ?? [])
    }, 250)
    return () => clearTimeout(timer)
  }, [homeShopQuery])

  function pickHomeShop(store: StoreOption) {
    setHomeShopId(store.id)
    setHomeShopSelectedName(store.display_name)
    setHomeShopText('')
    setHomeShopQuery('')
    setHomeShopResults([])
  }

  function clearHomeShop() {
    setHomeShopId(null)
    setHomeShopSelectedName(null)
  }

  function addAchievement() {
    if (!newAchievement.trim()) return
    setAchievements((prev) => [...prev, newAchievement.trim()])
    setNewAchievement('')
  }

  function removeAchievement(index: number) {
    setAchievements((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag)
      if (prev.length >= MAX_STATUS_TAGS) return prev
      return [...prev, tag]
    })
  }

  const availableTags = isPro ? [...GENERAL_STATUS_TAGS, ...PRO_ONLY_STATUS_TAGS] : GENERAL_STATUS_TAGS
  const dlInfo = dartsLiveRating > 0 ? getDartsLiveInfo(dartsLiveRating) : null
  const phxInfo = phoenixRating > 0 ? getPhoenixInfo(phoenixRating) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const nextErrors: Record<string, string> = {}

    if (!SLUG_PATTERN.test(slug)) {
      nextErrors.slug = '小文字英数字とハイフンのみ、3〜30文字で入力してください'
    }

    if (isPlayerAccount) {
      for (const p of SNS_PLATFORMS) {
        const value = snsUsernames[p.key]?.trim()
        if (value && !p.pattern.test(value)) {
          nextErrors[p.key] = `形式が正しくありません（${p.hint}）`
        }
      }
      if (isPro && directoryUrl.trim() && !DIRECTORY_PATTERNS.some((re) => re.test(directoryUrl.trim()))) {
        nextErrors.directoryUrl = DIRECTORY_HINT
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})
    setSaving(true)

    const snsLinks: SnsLink[] = SNS_PLATFORMS.filter((p) => snsUsernames[p.key]?.trim()).map((p) => ({
      platform: p.key,
      url: buildSnsUrl(p.key, snsUsernames[p.key]),
    }))

    await onSave({
      profile: {
        display_name: displayName,
        slug: slugLocked ? profile.slug : slug,
        bio_text: bioText || null,
        location: location || null,
        avatar_url: avatarUrl || null,
        sns_links: isPlayerAccount ? snsLinks : profile.sns_links,
      },
      player: isPlayerAccount
        ? {
            is_pro: isPro,
            player_directory_url: isPro ? directoryUrl || null : null,
            home_shop_id: homeShopFreeMode ? null : homeShopId,
            home_shop_text: homeShopFreeMode ? homeShopText || null : null,
            darts_live_rating: dartsLiveRating > 0 ? dartsLiveRating : null,
            phoenix_rating: phoenixRating > 0 ? phoenixRating : null,
            years_playing: yearsPlaying ? Number(yearsPlaying) : null,
            dart_setup: dartSetup || null,
            achievements,
            sake_rating: sakeRating > 0 ? sakeRating : null,
            status_tags: selectedTags,
          }
        : null,
      offerConditions:
        isPlayerAccount && isPro
          ? { pricing_type: pricingType, unit_price_amount: unitPriceAmount ? Number(unitPriceAmount) : null, notes }
          : null,
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

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">プロフィールURL</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              disabled={slugLocked}
              className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {errors.slug ? (
              <p className="mt-1 text-xs text-dart-red font-tl-mono">{errors.slug}</p>
            ) : slugLocked ? (
              <p className="mt-1 text-xs text-chalk-dim font-tl-mono">初回のプロフィール保存後は変更できません</p>
            ) : (
              <p className="mt-1 text-xs text-chalk-dim font-tl-mono">
                throwlink.app/{isPlayerAccount ? 'players' : 'stores'}/{slug || '...'}(初回保存後は変更できなくなります)
              </p>
            )}
          </div>

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
              {isPlayerAccount ? 'プロフィール画像' : '店舗ロゴ・写真'}
            </label>
            <div className="border border-dashed border-brass/40 rounded-sm px-4 py-5 text-center mb-3">
              <p className="text-xs text-chalk-dim mb-2">画像のアップロード機能は現在準備中です</p>
              <button type="button" disabled className="font-tl-mono text-xs text-chalk-dim border border-brass/30 rounded-sm px-3 py-1.5 opacity-50 cursor-not-allowed">
                ファイルを選択(準備中)
              </button>
            </div>
            <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="画像URLを直接入力" className={inputClassSm} />
          </div>
        </div>

        {isPlayerAccount && (
          <>
            <div className="space-y-4 pb-8 border-b border-brass/35 mb-8">
              <p className="font-tl-mono text-xs text-chalk-dim tracking-wide">SNSリンク(自己申告・未検証として表示されます)</p>
              {SNS_PLATFORMS.map((p) => (
                <div key={p.key}>
                  <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">{p.label}</label>
                  <div className="flex items-stretch">
                    <span className="shrink-0 flex items-center gap-1.5 bg-ink-2 border border-r-0 border-brass/50 rounded-l-sm px-2.5 text-chalk-dim text-xs font-tl-mono">
                      {p.icon}
                      {p.prefix}
                    </span>
                    <input
                      type="text"
                      value={snsUsernames[p.key]}
                      onChange={(e) => setSnsUsernames((prev) => ({ ...prev, [p.key]: e.target.value }))}
                      placeholder="ユーザー名"
                      className={`${inputClass} rounded-l-none`}
                    />
                  </div>
                  {errors[p.key] && <p className="mt-1 text-xs text-dart-red font-tl-mono">{errors[p.key]}</p>}
                </div>
              ))}
            </div>

            <div className="space-y-4 pb-8 border-b border-brass/35 mb-8">
              <p className="font-tl-mono text-xs text-chalk-dim tracking-wide">ホームショップ</p>
              {!homeShopFreeMode ? (
                <>
                  {homeShopId && homeShopSelectedName ? (
                    <div className="flex items-center justify-between bg-ink-2 border border-brass/50 rounded-sm px-3 py-2">
                      <span className="text-chalk text-sm">{homeShopSelectedName}</span>
                      <button type="button" onClick={clearHomeShop} className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors">
                        解除
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={homeShopQuery}
                        onChange={(e) => setHomeShopQuery(e.target.value)}
                        placeholder="登録済みの店舗名で検索"
                        className={inputClassSm}
                      />
                      {homeShopResults.length > 0 && (
                        <div className="mt-2 border border-brass/50 rounded-sm divide-y divide-brass/20">
                          {homeShopResults.map((store) => (
                            <button
                              key={store.id}
                              type="button"
                              onClick={() => pickHomeShop(store)}
                              className="w-full text-left px-3 py-2 text-sm text-chalk hover:bg-ink-2 transition-colors"
                            >
                              {store.display_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setHomeShopFreeMode(true)}
                    className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-chalk transition-colors"
                  >
                    ThrowLinkに未登録の店舗を入力する
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={homeShopText}
                    onChange={(e) => setHomeShopText(e.target.value)}
                    placeholder="店舗名"
                    className={inputClassSm}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setHomeShopFreeMode(false)
                      setHomeShopText('')
                    }}
                    className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-chalk transition-colors"
                  >
                    登録済み店舗から選び直す
                  </button>
                </>
              )}
            </div>

            <div className="space-y-5 pb-8 border-b border-brass/35 mb-8">
              <p className="font-tl-mono text-xs text-chalk-dim tracking-wide">ダーツの実績・セッティング(すべて任意)</p>

              <div>
                <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">DARTSLIVEレーティング</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={18} value={dartsLiveRating}
                    onChange={(e) => setDartsLiveRating(Number(e.target.value))}
                    className="flex-1 accent-dart-red"
                  />
                  {dlInfo ? (
                    <span className="font-tl-mono text-[11px] font-semibold px-2 py-1 rounded-sm shrink-0" style={{ background: dlInfo.color, color: '#1A1200' }}>
                      {dartsLiveRating} ・ {dlInfo.flight}
                    </span>
                  ) : (
                    <span className="font-tl-mono text-xs text-chalk-dim shrink-0">未設定</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">PHOENIXレーティング</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={30} value={phoenixRating}
                    onChange={(e) => setPhoenixRating(Number(e.target.value))}
                    className="flex-1 accent-dart-red"
                  />
                  {phxInfo ? (
                    <span className="font-tl-mono text-[11px] font-semibold px-2 py-1 rounded-sm shrink-0" style={{ background: phxInfo.color, color: '#1A1200' }}>
                      {phoenixRating} ・ {phxInfo.flight}
                    </span>
                  ) : (
                    <span className="font-tl-mono text-xs text-chalk-dim shrink-0">未設定</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">ダーツ歴(年)</label>
                <input type="number" min={0} value={yearsPlaying} onChange={(e) => setYearsPlaying(e.target.value)} className={inputClassSm} />
              </div>

              <div>
                <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">使用セッティング(バレル・チップ・シャフト・フライト)</label>
                <input
                  type="text" value={dartSetup} onChange={(e) => setDartSetup(e.target.value)}
                  placeholder="TRiNiDAD BAZOOKA / Condor AXE STANDARD L / Premium Lippoint 30"
                  className={inputClassSm}
                />
              </div>

              <div>
                <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">酒レーティング</label>
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="range" min={0} max={18} value={sakeRating}
                    onChange={(e) => setSakeRating(Number(e.target.value))}
                    className="flex-1 accent-dart-red"
                  />
                  <span className="font-tl-mono text-xs text-chalk-dim shrink-0">{sakeRating > 0 ? `${sakeRating} / 18` : '未設定'}</span>
                </div>
                {sakeRating > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {Array.from({ length: 18 }, (_, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{
                          background: i < sakeRating ? DARTSLIVE_COLORS[i] : 'transparent',
                          border: i < sakeRating ? 'none' : '1px solid rgba(176,141,70,0.3)',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">実績</label>
                <div className="space-y-2 mb-2">
                  {achievements.map((a, i) => (
                    <div key={i} className="flex items-center justify-between bg-ink-2 border border-brass/50 rounded-sm px-3 py-2">
                      <span className="text-chalk text-sm">{a}</span>
                      <button type="button" onClick={() => removeAchievement(i)} className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors">
                        削除
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text" value={newAchievement} onChange={(e) => setNewAchievement(e.target.value)}
                    placeholder="DARTSLIVE OPEN 2026 YOKOHAMA Level MAX 優勝"
                    className={inputClassSm}
                  />
                  <button type="button" onClick={addAchievement} className="font-tl-mono text-xs font-semibold text-chalk border border-brass px-3 py-2 rounded-sm hover:border-dart-red hover:text-dart-red transition-colors shrink-0">
                    追加
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 pb-8 border-b border-brass/35 mb-8">
              <p className="font-tl-mono text-xs text-chalk-dim tracking-wide">
                ステータスタグ(最大{MAX_STATUS_TAGS}つ、{selectedTags.length}/{MAX_STATUS_TAGS}選択中)
              </p>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const selected = selectedTags.includes(tag)
                  const isProTag = (PRO_ONLY_STATUS_TAGS as readonly string[]).includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`font-tl-mono text-[11px] rounded-full px-3 py-1.5 border transition-colors ${
                        selected
                          ? isProTag
                            ? 'border-dart-red text-chalk bg-dart-red/15'
                            : 'border-brass text-chalk bg-ink-2'
                          : 'border-brass/40 text-chalk-dim hover:border-brass'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="flex items-center gap-3 mb-8 cursor-pointer">
              <input type="checkbox" checked={isPro} onChange={(e) => setIsPro(e.target.checked)} className="w-4 h-4 accent-dart-red" />
              <span className="font-tl-mono text-sm text-chalk tracking-wide">プロとして登録する</span>
            </label>

            {isPro && (
              <div className="space-y-6 pb-8 border-b border-brass/35 mb-8">
                <div>
                  <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">選手名鑑URL(JAPANまたはPerfect)</label>
                  <input type="url" value={directoryUrl} onChange={(e) => setDirectoryUrl(e.target.value)} placeholder="https://..." className={inputClass} />
                  {errors.directoryUrl && <p className="mt-1 text-xs text-dart-red font-tl-mono">{errors.directoryUrl}</p>}
                </div>

                <div>
                  <p className="font-tl-mono text-sm text-chalk font-semibold mb-1">イベント出演条件</p>
                  <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-4">店舗アカウントにのみ公開されます</p>

                  <div className="space-y-4">
                    <div>
                      <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">単価の設定方法</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPricingType('per_event')}
                          className={`flex-1 font-tl-mono text-xs rounded-sm px-3 py-2 border transition-colors ${
                            pricingType === 'per_event' ? 'border-dart-red text-chalk bg-dart-red/15' : 'border-brass/40 text-chalk-dim hover:border-brass'
                          }`}
                        >
                          イベント単位
                        </button>
                        <button
                          type="button"
                          onClick={() => setPricingType('per_hour')}
                          className={`flex-1 font-tl-mono text-xs rounded-sm px-3 py-2 border transition-colors ${
                            pricingType === 'per_hour' ? 'border-dart-red text-chalk bg-dart-red/15' : 'border-brass/40 text-chalk-dim hover:border-brass'
                          }`}
                        >
                          時間単価
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">
                        {pricingType === 'per_hour' ? '1時間あたりの金額(円)' : 'イベント1回あたりの金額(円)'}
                      </label>
                      <input type="number" min={0} value={unitPriceAmount} onChange={(e) => setUnitPriceAmount(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">その他条件</label>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
                    </div>
                  </div>
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
