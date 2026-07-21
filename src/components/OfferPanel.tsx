import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { TimeSelect } from './TimeSelect'
import { OfferThreadView } from './OfferThreadView'
import { splitIso, combineToIso } from '../lib/datetime'
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

function sameInstant(a: string | null, b: string | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return new Date(a).getTime() === new Date(b).getTime()
}

const inputClass =
  'w-full bg-ink-2 border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans text-sm focus:outline-none focus:border-dart-red transition-colors'

interface OfferPanelProps {
  offer: OfferRow
  proName: string
  storeId: string
  eventStatus: string
  defaultUnitPrice: string | null
  eventStartAt: string | null
  eventEndAt: string | null
  onChanged: () => void
  onWithdraw: () => void
}

export function OfferPanel({ offer, proName, storeId, eventStatus, defaultUnitPrice, eventStartAt, eventEndAt, onChanged, onWithdraw }: OfferPanelProps) {
  const [items, setItems] = useState<ThreadItem[]>([])
  const [chatMessage, setChatMessage] = useState('')
  const [sendingChat, setSendingChat] = useState(false)
  const [sendingOffer, setSendingOffer] = useState(false)
  const [composeMessage, setComposeMessage] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const [savingChange, setSavingChange] = useState(false)

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

  const conditionsReady = price.trim() !== '' && startDate !== '' && endDate !== ''
  const canSend = conditionsReady && composeMessage.trim() !== ''

  const currentPriceNum = price ? Number(price) : null
  const currentStartIso = combineToIso(startDate, startHour, startMinute)
  const currentEndIso = combineToIso(endDate, endHour, endMinute)
  const hasConditionChanged =
    currentPriceNum !== offer.proposed_price ||
    !sameInstant(currentStartIso, offer.participation_start_at) ||
    !sameInstant(currentEndIso, offer.participation_end_at)

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

  async function submitConditionChange() {
    setSavingChange(true)
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from('event_offers')
      .update({
        offer_status: 'pending',
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
      body: changeReason,
    })

    setChangeReason('')
    setSavingChange(false)
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
  const canEditConditions = offer.offer_status === 'pending' || (offer.offer_status === 'accepted' && eventStatus === 'draft')

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

      <OfferThreadView items={items} storeId={storeId} storeName="店舗" proName={proName} />

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
          {canEditConditions && (
            <div className="mt-3 pt-3 border-t border-brass/20">
              <p className="font-tl-mono text-xs text-chalk-dim mb-2">オファー条件の変更</p>
              {offer.offer_status === 'accepted' && (
                <div className="bg-dart-red/10 border border-dart-red/30 rounded-sm px-3 py-2 mb-3">
                  <p className="text-xs text-chalk leading-relaxed">
                    承諾済みのオファーです。変更を送信すると、変更理由がプレイヤーに送られ、オファーは未承諾の状態に戻ります。
                  </p>
                </div>
              )}
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
                <div>
                  <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1">変更理由(プレイヤーに送信されます)</label>
                  <textarea value={changeReason} onChange={(e) => setChangeReason(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
                </div>
                <button
                  type="button"
                  onClick={submitConditionChange}
                  disabled={!changeReason.trim() || !hasConditionChanged || savingChange}
                  className="font-tl-mono text-xs font-semibold text-ink bg-dart-red px-3 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingChange ? '送信中...' : 'オファー内容を変更する'}
                </button>
                {changeReason.trim() && !hasConditionChanged && (
                  <p className="text-xs text-chalk-dim">オファー内容が変更されていません。金額または参加時間帯を変えると送信できます。</p>
                )}
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
