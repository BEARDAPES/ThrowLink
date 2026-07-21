-- 出演者としてオファーを受けている(pending/accepted)プロは、
-- 自分が出演するイベントに一般参加者として予約できないようにする。
drop policy if exists "authenticated users can reserve a published event" on reservations;
create policy "authenticated users can reserve a published event"
on reservations for insert
with check (
  (user_id = (select auth.uid()))
  and (exists (select 1 from events where events.id = reservations.event_id and events.status = 'published'))
  and not exists (
    select 1 from event_offers
    where event_offers.event_id = reservations.event_id
      and event_offers.pro_id = (select auth.uid())
      and event_offers.offer_status in ('pending', 'accepted')
  )
);