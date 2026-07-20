-- イベントの公開状態(status)と、プロへのオファー交渉を分離。
-- オファーは1イベントに対して複数プロへ独立に出せるよう、
-- events.pro_id(単一)ではなく event_offers という中間テーブルに持たせる。
-- events は全環境で0件のため、データ移行なしで安全に作り替え可能。

drop policy if exists "published events are publicly visible" on events;
drop policy if exists "store or pro can create an event" on events;
drop policy if exists "pro or store can update their own event" on events;

-- reservationsの既存ポリシーがevents.pro_id / events.statusに依存しているため、
-- カラム変更前に一旦外す(後でevent_offers参照の形などに作り直す)。
drop policy if exists "users can view own reservations" on reservations;
drop policy if exists "authenticated users can reserve a published event" on reservations;

alter table events drop column if exists pro_id;
alter table events drop column if exists status;
alter table events add column status text not null default 'draft'
  check (status in ('draft', 'published', 'completed', 'cancelled'));

create table event_offers (
  event_id uuid not null references events(id) on delete cascade,
  pro_id uuid not null references profiles(id),
  offer_status text not null default 'pending' check (offer_status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  primary key (event_id, pro_id)
);

create index event_offers_pro_id_idx on event_offers (pro_id);

alter table event_offers enable row level security;

create policy "published events are publicly visible"
on events for select
using (
  status in ('published', 'completed')
  or store_id = (select auth.uid())
);

create policy "store can create an event"
on events for insert
with check (
  store_id = (select auth.uid())
  and status = 'draft'
  and exists (select 1 from profiles where profiles.id = (select auth.uid()) and profiles.role = 'store')
);

create policy "store can update their own event"
on events for update
using (store_id = (select auth.uid()))
with check (store_id = (select auth.uid()));

-- event_offers: 店舗は自分のイベントに紐づくオファーを閲覧・作成できる。
-- プロは自分宛のオファーを閲覧できる。
create policy "store can view offers on their own events"
on event_offers for select
using (
  exists (select 1 from events where events.id = event_offers.event_id and events.store_id = (select auth.uid()))
);

create policy "pro can view their own offers"
on event_offers for select
using (pro_id = (select auth.uid()));

create policy "store can send offers on their own events"
on event_offers for insert
with check (
  exists (select 1 from events where events.id = event_offers.event_id and events.store_id = (select auth.uid()))
);

create policy "store can withdraw a pending offer"
on event_offers for delete
using (
  offer_status = 'pending'
  and exists (select 1 from events where events.id = event_offers.event_id and events.store_id = (select auth.uid()))
);

-- reservationsを、event_offers経由で「承諾済みのプロ」だけ閲覧できる形に作り直す。
-- (旧: events.pro_id = auth.uid() だった箇所を置き換え)
create policy "users can view own reservations"
on reservations for select
using (
  (user_id = (select auth.uid()))
  or exists (
    select 1 from events
    where events.id = reservations.event_id and events.store_id = (select auth.uid())
  )
  or exists (
    select 1 from event_offers
    where event_offers.event_id = reservations.event_id
      and event_offers.pro_id = (select auth.uid())
      and event_offers.offer_status = 'accepted'
  )
);

-- statusの値自体(published)は変わっていないので、ロジックは変更なしで作り直すだけ。
create policy "authenticated users can reserve a published event"
on reservations for insert
with check (
  (user_id = (select auth.uid()))
  and (exists (select 1 from events where events.id = reservations.event_id and events.status = 'published'))
);

-- 承諾/辞退は、プロ本人が自分宛の'pending'なオファーに対してのみ、
-- この関数を通じてのみ行える(storeが自己申告でacceptedにできないようにするため)。
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
end;
$$;

revoke execute on function public.respond_to_offer(uuid, uuid, boolean) from public;
grant execute on function public.respond_to_offer(uuid, uuid, boolean) to authenticated;

-- pro_stats()はevents.pro_id/events.statusを直接参照していたため、
-- event_offers経由の集計に作り直す(ポリシーと違いDROP COLUMNではブロックされないが、
-- 直さないと次にこの関数が呼ばれた瞬間に「列が存在しない」エラーで壊れる)。
create or replace function public.pro_stats(target_pro_id uuid default null)
returns table (pro_id uuid, request_count bigint, total_mobilized bigint)
language sql stable security definer
set search_path to 'public'
as $$
  select
    event_offers.pro_id,
    count(*) filter (where events.status = 'completed' and event_offers.offer_status = 'accepted') as request_count,
    coalesce(
      sum(r.confirmed_count) filter (where events.status = 'completed' and event_offers.offer_status = 'accepted'),
      0
    ) as total_mobilized
  from event_offers
  join events on events.id = event_offers.event_id
  left join lateral (
    select count(*) as confirmed_count
    from reservations
    where reservations.event_id = events.id and reservations.status = 'confirmed'
  ) r on true
  where target_pro_id is null or event_offers.pro_id = target_pro_id
  group by event_offers.pro_id;
$$;

-- 下書き保存時は日程未定の場合があるため、event_dateをnullable化。
alter table events alter column event_date drop not null;
