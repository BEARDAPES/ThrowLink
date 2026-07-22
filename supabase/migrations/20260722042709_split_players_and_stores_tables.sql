-- ============================================================
-- profiles を「アカウント共通情報(role含む)」として維持しつつ、
-- プレイヤー固有情報(is_pro含む)を players、店舗固有情報を stores に分離する。
-- ============================================================

create table stores (
  id uuid primary key references profiles(id) on delete cascade
);

create table players (
  id uuid primary key references profiles(id) on delete cascade,
  is_pro boolean not null default false,
  player_directory_url text,
  home_shop_id uuid references stores(id) on delete set null,
  home_shop_text text,
  darts_live_rating integer check (darts_live_rating between 1 and 18),
  phoenix_rating integer check (phoenix_rating between 1 and 30),
  years_playing integer check (years_playing >= 0),
  dart_setup text,
  achievements jsonb not null default '[]'::jsonb check (jsonb_typeof(achievements) = 'array'),
  sake_rating integer check (sake_rating between 1 and 18),
  status_tags jsonb not null default '[]'::jsonb
    check (jsonb_typeof(status_tags) = 'array' and jsonb_array_length(status_tags) <= 5)
);

-- 既存データの移行。
insert into stores (id)
select id from profiles where role = 'store';

insert into players (id, is_pro, player_directory_url, home_shop_id, home_shop_text, darts_live_rating, phoenix_rating, years_playing, dart_setup, achievements, sake_rating, status_tags)
select id, is_pro, player_directory_url, home_shop_id, home_shop_text, darts_live_rating, phoenix_rating, years_playing, dart_setup, achievements, sake_rating, status_tags
from profiles where role = 'player';

-- 旧カラムと、home_shop_id用に作っていた検証トリガーをprofilesから削除。
drop trigger if exists trg_validate_home_shop_is_store on profiles;
drop function if exists public.validate_home_shop_is_store();

alter table profiles drop column is_pro;
alter table profiles drop column player_directory_url;
alter table profiles drop column home_shop_id;
alter table profiles drop column home_shop_text;
alter table profiles drop column darts_live_rating;
alter table profiles drop column phoenix_rating;
alter table profiles drop column years_playing;
alter table profiles drop column dart_setup;
alter table profiles drop column achievements;
alter table profiles drop column sake_rating;
alter table profiles drop column status_tags;

-- handle_new_userはis_proをもう挿入できない(profilesに列が無いため)。
-- is_proはplayers行作成時(オンボーディングで役割選択したタイミング)に
-- デフォルトfalseとして持たせるだけで十分なので、ここでは単純化する。
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, role, display_name, avatar_url, slug)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'player'),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    'p-' || substr(replace(new.id::text, '-', ''), 1, 10)
  );
  return new;
end;
$$;

-- RLS: 本人は自分のplayers/stores行を更新できる。閲覧は誰でも可
-- (対応するprofilesが公開情報として見える前提に合わせる)。
alter table players enable row level security;
alter table stores enable row level security;

create policy "players are publicly readable"
on players for select
using (true);

create policy "user can manage own player row"
on players for all
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "stores are publicly readable"
on stores for select
using (true);

create policy "user can manage own store row"
on stores for all
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

grant select on table players, stores to anon, authenticated;
grant insert, update, delete on table players, stores to authenticated;