-- ============================================================
-- 店舗スタッフ管理 + 予定管理システム
-- ============================================================

-- 所属・権限委譲(店舗発の招待のみで作成、プレイヤーの同意が必要)
create table store_staff (
  store_id uuid not null references stores(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'active', 'declined', 'left')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (store_id, player_id)
);

alter table store_staff enable row level security;
grant select on table store_staff to anon, authenticated;
grant insert, update on table store_staff to authenticated;

create policy "active staff are publicly visible, others visible to involved parties"
on store_staff for select
using (status = 'active' or store_id = (select auth.uid()) or player_id = (select auth.uid()));

create policy "store can invite staff"
on store_staff for insert
with check (store_id = (select auth.uid()) and status = 'invited');

create policy "store can manage own staff"
on store_staff for update
using (store_id = (select auth.uid()))
with check (store_id = (select auth.uid()));

create policy "player can respond to own invitation"
on store_staff for update
using (player_id = (select auth.uid()) and status = 'invited')
with check (player_id = (select auth.uid()) and status in ('active', 'declined'));

-- 権限判定: 本人、またはその店のADMIN(在籍中のみ)
create or replace function public.can_manage_store_staff_data(target_store_id uuid, target_player_id uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select
    (select auth.uid()) = target_player_id
    or exists (
      select 1 from store_staff
      where store_staff.store_id = target_store_id
        and store_staff.player_id = (select auth.uid())
        and store_staff.is_admin = true
        and store_staff.status = 'active'
    );
$$;

-- 個人の予定(遠征等)。本人のみ編集可、店を移籍しても残る。
create table player_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('present', 'absent')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index player_schedule_entries_player_idx on player_schedule_entries (player_id, start_date, end_date);

alter table player_schedule_entries enable row level security;
grant select on table player_schedule_entries to anon, authenticated;
grant insert, update, delete on table player_schedule_entries to authenticated;

create policy "public schedule entries are visible to anyone, private only to self"
on player_schedule_entries for select
using (visibility = 'public' or player_id = (select auth.uid()));

create policy "player can manage own schedule entries"
on player_schedule_entries for all
using (player_id = (select auth.uid()))
with check (player_id = (select auth.uid()));

-- その店での繰り返し勤務パターン(参考表示のみ、ブロック判定には使わない)
create table store_staff_shifts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  player_id uuid not null,
  weekday integer not null check (weekday between 0 and 6),
  status text not null check (status in ('present', 'absent')),
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  foreign key (store_id, player_id) references store_staff(store_id, player_id) on delete cascade
);

alter table store_staff_shifts enable row level security;
grant select on table store_staff_shifts to anon, authenticated;
grant insert, update, delete on table store_staff_shifts to authenticated;

create policy "shifts are publicly readable"
on store_staff_shifts for select
using (true);

create policy "self or store admin can manage shifts"
on store_staff_shifts for all
using (public.can_manage_store_staff_data(store_id, player_id))
with check (public.can_manage_store_staff_data(store_id, player_id));

-- 出退勤ログ(「今いるか」の最優先情報源)
create table store_staff_attendance_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  player_id uuid not null,
  clocked_in_at timestamptz not null default now(),
  clocked_out_at timestamptz,
  foreign key (store_id, player_id) references store_staff(store_id, player_id) on delete cascade
);

create index store_staff_attendance_active_idx on store_staff_attendance_logs (player_id, store_id) where clocked_out_at is null;

alter table store_staff_attendance_logs enable row level security;
grant select on table store_staff_attendance_logs to anon, authenticated;
grant insert, update on table store_staff_attendance_logs to authenticated;

create policy "attendance logs are publicly readable"
on store_staff_attendance_logs for select
using (true);

create policy "self or store admin can manage attendance"
on store_staff_attendance_logs for all
using (public.can_manage_store_staff_data(store_id, player_id))
with check (public.can_manage_store_staff_data(store_id, player_id));

-- 店舗側の休業
create table store_closures (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table store_closures enable row level security;
grant select on table store_closures to anon, authenticated;
grant insert, update, delete on table store_closures to authenticated;

create policy "closures are publicly readable"
on store_closures for select
using (true);

create policy "store can manage own closures"
on store_closures for all
using (store_id = (select auth.uid()))
with check (store_id = (select auth.uid()));

alter table stores add column regular_closed_weekdays integer[] not null default '{}';

-- オファーのブロック判定(送信時・承諾時で共通利用)
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
      and status = 'absent'
      and start_date <= (range_end at time zone 'Asia/Tokyo')::date
      and end_date >= (range_start at time zone 'Asia/Tokyo')::date
  ) then
    return false;
  end if;

  return true;
end;
$$;

-- event_offersの送信(pending)・承諾(accepted)時に、DB側でも必ず検証する。
create or replace function public.enforce_player_availability()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  if new.offer_status in ('pending', 'accepted')
     and new.participation_start_at is not null
     and new.participation_end_at is not null then
    if not public.player_is_available(new.pro_id, new.participation_start_at, new.participation_end_at, new.event_id) then
      raise exception 'このプレイヤーはその日程に対応できません';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_player_availability
before insert or update on event_offers
for each row execute function public.enforce_player_availability();

-- 退勤忘れの安全装置(1時間おき)。
create or replace function public.auto_clock_out_overdue_staff()
returns void
language sql
security definer
set search_path to 'public'
as $$
  update store_staff_attendance_logs
  set clocked_out_at = now()
  where clocked_out_at is null
    and clocked_in_at < now() - interval '18 hours';
$$;

select cron.schedule(
  'auto-clock-out-overdue-staff',
  '0 * * * *',
  $$select public.auto_clock_out_overdue_staff()$$
);