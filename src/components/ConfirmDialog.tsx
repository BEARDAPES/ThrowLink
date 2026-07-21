import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  title: string
  description?: string
  confirmLabel: string
  cancelLabel: string
  emphasizeCancel?: boolean
  children?: ReactNode
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  emphasizeCancel = true,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const primaryClass =
    'font-tl-mono text-sm font-semibold tracking-wide text-ink px-4 py-2 rounded-sm hover:opacity-90 transition-opacity'
  const secondaryClass =
    'font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors'

  return (
    <div className="fixed inset-0 bg-ink/90 flex items-center justify-center px-6 z-50" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-ink-2 border border-brass rounded-sm p-6 font-tl-sans">
        <h2 className="font-display text-xl font-bold text-chalk uppercase tracking-wide mb-3">{title}</h2>
        {description && <p className="text-sm text-chalk-dim leading-relaxed mb-4">{description}</p>}
        {children}
        <div className="flex items-center gap-3 mt-6">
          {emphasizeCancel ? (
            <>
              <button type="button" onClick={onCancel} className={`${primaryClass} bg-safe-green`}>{cancelLabel}</button>
              <button type="button" onClick={onConfirm} className={secondaryClass}>{confirmLabel}</button>
            </>
          ) : (
            <>
              <button type="button" onClick={onConfirm} className={`${primaryClass} bg-dart-red`}>{confirmLabel}</button>
              <button type="button" onClick={onCancel} className={secondaryClass}>{cancelLabel}</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
