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

do $$
begin
  execute 'revoke execute on function public.rls_auto_enable() from public';
  execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated';
exception
  when undefined_function then
    raise notice 'rls_auto_enable() not found in this environment, skipping revoke';
end $$;
