-- 店舗プロフィール刷新: 予定管理システムに依存しない部分のみ。
-- 住所は既存のprofiles.locationとは別に、地図表示前提の正式な住所として
-- storesに持たせる(profiles.locationはプレイヤー側の「活動拠点」表示に
-- 引き続き使うため、意味が混ざらないよう分離する)。

alter table stores add column address text;
alter table stores add column phone_number text;
alter table stores add column business_open_time time;
alter table stores add column business_close_time time;
alter table stores add column dartslive_shop_url text;
alter table stores add column phoenix_shop_url text;
alter table stores add column smoking_allowed boolean;
alter table stores add column parking_available boolean;
alter table stores add column atmosphere_tags jsonb not null default '[]'::jsonb
  check (jsonb_typeof(atmosphere_tags) = 'array' and jsonb_array_length(atmosphere_tags) <= 5);