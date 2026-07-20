import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TimeSelect } from './TimeSelect'
import { splitIso, combineToIso, formatDateTime } from '../lib/datetime'
import type { Database } from '../types/database.types'

type OfferRow = Database['public']['Tables']['event_offers']['Row']
type ThreadItem = Database['public']['Tables']['offer_thread_items']['Row']

const STATUS_LABEL: Record<string, string> = {
  candidate: '候補',
  pending: '返答待ち',
  accepted: '承諾済み',
  declined: '辞退されました',
  withdrawn: '取り下げ済み',
}

function extractDigits(text: string | null): string {
  if (!text) return ''
  const match = text.match(/\d+/g)
  return match ? match.join('') : ''
}

function formatPrice(value: unknown): string {
  return typeof value === 'number' ? `${value.toLocaleString()}円` : '未設定'
}

function describeStatusChange(status: string): string {
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
      return describeStatusChange((meta?.status as string) ?? '')
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

const inputClass =
  'w-full bg-ink-2 border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans text-sm focus:outline-none focus:border-dart-red transition-colors'

interface OfferPanelProps {
  offer: OfferRow
  proName: string
  storeId: string
  defaultUnitPrice: string | null
  eventStartAt: string | null
  eventEndAt: string | null
  onChanged: () => void
  onWithdraw: () => void
}

export function OfferPanel({ offer, proName, storeId, defaultUnitPrice, eventStartAt, eventEndAt, onChanged, onWithdraw }: OfferPanelProps) {
  const [items, setItems] = useState<ThreadItem[]>([])

  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [items])

  const [chatMessage, setChatMessage] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [sendingOffer, setSendingOffer] = useState(false)
  const [composeMessage, setComposeMessage] = useState('')

  const [price, setPrice] = useState(offer.proposed_price != null ? String(offer.proposed_price) : extractDigits(defaultUnitPrice))
  const startInit = splitIso(offer.participation_start_at ?? eventStartAt)
  const endInit = splitIso(offer.participation_end_at ?? eventEndAt)
  const [startDate, setStartDate] = useState(startInit.date)
  const [startHour, setStartHour] = useState(startInit.hour || '19')
  const [startMinute, setStartMinute] = useState(startInit.minute || '00')
  const [endDate, setEndDate] = useState(endInit.date)
  const [endHour, setEndHour] = useState(endInit.hour || '22')
  const [endMinute, setEndMinute] = useState(endInit.minute || '00')

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

  function setStart(date: string, hour: string, minute: string) {
    setStartDate(date)
    setStartHour(hour)
    setStartMinute(minute)
    if (date && !endDate) setEndDate(date)
  }

  function setEnd(date: string, hour: string, minute: string) {
    setEndDate(date)
    setEndHour(hour)
    setEndMinute(minute)
    if (date && !startDate) setStartDate(date)
  }

  const canSend = price.trim() !== '' && startDate !== '' && endDate !== '' && composeMessage.trim() !== ''

  async function sendOffer() {
    setSendingOffer(true)
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from('event_offers')
      .update({
        offer_status: 'pending',
        message: composeMessage,
        proposed_price: price ? Number(price) : null,
        participation_start_at: combineToIso(startDate, startHour, startMinute),
        participation_end_at: combineToIso(endDate, endHour, endMinute),
      })
      .eq('event_id', offer.event_id)
      .eq('pro_id', offer.pro_id)

    await supabase.from('offer_thread_items').insert({
      event_id: offer.event_id,
      pro_id: offer.pro_id,
      kind: 'message',
      sender_id: user?.id,
      body: composeMessage,
    })

    setComposeMessage('')
    setSendingOffer(false)
    onChanged()
  }

  async function updateConditions() {
    await supabase
      .from('event_offers')
      .update({
        proposed_price: price ? Number(price) : null,
        participation_start_at: combineToIso(startDate, startHour, startMinute),
        participation_end_at: combineToIso(endDate, endHour, endMinute),
      })
      .eq('event_id', offer.event_id)
      .eq('pro_id', offer.pro_id)
    onChanged()
  }

  async function reopen() {
    await supabase.from('event_offers').update({ offer_status: 'candidate' }).eq('event_id', offer.event_id).eq('pro_id', offer.pro_id)
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

  const isComposing = offer.offer_status === 'candidate'
  const canWithdraw = ['candidate', 'pending', 'accepted'].includes(offer.offer_status)
  const groups = groupByDate(items)

  return (
    <div className="bg-ink-2 border border-brass/50 rounded-sm px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-chalk text-sm">{proName}</div>
          <div className="font-tl-mono text-xs text-chalk-dim tracking-wide">
            {STATUS_LABEL[offer.offer_status]}
            {offer.proposed_price != null && !isComposing && ` ・ ${formatPrice(offer.proposed_price)}`}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {(offer.offer_status === 'withdrawn' || offer.offer_status === 'declined') && (
            <button type="button" onClick={reopen} className="font-tl-mono text-xs text-dart-red hover:opacity-80 transition-opacity">
              再オファーする
            </button>
          )}
          {canWithdraw && (
            <button type="button" onClick={onWithdraw} className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors">
              取り消す
            </button>
          )}
        </div>
      </div>

      {groups.length > 0 && (
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
                          {isStore ? '店舗' : proName} ・ {timeLabel(item.created_at)}
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
      )}

      {isComposing ? (
        <div className="space-y-3 mt-3 pt-3 border-t border-brass/20">
          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1">提示金額</label>
            <div className="flex items-center gap-2">
              <input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="15000" className={inputClass} />
              <span className="text-chalk-dim text-sm shrink-0">円</span>
            </div>
          </div>
          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1">参加開始</label>
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(e) => setStart(e.target.value, startHour, startMinute)} className={inputClass} />
              <TimeSelect hour={startHour} minute={startMinute} onChange={(h, m) => setStart(startDate, h, m)} />
            </div>
          </div>
          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1">参加終了</label>
            <div className="flex items-center gap-2">
              <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value, endHour, endMinute)} className={inputClass} />
              <TimeSelect hour={endHour} minute={endMinute} onChange={(h, m) => setEnd(endDate, h, m)} />
            </div>
          </div>
          <div>
            <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1">オファーメッセージ</label>
            <textarea value={composeMessage} onChange={(e) => setComposeMessage(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
          </div>
          <button
            type="button"
            onClick={sendOffer}
            disabled={!canSend || sendingOffer}
            className="font-tl-mono text-xs font-semibold text-ink bg-dart-red px-3 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sendingOffer ? '送信中...' : 'オファーを送信する'}
          </button>
          {!canSend && <p className="text-xs text-chalk-dim">金額・参加時間帯・メッセージがすべて揃うと送信できます。</p>}
        </div>
      ) : (
        <>
          {offer.offer_status !== 'accepted' && offer.offer_status !== 'declined' && offer.offer_status !== 'withdrawn' && (
            <div className="text-xs mt-3 pt-3 border-t border-brass/20">
              <p className="font-tl-mono text-chalk-dim mb-2">オファー条件</p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
                  <span className="text-chalk-dim shrink-0">円</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="date" value={startDate} onChange={(e) => setStart(e.target.value, startHour, startMinute)} className={inputClass} />
                  <TimeSelect hour={startHour} minute={startMinute} onChange={(h, m) => setStart(startDate, h, m)} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value, endHour, endMinute)} className={inputClass} />
                  <TimeSelect hour={endHour} minute={endMinute} onChange={(h, m) => setEnd(endDate, h, m)} />
                </div>
                <button
                  type="button"
                  onClick={updateConditions}
                  className="font-tl-mono text-xs font-semibold text-chalk border border-brass px-3 py-2 rounded-sm hover:border-dart-red hover:text-dart-red transition-colors"
                >
                  条件を更新
                </button>
              </div>
            </div>
          )}

          {offer.offer_status !== 'declined' && offer.offer_status !== 'withdrawn' && (
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
        </>
      )}
    </div>
  )
}
