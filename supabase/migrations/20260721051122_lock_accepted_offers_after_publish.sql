-- 承諾済み(accepted)のオファーは、イベントが公開/終了/キャンセル済みの間は
-- 一切更新できないようにする(UI側のガードだけでなくDB側でも防止)。
drop policy if exists "store can update their own offers" on event_offers;
create policy "store can update their own offers"
on event_offers for update
using (
  exists (select 1 from events where events.id = event_offers.event_id and events.store_id = (select auth.uid()))
  and not (
    event_offers.offer_status = 'accepted'
    and exists (
      select 1 from events
      where events.id = event_offers.event_id and events.status in ('published', 'completed', 'cancelled')
    )
  )
)
with check (
  offer_status != 'accepted'
  and exists (select 1 from events where events.id = event_offers.event_id and events.store_id = (select auth.uid()))
);