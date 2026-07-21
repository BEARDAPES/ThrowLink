-- 終了(event_end_at)から3日経過した公開中イベントを、毎日終了扱いにする。
-- pro_stats/fan_statsの集計条件(status = 'completed')に直結するため、
-- これが無いと実績が永久にカウントされない。
create extension if not exists pg_cron;

create or replace function public.complete_stale_events()
returns void
language sql
security definer
set search_path to 'public'
as $$
  update events
  set status = 'completed'
  where status = 'published'
    and coalesce(event_end_at, event_start_at) < now() - interval '3 days';
$$;

-- pg_cronのスケジュールはUTC基準で解釈される(Supabase側でcron.timezoneの
-- 変更は基本できないため)。日本時間 0:00 は UTC 前日15:00にあたるので、
-- そちらで指定する。
select cron.schedule(
  'complete-stale-events',
  '0 15 * * *',
  $$select public.complete_stale_events()$$
);