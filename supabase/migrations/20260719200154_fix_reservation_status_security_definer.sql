-- rls_auto_enable()はSupabaseが自動生成する、新規テーブルにRLSを
-- 自動で有効化するためのイベントトリガー用関数。正体判明のため、
-- handle_new_user/promote_waitlistと同じ理由でPUBLIC実行権限のみ剥奪する。
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon, authenticated;


-- 問題: set_reservation_status()にSECURITY DEFINERが付いておらず、
-- 予約者本人のRLS権限でCOUNTが実行されるため、他人の確定予約数を
-- 正しく数えられず、定員チェック(waitlisted判定)が実質機能していなかった。
--
-- 対処: promote_waitlist()と同じくSECURITY DEFINERを付与し、
-- RLSをバイパスして正しい確定予約数を数えられるようにする。
-- ロジック自体（confirmed/waitlistedの判定条件)は変更なし。
drop trigger if exists trg_set_reservation_status on reservations;
drop function if exists public.set_reservation_status();

create or replace function public.set_reservation_status()
returns trigger
language plpgsql security definer
set search_path = public
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

create trigger trg_set_reservation_status
before insert on reservations
for each row execute function public.set_reservation_status();