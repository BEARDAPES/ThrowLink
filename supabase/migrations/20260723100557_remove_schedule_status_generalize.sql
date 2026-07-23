-- player_schedule_entriesは「在店/不在」ではなく、プレイヤー個人が
-- ファンに公表する予定(遠征・大会出場等)そのものを表す。
-- どのエントリも「その期間は予定が入っている」ことを意味するため、
-- present/absentの区別(status列)は不要になる。
alter table player_schedule_entries drop column status;

create or replace function public.player_is_available(
  target_player_id uuid,
  range_start timestamptz,
  range_end timestamptz,
  exclude_event_id uuid default null
)
returns boolean
language plpgsql stable security definer
set search_path to 'public'
as $$
begin
  if exists (
    select 1
    from event_offers
    join events on events.id = event_offers.event_id
    where event_offers.pro_id = target_player_id
      and event_offers.offer_status = 'accepted'
      and (exclude_event_id is null or event_offers.event_id != exclude_event_id)
      and events.event_start_at < range_end
      and events.event_end_at > range_start
  ) then
    return false;
  end if;

  if exists (
    select 1
    from player_schedule_entries
    where player_id = target_player_id
      and start_date <= (range_end at time zone 'Asia/Tokyo')::date
      and end_date >= (range_start at time zone 'Asia/Tokyo')::date
  ) then
    return false;
  end if;

  return true;
end;
$$;