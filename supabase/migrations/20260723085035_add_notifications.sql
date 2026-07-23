create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  message text not null,
  link_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on notifications (recipient_id, created_at desc);

alter table notifications enable row level security;
grant select, update on table notifications to authenticated;

create policy "user can view own notifications"
on notifications for select
using (recipient_id = (select auth.uid()));

create policy "user can mark own notifications read"
on notifications for update
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

-- スタッフ招待が作られたら、通知を1件記録する。
create or replace function public.notify_on_staff_invitation()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  if new.status = 'invited' then
    insert into notifications (recipient_id, kind, message, link_path)
    select
      new.player_id,
      'staff_invitation',
      profiles.display_name || 'からスタッフ招待が届いています',
      '/me/staff-invitations'
    from profiles where profiles.id = new.store_id;
  end if;
  return new;
end;
$$;

create trigger trg_notify_on_staff_invitation
after insert on store_staff
for each row execute function public.notify_on_staff_invitation();