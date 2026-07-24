import { useState } from 'react'
import { Link } from 'react-router'

const menuItemClass = 'block px-4 py-2.5 text-sm text-chalk hover:bg-ink hover:text-dart-red transition-colors'

interface StoreManagementMenuProps {
  slug: string
  canManageStore: boolean
  canAccessShifts: boolean
}

export function StoreManagementMenu({ slug, canManageStore, canAccessShifts }: StoreManagementMenuProps) {
  const [open, setOpen] = useState(false)

  if (!canManageStore && !canAccessShifts) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="店舗操作メニュー"
        className="flex items-center justify-center w-8 h-8 border border-brass/40 rounded-sm text-chalk-dim hover:text-dart-red hover:border-dart-red transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-48 bg-ink-2 border border-brass/40 rounded-sm shadow-xl overflow-hidden">
            {canManageStore && (
              <>
                <Link to="/me/dashboard" onClick={() => setOpen(false)} className={menuItemClass}>
                  依頼・イベント管理
                </Link>
                <Link to="/me/staff" onClick={() => setOpen(false)} className={menuItemClass}>
                  スタッフ管理
                </Link>
              </>
            )}
            {canAccessShifts && (
              <Link to={`/stores/${slug}/shifts`} onClick={() => setOpen(false)} className={menuItemClass}>
                シフト管理
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}
