create or replace function public.notify_on_staff_invitation()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  if new.status = 'invited' and (tg_op = 'INSERT' or old.status is distinct from 'invited') then
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

drop trigger if exists trg_notify_on_staff_invitation on store_staff;
create trigger trg_notify_on_staff_invitation
after insert or update on store_staff
for each row execute function public.notify_on_staff_invitation();