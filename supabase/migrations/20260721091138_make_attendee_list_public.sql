-- 公開/終了済みイベントの予約者(確定・キャンセル待ち)は、
-- 誰でも閲覧できるようにする(キャンセル済みは除く)。
-- 事前に「行けば盛り上がりそう」が伝わるようにするための変更。
drop policy if exists "users can view own reservations" on reservations;
create policy "users can view own reservations"
on reservations for select
using (
  (user_id = (select auth.uid()))
  or exists (
    select 1 from events
    where events.id = reservations.event_id and events.store_id = (select auth.uid())
  )
  or exists (
    select 1 from event_offers
    where event_offers.event_id = reservations.event_id
      and event_offers.pro_id = (select auth.uid())
      and event_offers.offer_status = 'accepted'
  )
  or (
    status != 'cancelled'
    and exists (
      select 1 from events
      where events.id = reservations.event_id and events.status in ('published', 'completed')
    )
  )
);