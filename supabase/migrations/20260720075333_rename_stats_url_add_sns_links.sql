-- 「公式記録」→「選手名鑑」への呼称変更にあわせてカラム名変更。
-- 複数SNSリンクを保持するsns_linksを追加。
-- プラットフォームが増えてもマイグレーション不要にするため配列のjsonbで持つ。
alter table public.profiles rename column stats_url to player_directory_url;

alter table public.profiles
  add column sns_links jsonb not null default '[]'::jsonb
  check (jsonb_typeof(sns_links) = 'array');