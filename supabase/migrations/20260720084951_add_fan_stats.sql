-- ファン/プレイヤー問わず、確定予約かつ終了済みイベントの参加数を集計。
-- pro_statsと同じくRLSをバイパスして誰の分でも集計できる必要があるためSECURITY DEFINER。
create or replace function public.fan_stats(target_user_id uuid default null)
returns table (user_id uuid, participation_count bigint)
language sql stable security definer
set search_path to 'public'
as $$
  select
    reservations.user_id,
    count(*) as participation_count
  from reservations
  join events on events.id = reservations.event_id
  where reservations.status = 'confirmed'
    and events.status = 'completed'
    and (target_user_id is null or reservations.user_id = target_user_id)
  group by reservations.user_id;
$$;

grant execute on function public.fan_stats(uuid) to anon, authenticated;