import { useState } from 'react'
import { BasicProfileFields } from './BasicProfileFields'
import { STORE_ATMOSPHERE_TAGS, MAX_STORE_TAGS } from '../lib/storeTags'
import type { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type StoreRow = Database['public']['Tables']['stores']['Row']

interface StoreEditFormProps {
  profile: Profile
  store: StoreRow | null
  onSave: (updates: {
    profile: Partial<Profile>
    player: null
    store: Partial<StoreRow>
    offerConditions: null
  }) => Promise<void>
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/

function boolToTri(value: boolean | null | undefined): '' | 'true' | 'false' {
  if (value === true) return 'true'
  if (value === false) return 'false'
  return ''
}

function triToBool(value: string): boolean | null {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

const inputClassSm =
  'w-full bg-ink-2 border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans text-sm focus:outline-none focus:border-dart-red transition-colors'

function triButtonClass(active: boolean) {
  return `flex-1 font-tl-mono text-xs rounded-sm px-3 py-2 border transition-colors ${
    active ? 'border-dart-red text-chalk bg-dart-red/15' : 'border-brass/40 text-chalk-dim hover:border-brass'
  }`
}

export function StoreEditForm({ profile, store, onSave }: StoreEditFormProps) {
  const slugLocked = profile.onboarded

  const [displayName, setDisplayName] = useState(profile.display_name)
  const [slug, setSlug] = useState(profile.slug ?? '')
  const [bioText, setBioText] = useState(profile.bio_text ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')

  const [storeAddress, setStoreAddress] = useState(store?.address ?? '')
  const [storePhone, setStorePhone] = useState(store?.phone_number ?? '')
  const [storeOpenTime, setStoreOpenTime] = useState(store?.business_open_time?.slice(0, 5) ?? '')
  const [storeCloseTime, setStoreCloseTime] = useState(store?.business_close_time?.slice(0, 5) ?? '')
  const [dartsliveShopUrl, setDartsliveShopUrl] = useState(store?.dartslive_shop_url ?? '')
  const [phoenixShopUrl, setPhoenixShopUrl] = useState(store?.phoenix_shop_url ?? '')
  const [smokingAllowed, setSmokingAllowed] = useState(boolToTri(store?.smoking_allowed))
  const [parkingAvailable, setParkingAvailable] = useState(boolToTri(store?.parking_available))
  const [storeTags, setStoreTags] = useState<string[]>(
    Array.isArray(store?.atmosphere_tags) ? (store.atmosphere_tags as string[]) : []
  )

  const [slugError, setSlugError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  function toggleStoreTag(tag: string) {
    setStoreTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag)
      if (prev.length >= MAX_STORE_TAGS) return prev
      return [...prev, tag]
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!SLUG_PATTERN.test(slug)) {
      setSlugError('小文字英数字とハイフンのみ、3〜30文字で入力してください')
      return
    }
    setSlugError(undefined)
    setSaving(true)

    await onSave({
      profile: {
        display_name: displayName,
        slug: slugLocked ? profile.slug : slug,
        bio_text: bioText || null,
        avatar_url: avatarUrl || null,
      },
      player: null,
      store: {
        address: storeAddress || null,
        phone_number: storePhone || null,
        business_open_time: storeOpenTime || null,
        business_close_time: storeCloseTime || null,
        dartslive_shop_url: dartsliveShopUrl || null,
        phoenix_shop_url: phoenixShopUrl || null,
        smoking_allowed: triToBool(smokingAllowed),
        parking_available: triToBool(parkingAvailable),
        atmosphere_tags: storeTags,
      },
      offerConditions: null,
    })

    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="min-h-screen bg-ink font-tl-sans px-6 py-16 sm:py-24 flex justify-center">
      <div className="w-full max-w-[560px]">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-chalk mb-10">
          プロフィール編集
        </h1>

        <BasicProfileFields
          nameLabel="店舗名"
          displayName={displayName}
          onDisplayNameChange={setDisplayName}
          slug={slug}
          onSlugChange={setSlug}
          slugLocked={slugLocked}
          slugBasePath="stores"
          slugError={slugError}
          bioLabel="店舗紹介"
          bioText={bioText}
          onBioTextChange={setBioText}
          avatarLabel="店舗ロゴ・写真"
          avatarUrl={avatarUrl}
          onAvatarUrlChange={setAvatarUrl}
        />

        <div className="space-y-5 pb-8 border-b border-brass/35 mb-8">
          <p className="font-tl-mono text-xs text-chalk-dim tracking-wide">店舗情報(すべて任意)</p>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">住所</label>
            <input type="text" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} placeholder="千葉県習志野市大久保1-25-18 第二柳澤ビル2F" className={inputClassSm} />
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">電話番号</label>
            <input type="tel" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="047-409-6799" className={inputClassSm} />
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">営業時間</label>
            <div className="flex items-center gap-2">
              <input type="time" value={storeOpenTime} onChange={(e) => setStoreOpenTime(e.target.value)} className={inputClassSm} />
              <span className="text-chalk-dim shrink-0">〜</span>
              <input type="time" value={storeCloseTime} onChange={(e) => setStoreCloseTime(e.target.value)} className={inputClassSm} />
            </div>
            <p className="mt-1 text-xs text-chalk-dim">終了が開始より前の時刻の場合、深夜営業(翌日にまたぐ)として扱います。</p>
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">DARTSLIVE設置店ページURL</label>
            <input type="url" value={dartsliveShopUrl} onChange={(e) => setDartsliveShopUrl(e.target.value)} placeholder="https://search.dartslive.com/..." className={inputClassSm} />
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">PHOENIX設置店ページURL</label>
            <input type="url" value={phoenixShopUrl} onChange={(e) => setPhoenixShopUrl(e.target.value)} placeholder="https://vs.phoenixdarts.com/..." className={inputClassSm} />
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">喫煙</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSmokingAllowed('')} className={triButtonClass(smokingAllowed === '')}>未設定</button>
              <button type="button" onClick={() => setSmokingAllowed('true')} className={triButtonClass(smokingAllowed === 'true')}>喫煙可</button>
              <button type="button" onClick={() => setSmokingAllowed('false')} className={triButtonClass(smokingAllowed === 'false')}>禁煙</button>
            </div>
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">駐車場</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setParkingAvailable('')} className={triButtonClass(parkingAvailable === '')}>未設定</button>
              <button type="button" onClick={() => setParkingAvailable('true')} className={triButtonClass(parkingAvailable === 'true')}>あり</button>
              <button type="button" onClick={() => setParkingAvailable('false')} className={triButtonClass(parkingAvailable === 'false')}>なし</button>
            </div>
          </div>

          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">
              雰囲気タグ(最大{MAX_STORE_TAGS}つ、{storeTags.length}/{MAX_STORE_TAGS}選択中)
            </label>
            <div className="flex flex-wrap gap-2">
              {STORE_ATMOSPHERE_TAGS.map((tag) => {
                const selected = storeTags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleStoreTag(tag)}
                    className={`font-tl-mono text-[11px] rounded-full px-3 py-1.5 border transition-colors ${
                      selected ? 'border-dart-red text-chalk bg-dart-red/15' : 'border-brass/40 text-chalk-dim hover:border-brass'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

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
