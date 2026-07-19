create extension if not exists pgcrypto;

create table if not exists "public"."profiles" (
    "id" uuid not null,
    "role" text default 'player'::text not null,
    "is_pro" boolean default false not null,
    "display_name" text default ''::text not null,
    "slug" text,
    "avatar_url" text,
    "bio_text" text,
    "stats_url" text,
    "created_at" timestamp with time zone default now() not null,
    "updated_at" timestamp with time zone default now() not null,
    constraint "profiles_role_check" check (("role" = any (array['player'::text, 'store'::text])))
);
alter table "public"."profiles" add constraint "profiles_pkey" primary key ("id");
alter table "public"."profiles" add constraint "profiles_slug_key" unique ("slug");
alter table "public"."profiles" add constraint "profiles_id_fkey" foreign key ("id") references auth.users("id") on delete cascade;

create table if not exists "public"."pro_offer_conditions" (
    "pro_id" uuid not null,
    "unit_price" text,
    "notes" text,
    "updated_at" timestamp with time zone default now() not null
);
alter table "public"."pro_offer_conditions" add constraint "pro_offer_conditions_pkey" primary key ("pro_id");
alter table "public"."pro_offer_conditions" add constraint "pro_offer_conditions_pro_id_fkey" foreign key ("pro_id") references public.profiles("id") on delete cascade;

create table if not exists "public"."events" (
    "id" uuid default gen_random_uuid() not null,
    "store_id" uuid,
    "pro_id" uuid not null,
    "event_title" text not null,
    "event_date" timestamp with time zone not null,
    "capacity" integer not null,
    "status" text default 'pending_pro'::text not null,
    "pop_image_url" text,
    "created_at" timestamp with time zone default now() not null,
    "updated_at" timestamp with time zone default now() not null,
    constraint "events_capacity_check" check (("capacity" > 0)),
    constraint "events_status_check" check (("status" = any (array['pending_pro'::text, 'recruiting_store'::text, 'published'::text, 'completed'::text, 'cancelled'::text])))
);
alter table "public"."events" add constraint "events_pkey" primary key ("id");
alter table "public"."events" add constraint "events_pro_id_fkey" foreign key ("pro_id") references public.profiles("id");
alter table "public"."events" add constraint "events_store_id_fkey" foreign key ("store_id") references public.profiles("id");
create index "events_pro_id_idx" on "public"."events" using btree ("pro_id");
create index "events_store_id_idx" on "public"."events" using btree ("store_id");

create table if not exists "public"."reservations" (
    "id" uuid default gen_random_uuid() not null,
    "event_id" uuid not null,
    "user_id" uuid not null,
    "status" text default 'confirmed'::text not null,
    "created_at" timestamp with time zone default now() not null,
    constraint "reservations_status_check" check (("status" = any (array['confirmed'::text, 'waitlisted'::text, 'cancelled'::text])))
);
alter table "public"."reservations" add constraint "reservations_pkey" primary key ("id");
alter table "public"."reservations" add constraint "reservations_event_id_fkey" foreign key ("event_id") references public.events("id") on delete cascade;
alter table "public"."reservations" add constraint "reservations_user_id_fkey" foreign key ("user_id") references public.profiles("id");
create index "reservations_event_id_idx" on "public"."reservations" using btree ("event_id");
create index "reservations_user_id_idx" on "public"."reservations" using btree ("user_id");
create unique index "reservations_unique_active" on "public"."reservations" using btree ("event_id", "user_id") where ("status" <> 'cancelled'::text);

create table if not exists "public"."b2b_reviews" (
    "id" uuid default gen_random_uuid() not null,
    "event_id" uuid not null,
    "store_id" uuid not null,
    "pro_id" uuid not null,
    "rating" integer not null,
    "comment" text,
    "created_at" timestamp with time zone default now() not null,
    constraint "b2b_reviews_rating_check" check ((("rating" >= 1) and ("rating" <= 5)))
);
alter table "public"."b2b_reviews" add constraint "b2b_reviews_pkey" primary key ("id");
alter table "public"."b2b_reviews" add constraint "b2b_reviews_event_id_fkey" foreign key ("event_id") references public.events("id");
alter table "public"."b2b_reviews" add constraint "b2b_reviews_pro_id_fkey" foreign key ("pro_id") references public.profiles("id");
alter table "public"."b2b_reviews" add constraint "b2b_reviews_store_id_fkey" foreign key ("store_id") references public.profiles("id");
create index "b2b_reviews_pro_id_idx" on "public"."b2b_reviews" using btree ("pro_id");
create unique index "b2b_reviews_unique" on "public"."b2b_reviews" using btree ("event_id", "store_id");

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, role, is_pro, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'player'),
    coalesce((new.raw_user_meta_data->>'is_pro')::boolean, false),
    coalesce(new.raw_user_meta_data->>'display_name', '')
  );
  return new;
end;
$$;

create or replace function public.set_reservation_status()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_capacity integer;
  v_confirmed integer;
begin
  select capacity into v_capacity from events where id = new.event_id;
  select count(*) into v_confirmed from reservations
    where event_id = new.event_id and status = 'confirmed';

  if v_confirmed < v_capacity then
    new.status := 'confirmed';
  else
    new.status := 'waitlisted';
  end if;

  return new;
end;
$$;

create or replace function public.promote_waitlist()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  if old.status = 'confirmed' and new.status = 'cancelled' then
    update reservations
    set status = 'confirmed'
    where id = (
      select id from reservations
      where event_id = new.event_id and status = 'waitlisted'
      order by created_at asc
      limit 1
      for update skip locked
    );
  end if;
  return new;
end;
$$;

create or replace function public.pro_stats(target_pro_id uuid default null)
returns table (pro_id uuid, request_count bigint, total_mobilized bigint)
language sql stable security definer
set search_path to 'public'
as $$
  select
    events.pro_id,
    count(*) filter (where events.status = 'completed') as request_count,
    coalesce(sum(r.confirmed_count), 0) as total_mobilized
  from events
  left join lateral (
    select count(*) as confirmed_count
    from reservations
    where reservations.event_id = events.id and reservations.status = 'confirmed'
  ) r on true
  where target_pro_id is null or events.pro_id = target_pro_id
  group by events.pro_id;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger trg_set_reservation_status
before insert on public.reservations
for each row execute function public.set_reservation_status();

create trigger trg_promote_waitlist
after update on public.reservations
for each row execute function public.promote_waitlist();

alter table "public"."profiles" enable row level security;
alter table "public"."pro_offer_conditions" enable row level security;
alter table "public"."events" enable row level security;
alter table "public"."reservations" enable row level security;
alter table "public"."b2b_reviews" enable row level security;

create policy "profiles are publicly readable" on public.profiles for select using (true);
create policy "users can update own profile" on public.profiles for update using (((select auth.uid()) = id));

create policy "owner or store can view offer conditions" on public.pro_offer_conditions for select using (
  (pro_id = (select auth.uid())) or (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'store'))
);
create policy "pro can insert own offer conditions" on public.pro_offer_conditions for insert with check (pro_id = (select auth.uid()));
create policy "pro can update own offer conditions" on public.pro_offer_conditions for update using (pro_id = (select auth.uid()));

create policy "published events are publicly visible" on public.events for select using (
  (status = any (array['published'::text, 'completed'::text])) or (pro_id = (select auth.uid())) or (store_id = (select auth.uid()))
);
create policy "store or pro can create an event" on public.events for insert with check (
  ((status = 'pending_pro'::text) and (store_id = (select auth.uid())) and (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'store')))
  or
  ((status = 'recruiting_store'::text) and (pro_id = (select auth.uid())) and (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.is_pro = true)))
);
create policy "pro or store can update their own event" on public.events for update using (
  (pro_id = (select auth.uid())) or (store_id = (select auth.uid())) or
  ((status = 'recruiting_store'::text) and (store_id is null) and (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'store')))
) with check ((pro_id = (select auth.uid())) or (store_id = (select auth.uid())));

create policy "users can view own reservations" on public.reservations for select using (
  (user_id = (select auth.uid())) or (exists (select 1 from public.events where events.id = reservations.event_id and (events.pro_id = (select auth.uid()) or events.store_id = (select auth.uid()))))
);
create policy "authenticated users can reserve a published event" on public.reservations for insert with check (
  (user_id = (select auth.uid())) and (exists (select 1 from public.events where events.id = reservations.event_id and events.status = 'published'))
);
create policy "users can cancel own reservation" on public.reservations for update using (user_id = (select auth.uid())) with check (status = 'cancelled');

create policy "any store can view b2b reviews" on public.b2b_reviews for select using (
  exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = 'store')
);
create policy "involved store can submit a review" on public.b2b_reviews for insert with check (
  (store_id = (select auth.uid())) and (exists (select 1 from public.events where events.id = b2b_reviews.event_id and events.store_id = (select auth.uid())))
);

grant all on table public.profiles to anon, authenticated, service_role;
grant all on table public.pro_offer_conditions to anon, authenticated, service_role;
grant all on table public.events to anon, authenticated, service_role;
grant all on table public.reservations to anon, authenticated, service_role;
grant all on table public.b2b_reviews to anon, authenticated, service_role;

revoke all on function public.handle_new_user() from public;
grant all on function public.handle_new_user() to service_role;

revoke all on function public.promote_waitlist() from public;
grant all on function public.promote_waitlist() to service_role;

grant all on function public.pro_stats(uuid) to anon, authenticated, service_role;
grant all on function public.set_reservation_status() to anon, authenticated, service_role;
