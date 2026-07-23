-- 出勤時刻(の「時刻」部分)が閉店時刻より前かどうかで、
-- その出勤がどちらの営業日に属するかを正しく判定する。
-- (深夜営業で、日付を跨いだ直後に出勤したケースを正しく扱うため)
create or replace function public.auto_clock_out_overdue_staff()
returns void
language sql
security definer
set search_path to 'public'
as $$
  with shift as (
    select
      log.id,
      (log.clocked_in_at at time zone 'Asia/Tokyo')::date as clock_in_date,
      (log.clocked_in_at at time zone 'Asia/Tokyo')::time as clock_in_time,
      stores.business_open_time as open_t,
      stores.business_close_time as close_t
    from store_staff_attendance_logs log
    join stores on stores.id = log.store_id
    where log.clocked_out_at is null
  )
  update store_staff_attendance_logs
  set clocked_out_at = now()
  from shift
  where store_staff_attendance_logs.id = shift.id
    and (
      -- 営業時間が設定されている店: 閉店時刻を正確に算出して判定
      (
        shift.open_t is not null and shift.close_t is not null
        and now() > (
          case
            -- 深夜営業(閉店 <= 開店)かつ、出勤時刻が閉店時刻より前
            -- → 出勤は「前日からの営業」に属する。閉店時刻は同じ日付。
            when shift.close_t <= shift.open_t and shift.clock_in_time < shift.close_t
              then shift.clock_in_date + shift.close_t
            -- 深夜営業かつ、出勤時刻が閉店時刻以降 → 閉店時刻は翌日。
            when shift.close_t <= shift.open_t
              then shift.clock_in_date + 1 + shift.close_t
            -- 通常営業(日をまたがない)
            else shift.clock_in_date + shift.close_t
          end
        ) at time zone 'Asia/Tokyo'
      )
      -- 営業時間が未設定の店: フォールバックとして18時間で強制退勤
      or (
        (shift.open_t is null or shift.close_t is null)
        and now() > store_staff_attendance_logs.clocked_in_at + interval '18 hours'
      )
    );
$$;