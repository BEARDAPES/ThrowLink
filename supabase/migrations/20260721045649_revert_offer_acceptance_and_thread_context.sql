create or replace function public.revert_offer_acceptance(target_event_id uuid, target_pro_id uuid)
returns void
language plpgsql security definer
set search_path to 'public'
as $$
begin
  update event_offers
  set offer_status = 'pending'
  where event_id = target_event_id
    and pro_id = target_pro_id
    and pro_id = (select auth.uid())
    and offer_status = 'accepted'
    and exists (
      select 1 from events
      where events.id = target_event_id and events.status = 'draft'
    );
end;
$$;

revoke execute on function public.revert_offer_acceptance(uuid, uuid) from public;
grant execute on function public.revert_offer_acceptance(uuid, uuid) to authenticated;

-- タイムラインで「承諾取り消し→交渉再開」と「初回送信」を区別できるよう、
-- 直前のステータスもメタデータに含める。
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

  if new.offer_status is distinct from old.offer_status then
    insert into offer_thread_items (event_id, pro_id, kind, sender_id, metadata)
    values (new.event_id, new.pro_id, 'status_change', auth.uid(),
      jsonb_build_object('status', new.offer_status, 'previous_status', old.offer_status));
  end if;

  return new;
end;
$$;