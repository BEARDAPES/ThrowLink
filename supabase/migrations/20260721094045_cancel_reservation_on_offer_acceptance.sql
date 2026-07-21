-- オファーを承諾した時点で、出演者として扱うため、
-- 同じイベントに対する一般参加としての予約(もしあれば)をキャンセルする。
-- 既存のpromote_waitlistトリガーにより、キャンセル待ちがいれば自動で繰り上がる。
create or replace function public.respond_to_offer(target_event_id uuid, target_pro_id uuid, accept boolean)
returns void
language plpgsql security definer
set search_path to 'public'
as $$
begin
  update event_offers
  set offer_status = case when accept then 'accepted' else 'declined' end
  where event_id = target_event_id
    and pro_id = target_pro_id
    and pro_id = (select auth.uid())
    and offer_status = 'pending';

  if accept then
    update reservations
    set status = 'cancelled'
    where event_id = target_event_id
      and user_id = target_pro_id
      and status != 'cancelled';
  end if;
end;
$$;