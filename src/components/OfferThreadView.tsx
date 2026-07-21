import { useEffect, useRef } from 'react'
import { formatDateTime } from '../lib/datetime'
import type { Database } from '../types/database.types'

type ThreadItem = Database['public']['Tables']['offer_thread_items']['Row']

function formatPrice(value: unknown): string {
  return typeof value === 'number' ? `${value.toLocaleString()}円` : '未設定'
}

function describeStatusChange(status: string, previousStatus?: string | null): string {
  if (status === 'pending' && previousStatus === 'accepted') return '承諾が取り消され、交渉が再開されました'
  switch (status) {
    case 'pending': return 'オファーが送信されました'
    case 'accepted': return 'オファーが承諾されました'
    case 'declined': return 'オファーが辞退されました'
    case 'withdrawn': return 'オファーが取り下げられました'
    case 'candidate': return '再オファーの準備が始まりました'
    default: return ''
  }
}

function describeItem(item: ThreadItem): string {
  const meta = item.metadata as Record<string, unknown> | null
  switch (item.kind) {
    case 'price_change':
      return `金額が ${formatPrice(meta?.old)} → ${formatPrice(meta?.new)} に変更されました`
    case 'participation_time_change':
      return `参加時間帯が ${formatDateTime(meta?.old_start as string ?? null)}〜${formatDateTime(meta?.old_end as string ?? null)} → ${formatDateTime(meta?.new_start as string ?? null)}〜${formatDateTime(meta?.new_end as string ?? null)} に変更されました`
    case 'date_change':
      return `イベント日時が ${formatDateTime(meta?.new_start as string ?? null)}〜${formatDateTime(meta?.new_end as string ?? null)} に変更されました`
    case 'status_change':
      return describeStatusChange((meta?.status as string) ?? '', meta?.previous_status as string | undefined)
    default:
      return ''
  }
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function groupByDate(items: ThreadItem[]): { date: string; items: ThreadItem[] }[] {
  const groups: { date: string; items: ThreadItem[] }[] = []
  for (const item of items) {
    const label = dateLabel(item.created_at)
    const last = groups[groups.length - 1]
    if (last && last.date === label) {
      last.items.push(item)
    } else {
      groups.push({ date: label, items: [item] })
    }
  }
  return groups
}

interface OfferThreadViewProps {
  items: ThreadItem[]
  storeId: string
  storeName: string
  proName: string
}

export function OfferThreadView({ items, storeId, storeName, proName }: OfferThreadViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const groups = groupByDate(items)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [items])

  if (groups.length === 0) return null

  return (
    <div className="space-y-3 my-3 max-h-72 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.date}>
          <div className="text-center font-tl-mono text-[10px] text-chalk-dim tracking-widest uppercase mb-2">
            {group.date}
          </div>
          <div className="space-y-1.5">
            {group.items.map((item) => {
              if (item.kind !== 'message') {
                return (
                  <div key={item.id} className="text-center font-tl-mono text-[11px] text-chalk-dim italic">
                    {describeItem(item)} ・ {timeLabel(item.created_at)}
                  </div>
                )
              }
              const isStore = item.sender_id === storeId
              return (
                <div key={item.id} className={`flex ${isStore ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-sm px-3 py-1.5 ${isStore ? 'bg-dart-red/15 border border-dart-red/40' : 'bg-ink border border-brass/30'}`}>
                    <div className="font-tl-mono text-[10px] text-chalk-dim mb-0.5">
                      {isStore ? storeName : proName} ・ {timeLabel(item.created_at)}
                    </div>
                    <div className="text-chalk text-sm">{item.body}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
