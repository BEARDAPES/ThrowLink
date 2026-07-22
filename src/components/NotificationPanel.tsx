interface NotificationPanelProps {
  open: boolean
  onClose: () => void
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/70" onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-full max-w-[360px] bg-ink-2 border-l border-brass/40 shadow-2xl flex flex-col animate-tl-rise">
        <div className="flex items-center justify-between px-5 py-4 border-b border-brass/35">
          <h2 className="font-tl-mono text-xs text-chalk-dim tracking-widest uppercase">お知らせ</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-chalk-dim hover:text-dart-red transition-colors"
            title="閉じる"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-sm text-chalk-dim text-center">お知らせはありません</p>
        </div>
      </div>
    </div>
  )
}
