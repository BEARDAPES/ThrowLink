-- Star(いいね、副作用なし)とWatch(更新通知の購読意思表示)を
-- 同じ構造の多対多関係として1テーブルにまとめる。
-- 通知を実際に配信するロジックは別途、後日実装する。
create table profile_follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  target_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('star', 'watch')),
  created_at timestamptz not null default now(),
  primary key (follower_id, target_id, kind),
  check (follower_id != target_id)
);

create index profile_follows_target_idx on profile_follows (target_id, kind);

alter table profile_follows enable row level security;

-- 誰が誰をStar/Watchしているかは公開情報として扱う
-- (「Starした一覧」を見せる、という要件があるため)。
create policy "follows are publicly readable"
on profile_follows for select
using (true);

create policy "user can manage own follows"
on profile_follows for all
using (follower_id = (select auth.uid()))
with check (follower_id = (select auth.uid()));

grant select on table profile_follows to anon, authenticated;
grant insert, delete on table profile_follows to authenticated;