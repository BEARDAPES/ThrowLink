import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { OfferThreadView } from './OfferThreadView'
import { ConfirmDialog } from './ConfirmDialog'
import type { Database } from '../types/database.types'

type OfferRow = Database['public']['Tables']['event_offers']['Row']
type ThreadItem = Database['public']['Tables']['offer_thread_items']['Row']

const STATUS_LABEL: Record<string, string> = {
  pending: '返答待ち',
  accepted: '承諾済み',
  declined: '辞退されました',
  withdrawn: '取り下げられました',
}

function formatPrice(value: unknown): string {
  return typeof value === 'number' ? `${value.toLocaleString()}円` : '未設定'
}

function formatRange(start: string | null, end: string | null): string {
  if (!start) return '未設定'
  const s = new Date(start)
  const sLabel = s.toLocaleString('ja-JP', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  if (!end) return sLabel
  const eLabel = new Date(end).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  return `${sLabel} 〜 ${eLabel}`
}

const inputClass =
  'w-full bg-ink-2 border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans text-sm focus:outline-none focus:border-dart-red transition-colors'

interface IncomingOfferPanelProps {
  offer: OfferRow
  storeId: string
  storeName: string
  eventStatus: string
  onChanged: () => void
}

export function IncomingOfferPanel({ offer, storeId, storeName, eventStatus, onChanged }: IncomingOfferPanelProps) {
  const [items, setItems] = useState<ThreadItem[]>([])
  const [chatMessage, setChatMessage] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [responding, setResponding] = useState(false)
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false)

  async function loadThread() {
    const { data } = await supabase
      .from('offer_thread_items')
      .select('*')
      .eq('event_id', offer.event_id)
      .eq('pro_id', offer.pro_id)
      .order('created_at', { ascending: true })
    setItems(data ?? [])
  }

  useEffect(() => {
    loadThread()
  }, [offer.event_id, offer.pro_id, offer.offer_status])

  async function respond(accept: boolean) {
    setResponding(true)
    await supabase.rpc('respond_to_offer', {
      target_event_id: offer.event_id,
      target_pro_id: offer.pro_id,
      accept,
    })
    setResponding(false)
    setShowAcceptConfirm(false)
    onChanged()
  }

  async function revertAcceptance() {
    setResponding(true)
    await supabase.rpc('revert_offer_acceptance', {
      target_event_id: offer.event_id,
      target_pro_id: offer.pro_id,
    })
    setResponding(false)
    onChanged()
  }

  async function sendChat() {
    if (!chatMessage.trim()) return
    setSendingChat(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('offer_thread_items').insert({
      event_id: offer.event_id,
      pro_id: offer.pro_id,
      kind: 'message',
      sender_id: user?.id,
      body: chatMessage,
    })
    setChatMessage('')
    setSendingChat(false)
    await loadThread()
  }

  const canChat = offer.offer_status === 'pending' || offer.offer_status === 'accepted'
  const canRevertAcceptance = offer.offer_status === 'accepted' && eventStatus === 'draft'

  return (
    <div className="bg-ink-2 border border-brass/50 rounded-sm px-4 py-4">
      <div className="mb-3">
        <div className="text-chalk text-sm font-semibold">{storeName}からのオファー</div>
        <div className="font-tl-mono text-xs text-chalk-dim tracking-wide mt-1">{STATUS_LABEL[offer.offer_status]}</div>
      </div>

      <div className="space-y-1.5 text-sm mb-3">
        <div className="flex justify-between">
          <span className="text-chalk-dim">提示金額</span>
          <span className="text-chalk">{formatPrice(offer.proposed_price)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-chalk-dim">参加時間帯</span>
          <span className="text-chalk">{formatRange(offer.participation_start_at, offer.participation_end_at)}</span>
        </div>
      </div>

      <OfferThreadView items={items} storeId={storeId} storeName={storeName} proName="あなた" />

      {offer.offer_status === 'pending' && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-brass/20">
          <button
            type="button"
            onClick={() => setShowAcceptConfirm(true)}
            disabled={responding}
            className="font-tl-mono text-xs font-semibold text-ink bg-dart-red px-3 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            承諾する
          </button>
          <button
            type="button"
            onClick={() => respond(false)}
            disabled={responding}
            className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
          >
            辞退する
          </button>
        </div>
      )}

      {canRevertAcceptance && (
        <div className="mt-3 pt-3 border-t border-brass/20">
          <button
            type="button"
            onClick={revertAcceptance}
            disabled={responding}
            className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
          >
            承諾を取り消して交渉に戻る
          </button>
        </div>
      )}

      {canChat && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-brass/20">
          <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="メッセージを送る" className={inputClass} />
          <button
            type="button"
            onClick={sendChat}
            disabled={sendingChat}
            className="font-tl-mono text-xs font-semibold text-ink bg-dart-red px-3 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            送信
          </button>
        </div>
      )}

      {showAcceptConfirm && (
        <ConfirmDialog
          title="オファーを承諾しますか？"
          description="承諾すると、店舗がイベントを公開状態にできるようになります。公開されると、オファーを辞退したり条件を変更したりすることができなくなります。"
          confirmLabel="承諾する"
          cancelLabel="承諾しない"
          emphasizeCancel={false}
          onConfirm={() => respond(true)}
          onCancel={() => setShowAcceptConfirm(false)}
        />
      )}
    </div>
  )
}
