-- 営業時間未設定の店における、退勤忘れの自動退勤までの猶予時間(時間単位)。
-- 設定用の小さなテーブルに1行だけ持たせ、DB関数・フロント両方から
-- この1箇所だけを参照するようにする。

create table app_settings (
  key text primary key,
  value text not null
);

alter table app_settings enable row level security;

create policy "settings are publicly readable"
on app_settings for select
using (true);

grant select on table app_settings to anon, authenticated;

insert into app_settings (key, value) values ('fallback_clock_out_hours', '18');

create or replace function public.get_fallback_clock_out_hours()
returns integer
language sql stable
as $$
  select value::integer from app_settings where key = 'fallback_clock_out_hours';
$$;

grant execute on function public.get_fallback_clock_out_hours() to anon, authenticated;

create or replace function public.auto_clock_out_overdue_staff()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  fallback_hours integer := coalesce(public.get_fallback_clock_out_hours(), 18);
begin
  update store_staff_attendance_logs
  set clocked_out_at = now()
  from (
    select
      log.id,
      (log.clocked_in_at at time zone 'Asia/Tokyo')::date as clock_in_date,
      (log.clocked_in_at at time zone 'Asia/Tokyo')::time as clock_in_time,
      stores.business_open_time as open_t,
      stores.business_close_time as close_t
    from store_staff_attendance_logs log
    join stores on stores.id = log.store_id
    where log.clocked_out_at is null
  ) as shift
  where store_staff_attendance_logs.id = shift.id
    and (
      (
        shift.open_t is not null and shift.close_t is not null
        and now() > (
          case
            when shift.close_t <= shift.open_t and shift.clock_in_time < shift.close_t
              then shift.clock_in_date + shift.close_t
            when shift.close_t <= shift.open_t
              then shift.clock_in_date + 1 + shift.close_t
            else shift.clock_in_date + shift.close_t
          end
        ) at time zone 'Asia/Tokyo'
      )
      or (
        (shift.open_t is null or shift.close_t is null)
        and now() > store_staff_attendance_logs.clocked_in_at + (fallback_hours || ' hours')::interval
      )
    );
end;
$$;
