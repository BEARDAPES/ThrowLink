-- 自分宛のオファーがある(candidateを除く)イベントは、
-- 非公開(draft)でもプロ本人が閲覧できるようにする。
create policy "pro can view events they have an offer on"
on events for select
using (
  exists (
    select 1 from event_offers
    where event_offers.event_id = events.id
      and event_offers.pro_id = (select auth.uid())
      and event_offers.offer_status != 'candidate'
  )
);