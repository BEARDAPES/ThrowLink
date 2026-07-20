-- JAPAN(livescore.japanprodarts.jp)またはPerfect(member.prodarts.jp)の
-- 正規の選手名鑑URL形式以外を許容しない。
alter table public.profiles
  add constraint profiles_player_directory_url_format_check
  check (
    player_directory_url is null
    or player_directory_url ~ '^https://livescore\.japanprodarts\.jp/directory_detail\.php\?p=\d+$'
    or player_directory_url ~ '^https://member\.prodarts\.jp/players_detail\.php\?mem_no=\d+$'
  );