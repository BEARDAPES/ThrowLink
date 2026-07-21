-- メール+パスワードで直接サインアップした場合、has_password_loginを
-- 最初からtrueにする(これまでは常にfalseで作成されていた)。
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, role, is_pro, display_name, avatar_url, slug, has_password_login)
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
    'p-' || substr(replace(new.id::text, '-', ''), 1, 10),
    (new.raw_app_meta_data->>'provider' = 'email')
  );
  return new;
end;
$$;