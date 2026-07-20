import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  title: string
  description?: string
  confirmLabel: string
  cancelLabel: string
  children?: ReactNode
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, description, confirmLabel, cancelLabel, children, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-ink/90 flex items-center justify-center px-6 z-50" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-ink-2 border border-brass rounded-sm p-6 font-tl-sans">
        <h2 className="font-display text-xl font-bold text-chalk uppercase tracking-wide mb-3">{title}</h2>
        {description && <p className="text-sm text-chalk-dim leading-relaxed mb-4">{description}</p>}
        {children}
        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="font-tl-mono text-sm font-semibold tracking-wide text-ink bg-safe-green px-4 py-2 rounded-sm hover:opacity-90 transition-opacity"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
