-- player_schedule_entriesは、プロプレイヤーのみが編集できるようにする。
-- 既存の「本人のみ」に加えて、is_pro=trueであることも条件に加える。
create or replace function public.is_pro_player(target_player_id uuid)
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select coalesce((select is_pro from players where id = target_player_id), false);
$$;

drop policy if exists "player can manage own schedule entries" on player_schedule_entries;

create policy "pro player can manage own schedule entries"
on player_schedule_entries for all
using (player_id = (select auth.uid()) and public.is_pro_player(player_id))
with check (player_id = (select auth.uid()) and public.is_pro_player(player_id));