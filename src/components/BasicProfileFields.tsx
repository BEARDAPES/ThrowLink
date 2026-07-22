interface BasicProfileFieldsProps {
  nameLabel: string
  displayName: string
  onDisplayNameChange: (v: string) => void
  slug: string
  onSlugChange: (v: string) => void
  slugLocked: boolean
  slugBasePath: 'players' | 'stores'
  slugError?: string
  bioLabel: string
  bioText: string
  onBioTextChange: (v: string) => void
  avatarLabel: string
  avatarUrl: string
  onAvatarUrlChange: (v: string) => void
}

const inputClass =
  'w-full bg-ink-2 border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans focus:outline-none focus:border-dart-red transition-colors'
const inputClassSm = `${inputClass} text-sm`

export function BasicProfileFields({
  nameLabel,
  displayName,
  onDisplayNameChange,
  slug,
  onSlugChange,
  slugLocked,
  slugBasePath,
  slugError,
  bioLabel,
  bioText,
  onBioTextChange,
  avatarLabel,
  avatarUrl,
  onAvatarUrlChange,
}: BasicProfileFieldsProps) {
  return (
    <div className="space-y-6 pb-8 border-b border-brass/35 mb-8">
      <div>
        <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">{nameLabel}</label>
        <input type="text" value={displayName} onChange={(e) => onDisplayNameChange(e.target.value)} required className={inputClass} />
      </div>

      <div>
        <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">プロフィールURL</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          required
          disabled={slugLocked}
          className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        {slugError ? (
          <p className="mt-1 text-xs text-dart-red font-tl-mono">{slugError}</p>
        ) : slugLocked ? (
          <p className="mt-1 text-xs text-chalk-dim font-tl-mono">初回のプロフィール保存後は変更できません</p>
        ) : (
          <p className="mt-1 text-xs text-chalk-dim font-tl-mono">
            throwlink.app/{slugBasePath}/{slug || '...'}(初回保存後は変更できなくなります)
          </p>
        )}
      </div>

      <div>
        <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">{bioLabel}</label>
        <textarea value={bioText} onChange={(e) => onBioTextChange(e.target.value)} rows={4} className={`${inputClass} resize-none`} />
      </div>

      <div>
        <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">{avatarLabel}</label>
        <div className="border border-dashed border-brass/40 rounded-sm px-4 py-5 text-center mb-3">
          <p className="text-xs text-chalk-dim mb-2">画像のアップロード機能は現在準備中です</p>
          <button type="button" disabled className="font-tl-mono text-xs text-chalk-dim border border-brass/30 rounded-sm px-3 py-1.5 opacity-50 cursor-not-allowed">
            ファイルを選択(準備中)
          </button>
        </div>
        <input type="url" value={avatarUrl} onChange={(e) => onAvatarUrlChange(e.target.value)} placeholder="画像URLを直接入力" className={inputClassSm} />
      </div>
    </div>
  )
}
