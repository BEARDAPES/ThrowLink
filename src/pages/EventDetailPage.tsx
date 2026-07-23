import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { supabase } from '../lib/supabase'
import { OfferPanel } from '../components/OfferPanel'
import { IncomingOfferPanel } from '../components/IncomingOfferPanel'
import { EventReservationPanel } from '../components/EventReservationPanel'
import { AttendeeListSection, type Attendee } from '../components/AttendeeListSection'
import { TimeSelect } from '../components/TimeSelect'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { splitIso, combineToIso } from '../lib/datetime'
import type { Database } from '../types/database.types'

type EventRow = Database['public']['Tables']['events']['Row']
type EventWithStore = EventRow & { profiles: { display_name: string; slug: string | null } | null }
type OfferRow = Database['public']['Tables']['event_offers']['Row'] & {
  profiles: { display_name: string; slug: string | null } | null
}
type OfferConditions = { pricing_type: string | null; unit_price_amount: number | null }
type ProCandidate = { id: string; display_name: string }

const inputClass =
  'w-full bg-ink-2 border border-brass/50 rounded-sm px-3 py-2 text-chalk font-tl-sans focus:outline-none focus:border-dart-red transition-colors'

const DEFAULT_APOLOGY =
  '誠に申し訳ございませんが、都合により本イベントは中止とさせていただくことになりました。ご迷惑をおかけし大変申し訳ございません。またの機会がございましたら、よろしくお願いいたします。'

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const [event, setEvent] = useState<EventWithStore | null>(null)
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [myOffer, setMyOffer] = useState<OfferRow | null>(null)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [offerConditionsByPro, setOfferConditionsByPro] = useState<Record<string, OfferConditions>>({})
  const [isOwner, setIsOwner] = useState(isNew)
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found'>(isNew ? 'ready' : 'loading')

  const [title, setTitle] = useState('')
  const [capacity, setCapacity] = useState('8')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startHour, setStartHour] = useState('19')
  const [startMinute, setStartMinute] = useState('00')
  const [endDate, setEndDate] = useState('')
  const [endHour, setEndHour] = useState('22')
  const [endMinute, setEndMinute] = useState('00')
  const [savingBasics, setSavingBasics] = useState(false)
  const [dateError, setDateError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProCandidate[]>([])
  const [candidateError, setCandidateError] = useState<string | null>(null)

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false)
  const [apologyMessage, setApologyMessage] = useState(DEFAULT_APOLOGY)

  const offerRefs = useRef<Record<string, HTMLDivElement | null>>({})

  async function load() {
    if (!id) return
    const { data: eventData, error } = await supabase
      .from('events')
      .select('*, profiles!events_store_id_fkey(display_name, slug)')
      .eq('id', id)
      .maybeSingle()
    if (error || !eventData) {
      setStatus('not-found')
      return
    }
    setEvent(eventData as EventWithStore)
    setTitle(eventData.event_title)
    setCapacity(String(eventData.capacity))
    setDescription(eventData.description ?? '')

    const s = splitIso(eventData.event_start_at)
    const en = splitIso(eventData.event_end_at)
    setStartDate(s.date)
    if (s.hour) setStartHour(s.hour)
    if (s.minute) setStartMinute(s.minute)
    setEndDate(en.date)
    if (en.hour) setEndHour(en.hour)
    if (en.minute) setEndMinute(en.minute)

    const { data: { user } } = await supabase.auth.getUser()
    const ownerNow = user?.id === eventData.store_id
    setIsOwner(ownerNow)

    const { data: offersData } = await supabase
      .from('event_offers')
      .select('*, profiles(display_name, slug)')
      .eq('event_id', id)
    setOffers((offersData as OfferRow[]) ?? [])

    const { data: myOfferData } = await supabase
      .from('event_offers')
      .select('*, profiles(display_name, slug)')
      .eq('event_id', id)
      .eq('pro_id', user?.id ?? '')
      .neq('offer_status', 'candidate')
      .maybeSingle()
    setMyOffer(myOfferData as OfferRow | null)

    const proIds = (offersData ?? []).map((o) => o.pro_id)
    if (proIds.length > 0) {
      const { data: conditionsData } = await supabase
        .from('pro_offer_conditions')
        .select('pro_id, pricing_type, unit_price_amount')
        .in('pro_id', proIds)
      setOfferConditionsByPro(
        Object.fromEntries((conditionsData ?? []).map((c) => [c.pro_id, { pricing_type: c.pricing_type, unit_price_amount: c.unit_price_amount }]))
      )
    }

    const { data: attendeesData } = await supabase
      .from('reservations')
      .select('user_id, status, profiles(display_name, avatar_url, slug, players(is_pro))')
      .eq('event_id', id)
      .in('status', ['confirmed', 'waitlisted'])

    const attendeeItems: Attendee[] = (attendeesData ?? [])
      .filter((a) => a.profiles)
      .map((a) => ({
        id: a.user_id,
        displayName: a.profiles!.display_name,
        avatarUrl: a.profiles!.avatar_url,
        isPro: a.profiles!.players?.is_pro ?? false,
        slug: a.profiles!.slug,
        reservationStatus: a.status as 'confirmed' | 'waitlisted',
      }))
    setAttendees(attendeeItems)

    setStatus('ready')
  }

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    if (!isOwner || query.trim().length < 1) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, players!inner(is_pro)')
        .eq('role', 'player')
        .eq('players.is_pro', true)
        .ilike('display_name', `%${query}%`)
        .limit(5)
      const alreadyListed = new Set(offers.map((o) => o.pro_id))
      setResults((data ?? []).filter((p) => !alreadyListed.has(p.id)))
    }, 250)
    return () => clearTimeout(timer)
  }, [query, offers, isOwner])

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

  async function saveBasics(e: React.FormEvent) {
    e.preventDefault()
    setDateError(null)

    const startIso = combineToIso(startDate, startHour, startMinute)
    const endIso = combineToIso(endDate, endHour, endMinute)
    if (startIso && endIso && new Date(endIso) < new Date(startIso)) {
      setDateError('終了時刻が開始時刻より前になっています。')
      return
    }

    setSavingBasics(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/sign-in')
      return
    }

    const payload = {
      event_title: title,
      event_start_at: startIso,
      event_end_at: endIso,
      capacity: Number(capacity),
      description: description || null,
    }

    if (isNew) {
      const { data } = await supabase.from('events').insert({ ...payload, store_id: user.id }).select().single()
      setSavingBasics(false)
      if (data) navigate(`/events/${data.id}`, { replace: true })
      return
    }

    await supabase.from('events').update(payload).eq('id', id!)
    setSavingBasics(false)
    await load()
  }

  // 候補追加時に、イベントの開催期間と重なる予定が既に無いか確認してからブロックする。
  async function addCandidate(candidate: { id: string; display_name: string }) {
    if (!id || !event) return

    if (event.event_start_at && event.event_end_at) {
      const { data: available } = await supabase.rpc('player_is_available', {
        target_player_id: candidate.id,
        range_start: event.event_start_at,
        range_end: event.event_end_at,
      })
      if (available === false) {
        setCandidateError(`${candidate.display_name}さんは、この日程では既に予定が埋まっています。`)
        return
      }
    }
    setCandidateError(null)

    const existing = offers.find((o) => o.pro_id === candidate.id)
    if (existing) {
      await supabase.from('event_offers').update({ offer_status: 'candidate' }).eq('event_id', id).eq('pro_id', candidate.id)
    } else {
      await supabase.from('event_offers').insert({ event_id: id, pro_id: candidate.id, offer_status: 'candidate' })
    }
    setQuery('')
    setResults([])
    await load()
    requestAnimationFrame(() => {
      offerRefs.current[candidate.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  async function withdrawOffer(offer: OfferRow) {
    if (!id) return
    if (offer.offer_status === 'candidate') {
      await supabase.from('event_offers').delete().eq('event_id', id).eq('pro_id', offer.pro_id)
    } else {
      await supabase.from('event_offers').update({ offer_status: 'withdrawn' }).eq('event_id', id).eq('pro_id', offer.pro_id)
    }
    await load()
  }

  async function publish() {
    if (!id) return
    await supabase.from('events').update({ status: 'published' }).eq('id', id)
    await load()
  }

  async function confirmUnpublish() {
    if (!id) return
    await supabase.from('events').update({ status: 'draft' }).eq('id', id)
    setShowUnpublishConfirm(false)
    await load()
  }

  async function confirmCancel() {
    if (!id) return
    const { data: { user } } = await supabase.auth.getUser()
    const affected = offers.filter((o) => o.offer_status === 'pending' || o.offer_status === 'accepted')

    for (const offer of affected) {
      if (apologyMessage.trim()) {
        await supabase.from('offer_thread_items').insert({
          event_id: id,
          pro_id: offer.pro_id,
          kind: 'message',
          sender_id: user?.id,
          body: apologyMessage,
        })
      }
      await supabase.from('event_offers').update({ offer_status: 'withdrawn' }).eq('event_id', id).eq('pro_id', offer.pro_id)
    }

    await supabase.from('events').update({ status: 'cancelled' }).eq('id', id)
    setShowCancelConfirm(false)
    await load()
  }

  async function confirmDelete() {
    if (!id) return
    await supabase.from('events').delete().eq('id', id)
    navigate('/me/dashboard')
  }

  if (status === 'loading') return null
  if (status === 'not-found') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-chalk font-tl-sans">
        <p>このイベントは見つかりませんでした。</p>
      </div>
    )
  }

  const hasPendingOffers = offers.some((o) => o.offer_status === 'pending')
  const acceptedOffers = offers.filter((o) => o.offer_status === 'accepted')
  const affectedOffersOnCancel = offers.filter((o) => o.offer_status === 'pending' || o.offer_status === 'accepted')
  const isCancelled = event?.status === 'cancelled'
  const showEditableForm = isOwner && !isCancelled
  const isExcludedAsGuest = myOffer ? ['pending', 'accepted'].includes(myOffer.offer_status) : false
  const offeredProIds = new Set(offers.map((o) => o.pro_id))

  return (
    <div className="min-h-screen bg-ink font-tl-sans px-6 py-16 flex justify-center">
      <div className="w-full max-w-[560px]">
        {isOwner && (
          <Link
            to="/me/dashboard"
            className="flex items-center gap-1 font-tl-mono text-xs text-chalk-dim tracking-wide hover:text-dart-red transition-colors mb-6"
          >
            ← イベント一覧
          </Link>
        )}

        {event && (
          <span
            className={`inline-block font-tl-mono text-[11px] font-semibold tracking-widest uppercase px-2 py-1 rounded-sm mb-6 ${
              event.status === 'draft'
                ? 'text-ink bg-brass'
                : event.status === 'published'
                  ? 'text-ink bg-dart-red'
                  : 'text-chalk-dim border border-brass/50'
            }`}
          >
            {event.status === 'draft' && '公開準備中'}
            {event.status === 'published' && '公開中'}
            {event.status === 'completed' && '終了'}
            {event.status === 'cancelled' && 'キャンセル済み'}
          </span>
        )}

        {showEditableForm ? (
          <form onSubmit={saveBasics} className="space-y-6 pb-8 border-b border-brass/35 mb-8">
            <div>
              <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">タイトル</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">開始日時</label>
              <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={(e) => setStart(e.target.value, startHour, startMinute)} className={inputClass} />
                <TimeSelect hour={startHour} minute={startMinute} onChange={(h, m) => setStart(startDate, h, m)} />
              </div>
            </div>
            <div>
              <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">終了日時</label>
              <div className="flex items-center gap-2">
                <input type="date" value={endDate} onChange={(e) => setEnd(e.target.value, endHour, endMinute)} className={inputClass} />
                <TimeSelect hour={endHour} minute={endMinute} onChange={(h, m) => setEnd(endDate, h, m)} />
              </div>
              {dateError && <p className="mt-1 text-xs text-dart-red">{dateError}</p>}
            </div>
            <div>
              <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">定員</label>
              <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">イベント説明</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <button
                type="submit"
                disabled={savingBasics}
                className="font-tl-mono text-sm font-semibold tracking-wide text-chalk border border-brass px-4 py-2 rounded-sm hover:border-dart-red hover:text-dart-red transition-colors disabled:opacity-50"
              >
                {savingBasics ? '保存中...' : isNew ? '保存して続ける' : '基本情報を保存'}
              </button>
              {!isNew && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
                  >
                    イベントをキャンセルする
                  </button>
                </div>
              )}
            </div>
            {isNew && <p className="text-xs text-chalk-dim">プレイヤーにオファーする場合は、一度保存すると設定できるようになります。</p>}
          </form>
        ) : (
          event && (
            <div className="mb-10">
              <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-chalk mb-2">{event.event_title}</h1>
              {event.profiles && (
                <p className="font-tl-mono text-sm text-chalk-dim mb-1">
                  主催:{' '}
                  {event.profiles.slug ? (
                    <Link
                      to={`/stores/${event.profiles.slug}`}
                      className="underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
                    >
                      {event.profiles.display_name}
                    </Link>
                  ) : (
                    event.profiles.display_name
                  )}
                </p>
              )}
              <p className="font-tl-mono text-sm text-chalk-dim mb-1">
                {event.event_start_at ? new Date(event.event_start_at).toLocaleString('ja-JP') : '日程未定'}
                {event.event_end_at && ` 〜 ${new Date(event.event_end_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
              <p className="font-tl-mono text-sm text-chalk-dim mb-4">定員 {event.capacity}名</p>
              {event.description && <p className="text-[15px] leading-loose text-chalk">{event.description}</p>}

              {isOwner && isCancelled && (
                <div className="mt-6 pt-6 border-t border-brass/35">
                  <p className="text-xs text-chalk-dim mb-3">キャンセル済みのため再編集はできません。</p>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="font-tl-mono text-xs text-chalk-dim underline decoration-brass/50 underline-offset-4 hover:text-dart-red transition-colors"
                  >
                    完全に削除する
                  </button>
                </div>
              )}
            </div>
          )
        )}

        {myOffer && !isOwner && (
          <div className="mb-10">
            <IncomingOfferPanel
              offer={myOffer}
              storeId={event?.store_id ?? ''}
              storeName={event?.profiles?.display_name ?? '店舗'}
              eventStatus={event?.status ?? 'draft'}
              onChanged={load}
            />
          </div>
        )}

        {!isOwner && event?.status === 'published' && (
          isExcludedAsGuest ? (
            <p className="text-xs text-chalk-dim mb-10 pb-8 border-b border-brass/35">
              このイベントの出演者として、一般参加枠へは申し込めません。
            </p>
          ) : (
            <EventReservationPanel eventId={event.id} capacity={event.capacity} />
          )
        )}

        {acceptedOffers.length > 0 && (
          <div className="mb-10">
            <p className="font-tl-mono text-xs text-chalk-dim tracking-wide mb-3">出演プレイヤー</p>
            <div className="border-t border-brass/35">
              {acceptedOffers.map((o) => (
                <Link key={o.pro_id} to={o.profiles?.slug ? `/players/${o.profiles.slug}` : '#'} className="block py-3 border-b border-brass/20 text-chalk hover:text-dart-red transition-colors">
                  {o.profiles?.display_name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <AttendeeListSection
          attendees={attendees}
          offeredProIds={offeredProIds}
          canOffer={isOwner && !isCancelled}
          onOffer={(attendee) => addCandidate({ id: attendee.id, display_name: attendee.displayName })}
        />

        {isOwner && !isNew && !isCancelled && (
          <div className="space-y-3 pb-8 border-b border-brass/35 mb-8">
            <p className="font-tl-mono text-xs text-chalk-dim tracking-wide">出演オファー(任意・複数可)</p>

            {offers.length > 0 && (
              <div className="space-y-2">
                {offers.map((offer) => (
                  <div key={offer.pro_id} ref={(el) => { offerRefs.current[offer.pro_id] = el }}>
                    <OfferPanel
                      offer={offer}
                      proName={offer.profiles?.display_name ?? ''}
                      storeId={event?.store_id ?? ''}
                      eventStatus={event?.status ?? 'draft'}
                      defaultPricingType={offerConditionsByPro[offer.pro_id]?.pricing_type ?? null}
                      defaultUnitPriceAmount={offerConditionsByPro[offer.pro_id]?.unit_price_amount ?? null}
                      eventStartAt={event?.event_start_at ?? null}
                      eventEndAt={event?.event_end_at ?? null}
                      onChanged={load}
                      onWithdraw={() => withdrawOffer(offer)}
                    />
                  </div>
                ))}
              </div>
            )}

            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="プロの名前で検索して候補に追加" className={inputClass} />
            {results.length > 0 && (
              <div className="border border-brass/50 rounded-sm divide-y divide-brass/20">
                {results.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => addCandidate({ id: candidate.id, display_name: candidate.display_name })}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-chalk hover:bg-ink-2 transition-colors"
                  >
                    <span>{candidate.display_name}</span>
                    <span className="font-tl-mono text-xs text-chalk-dim">候補に追加</span>
                  </button>
                ))}
              </div>
            )}
            {candidateError && (
              <p className="text-xs text-dart-red bg-dart-red/10 border border-dart-red/30 rounded-sm px-3 py-2">{candidateError}</p>
            )}
          </div>
        )}

        {isOwner && !isNew && event?.status === 'draft' && (
          <div>
            <button
              type="button"
              onClick={publish}
              disabled={hasPendingOffers}
              className="font-tl-mono text-sm font-semibold tracking-wide text-ink bg-dart-red px-4 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              公開する
            </button>
            {hasPendingOffers && <p className="mt-2 text-xs text-chalk-dim">返答待ちのオファーがあるため、全員の返答が揃うまで公開できません。</p>}
          </div>
        )}

        {isOwner && !isNew && event?.status === 'published' && (
          <div>
            <button
              type="button"
              onClick={() => setShowUnpublishConfirm(true)}
              className="font-tl-mono text-sm font-semibold tracking-wide text-chalk border border-brass px-4 py-2 rounded-sm hover:border-dart-red hover:text-dart-red transition-colors"
            >
              非公開に戻す
            </button>
          </div>
        )}

        {showCancelConfirm && (
          <ConfirmDialog
            title="イベントをキャンセルしますか？"
            description="この操作は取り消せません。公開済みの場合、ページは非公開になります。"
            confirmLabel="キャンセルする"
            cancelLabel="キャンセルしない"
            onConfirm={confirmCancel}
            onCancel={() => setShowCancelConfirm(false)}
          >
            {affectedOffersOnCancel.length > 0 && (
              <div className="mt-4">
                <label className="block font-tl-mono text-xs text-chalk-dim tracking-wide mb-1.5">
                  オファー中のプレイヤーへのメッセージ({affectedOffersOnCancel.length}名)
                </label>
                <textarea
                  value={apologyMessage}
                  onChange={(e) => setApologyMessage(e.target.value)}
                  rows={5}
                  className={`${inputClass} resize-none`}
                />
              </div>
            )}
          </ConfirmDialog>
        )}

        {showDeleteConfirm && (
          <ConfirmDialog
            title="完全に削除しますか？"
            description="この操作は取り消せません。オファーのやり取り履歴もすべて削除されます。"
            confirmLabel="削除する"
            cancelLabel="削除しない"
            onConfirm={confirmDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}

        {showUnpublishConfirm && (
          <ConfirmDialog
            title="イベントを非公開に戻しますか？"
            description="非公開にすると一般には表示されなくなります。承諾済みのオファー条件を変更したい場合などにご利用ください。"
            confirmLabel="非公開に戻す"
            cancelLabel="戻さない"
            onConfirm={confirmUnpublish}
            onCancel={() => setShowUnpublishConfirm(false)}
          />
        )}
      </div>
    </div>
  )
}
