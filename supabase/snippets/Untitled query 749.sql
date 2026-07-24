drop table if exists store_staff_shifts;

create table store_staff_shift_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  player_id uuid not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  updated_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, player_id, date),
  foreign key (store_id, player_id) references store_staff(store_id, player_id) on delete cascade
);

alter table store_staff_shift_entries enable row level security;

grant select on table store_staff_shift_entries to anon, authenticated;
grant insert, update, delete on table store_staff_shift_entries to authenticated;

create policy "public shift entries are visible to anyone, private only to involved parties"
on store_staff_shift_entries for select
using (visibility = 'public' or public.can_manage_store_staff_data(store_id, player_id));

create policy "self or store admin can manage shift entries"
on store_staff_shift_entries for all
using (public.can_manage_store_staff_data(store_id, player_id))
with check (public.can_manage_store_staff_data(store_id, player_id));