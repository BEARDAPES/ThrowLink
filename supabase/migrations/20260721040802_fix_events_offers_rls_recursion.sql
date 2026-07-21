-- events -> event_offers -> events という循環参照でRLSが無限再帰していた。
-- events側のチェックだけSECURITY DEFINER関数経由にして、
-- event_offersのRLSを経由せずに判定することで循環を断ち切る。
create or replace function public.pro_has_active_offer(p_event_id uuid, p_pro_id uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from event_offers
    where event_offers.event_id = p_event_id
      and event_offers.pro_id = p_pro_id
      and event_offers.offer_status != 'candidate'
  );
$$;

drop policy if exists "pro can view events they have an offer on" on events;
create policy "pro can view events they have an offer on"
on events for select
using (public.pro_has_active_offer(events.id, (select auth.uid())));