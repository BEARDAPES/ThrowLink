import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'
import type { Database } from '../types/database.types'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1) return 'たった今'
  if (diffH < 24) return `${diffH}時間前`
  return `${Math.floor(diffH / 24)}日前`
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])

  useEffect(() => {
    if (!open) return
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifications(data ?? [])
    }
    load()
  }, [open])

  async function markRead(notification: NotificationRow) {
    if (!notification.read_at) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notification.id)
    }
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/70" onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-full max-w-[360px] bg-ink-2 border-l border-brass/40 shadow-2xl flex flex-col animate-tl-rise">
        <div className="flex items-center justify-between px-5 py-4 border-b border-brass/35">
          <h2 className="font-tl-mono text-xs text-chalk-dim tracking-widest uppercase">お知らせ</h2>
          <button type="button" onClick={onClose} className="text-chalk-dim hover:text-dart-red transition-colors" title="閉じる">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {notifications.length > 0 ? (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            {notifications.map((n) => (
              <Link
                key={n.id}
                to={n.link_path ?? '#'}
                onClick={() => markRead(n)}
                className={`block rounded-sm px-4 py-3 border transition-colors ${
                  n.read_at ? 'border-brass/20 bg-transparent' : 'border-brass/40 bg-ink hover:border-dart-red'
                }`}
              >
                <p className={`text-sm ${n.read_at ? 'text-chalk-dim' : 'text-chalk'}`}>{n.message}</p>
                <p className="font-tl-mono text-[10px] text-chalk-dim mt-1">{formatRelative(n.created_at)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-6">
            <p className="text-sm text-chalk-dim text-center">お知らせはありません</p>
          </div>
        )}
      </div>
    </div>
  )
}
