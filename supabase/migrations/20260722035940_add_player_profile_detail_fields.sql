-- ============================================================
-- プレイヤーページ再設計: 新規カラム・制約・トリガー一式
-- ============================================================

-- ダーツ・実績関連(役割問わずプレイヤーなら誰でも使える想定。NULL許容で、
-- 表示側は値がある項目だけ出す設計)
alter table profiles add column home_shop_id uuid references profiles(id) on delete set null;
alter table profiles add column home_shop_text text;
alter table profiles add column darts_live_rating integer check (darts_live_rating between 1 and 18);
alter table profiles add column phoenix_rating integer check (phoenix_rating between 1 and 30);
alter table profiles add column years_playing integer check (years_playing >= 0);
alter table profiles add column dart_setup text;
alter table profiles add column achievements jsonb not null default '[]'::jsonb
  check (jsonb_typeof(achievements) = 'array');
alter table profiles add column sake_rating integer check (sake_rating between 1 and 18);

-- ステータスタグ(DARTSLIVE由来の共通29種+プロ限定8種、最大5つ)。
-- どのタグが有効か・プロ限定かどうかはカタログの見直しが起きやすいので、
-- DB側は「配列であること」「5件以内であること」のみ強制し、
-- タグの中身の妥当性(許可リスト・プロ限定チェック)はアプリ側で担保する。
alter table profiles add column status_tags jsonb not null default '[]'::jsonb
  check (jsonb_typeof(status_tags) = 'array' and jsonb_array_length(status_tags) <= 5);

-- home_shop_idは「店舗ロールのprofilesのみ」参照できるようにする
-- (単純な外部キーだけではrole='store'までは強制できないため、トリガーで担保)。
create or replace function public.validate_home_shop_is_store()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  if new.home_shop_id is not null then
    if not exists (select 1 from profiles where id = new.home_shop_id and role = 'store') then
      raise exception 'home_shop_id には店舗ロールのプロフィールのみ指定できます';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_validate_home_shop_is_store
before insert or update on profiles
for each row execute function public.validate_home_shop_is_store();

-- slugは「初回のプロフィール編集(オンボーディング完了)までは自由に変更可能、
-- それ以降は固定」とする。既存のonboardedフラグ(初回保存でtrueになる)を
-- そのまま「変更可能な猶予が終わったかどうか」の判定に流用する。
create or replace function public.prevent_slug_change_after_onboarding()
returns trigger
language plpgsql security definer
set search_path to 'public'
as $$
begin
  if old.onboarded = true and new.slug is distinct from old.slug then
    raise exception 'プロフィールURL(slug)は初回のプロフィール編集後は変更できません';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_slug_change_after_onboarding
before update on profiles
for each row execute function public.prevent_slug_change_after_onboarding();