-- サインアップ時にslugを自動発行する。
-- ユーザーのUUIDの一部を使うため、別途ランダム生成やリトライ処理は不要
-- (UUID自体が一意なので、その部分文字列も実用上衝突しない)。
-- 発行後の変更は既存の "users can update own profile" ポリシーで対応済み。
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, role, is_pro, display_name, slug)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'player'),
    coalesce((new.raw_user_meta_data->>'is_pro')::boolean, false),
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    'p-' || substr(replace(new.id::text, '-', ''), 1, 10)
  );
  return new;
end;
$$;

-- 既存行(このマイグレーション以前に作られたテストユーザーなど)で
-- slugが未設定のものを、同じ規則でバックフィル。
update public.profiles
set slug = 'p-' || substr(replace(id::text, '-', ''), 1, 10)
where slug is null;

-- slugの形式を統一: 小文字英数字とハイフンのみ、3〜30文字。
-- ユーザーが後から自由に変更できるようにする以上、URLとして安全な形式を強制しておく。
alter table public.profiles
  add constraint profiles_slug_format_check
  check (slug ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$');