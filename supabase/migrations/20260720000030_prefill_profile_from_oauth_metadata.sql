-- Googleなど OAuth 経由のサインアップ時、raw_user_meta_data の
-- display_name/full_name/name、avatar_url/picture のいずれかが
-- あれば拾ってprofilesの初期値として使う。
-- メール+パスワードなど、これらのキーが無い場合は従来通り空になるだけで
-- 既存の挙動は変えない。
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, role, is_pro, display_name, avatar_url, slug)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'player'),
    coalesce((new.raw_user_meta_data->>'is_pro')::boolean, false),
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    'p-' || substr(replace(new.id::text, '-', ''), 1, 10)
  );
  return new;
end;
$$;