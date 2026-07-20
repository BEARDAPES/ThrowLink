alter table event_offers add column proposed_price text;
alter table event_offers add column participation_start_at timestamptz;
alter table event_offers add column participation_end_at timestamptz;

create table offer_thread_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  pro_id uuid not null,
  kind text not null check (kind in ('message', 'price_change', 'date_change', 'participation_time_change', 'status_change')),
  sender_id uuid references profiles(id),
  body text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  foreign key (event_id, pro_id) references event_offers(event_id, pro_id) on delete cascade
);

create index offer_thread_items_event_pro_idx on offer_thread_items (event_id, pro_id, created_at);

alter table offer_thread_items enable row level security;

create policy "store or pro can view thread on non-candidate offers"
on offer_thread_items for select
using (
  exists (select 1 from events where events.id = offer_thread_items.event_id and events.store_id = (select auth.uid()))
  or (
    pro_id = (select auth.uid())
    and exists (
      select 1 from event_offers
      where event_offers.event_id = offer_thread_items.event_id
        and event_offers.pro_id = offer_thread_items.pro_id
        and event_offers.offer_status != 'candidate'
    )
  )
);

create policy "store or pro can post a message"
on offer_thread_items for insert
with check (
  kind = 'message'
  and sender_id = (select auth.uid())
  and (
    exists (select 1 from events where events.id = offer_thread_items.event_id and events.store_id = (select auth.uid()))
    or pro_id = (select auth.uid())
  )
);

-- storeは自分のイベントに紐づくオファーの条件(金額・参加時間帯)を更新でき、
-- candidate→pendingの送信もここで行う。ただしofferer_statusを自分で
-- 'accepted'にはできない(respond_to_offer()経由のみ)。
drop policy if exists "store can send a candidate offer" on event_offers;
create policy "store can update their own offers"
on event_offers for update
using (
  exists (select 1 from events where events.id = event_offers.event_id and events.store_id = (select auth.uid()))
)
with check (
  offer_status != 'accepted'
  and exists (select 1 from events where events.id = event_offers.event_id and events.store_id = (select auth.uid()))
);

-- 金額・参加時間帯・ステータスの変更を自動でタイムラインに記録する。
create or replace function public.log_offer_changes()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  if new.proposed_price is distinct from old.proposed_price then
    insert into offer_thread_items (event_id, pro_id, kind, sender_id, metadata)
    values (new.event_id, new.pro_id, 'price_change', auth.uid(),
      jsonb_build_object('old', old.proposed_price, 'new', new.proposed_price));
  end if;

  if new.participation_start_at is distinct from old.participation_start_at
     or new.participation_end_at is distinct from old.participation_end_at then
    insert into offer_thread_items (event_id, pro_id, kind, sender_id, metadata)
    values (new.event_id, new.pro_id, 'participation_time_change', auth.uid(),
      jsonb_build_object(
        'old_start', old.participation_start_at, 'new_start', new.participation_start_at,
        'old_end', old.participation_end_at, 'new_end', new.participation_end_at
      ));
  end if;

  if new.offer_status is distinct from old.offer_status and new.offer_status in ('accepted', 'declined') then
    insert into offer_thread_items (event_id, pro_id, kind, sender_id, metadata)
    values (new.event_id, new.pro_id, 'status_change', auth.uid(),
      jsonb_build_object('status', new.offer_status));
  end if;

  return new;
end;
$$;

create trigger trg_log_offer_changes
after update on event_offers
for each row execute function public.log_offer_changes();

-- イベント日程の変更は、そのイベントに紐づく全オファーのタイムラインに記録する。
create or replace function public.log_event_date_change()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  if new.event_date is distinct from old.event_date then
    insert into offer_thread_items (event_id, pro_id, kind, sender_id, metadata)
    select new.id, event_offers.pro_id, 'date_change', auth.uid(),
      jsonb_build_object('old', old.event_date, 'new', new.event_date)
    from event_offers
    where event_offers.event_id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_log_event_date_change
after update on events
for each row execute function public.log_event_date_change();