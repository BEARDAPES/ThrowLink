-- イベント自体の日時を開始・終了の2つに分離。
alter table events rename column event_date to event_start_at;
alter table events add column event_end_at timestamptz;

-- 送信済み以降の「取り消し」は削除ではなく状態遷移にすることで、
-- 再オファー時に過去のやり取り(offer_thread_items)を保持できるようにする。
alter table event_offers drop constraint event_offers_offer_status_check;
alter table event_offers add constraint event_offers_offer_status_check
  check (offer_status in ('candidate', 'pending', 'accepted', 'declined', 'withdrawn'));

-- candidateへの巻き戻し(再オファー)も含め、ステータス変更は全てタイムラインに記録する。
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
      jsonb_build_object('status', new.offer_status));
  end if;

  return new;
end;
$$;

-- イベントの開始/終了日時の変更を、紐づく全オファーのタイムラインに記録する。
create or replace function public.log_event_date_change()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  if new.event_start_at is distinct from old.event_start_at
     or new.event_end_at is distinct from old.event_end_at then
    insert into offer_thread_items (event_id, pro_id, kind, sender_id, metadata)
    select new.id, event_offers.pro_id, 'date_change', auth.uid(),
      jsonb_build_object(
        'new_start', new.event_start_at, 'new_end', new.event_end_at
      )
    from event_offers
    where event_offers.event_id = new.id;
  end if;
  return new;
end;
$$;

-- 「候補」段階(まだやり取りが無い)のみ削除可、送信済み以降は取り下げ(update)で扱う。
drop policy if exists "store can withdraw a non-accepted offer" on event_offers;
create policy "store can remove a candidate offer"
on event_offers for delete
using (
  offer_status = 'candidate'
  and exists (select 1 from events where events.id = event_offers.event_id and events.store_id = (select auth.uid()))
);