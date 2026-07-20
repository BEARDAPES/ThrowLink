alter table event_offers add column message text;

-- 承諾済みのオファーだけ、公開/終了済みイベントでは誰でも閲覧可能に
-- (「出演プレイヤー」として一般公開ページに表示するため)。
create policy "anyone can view accepted offers on published events"
on event_offers for select
using (
  offer_status = 'accepted'
  and exists (
    select 1 from events
    where events.id = event_offers.event_id
      and events.status in ('published', 'completed')
  )
);