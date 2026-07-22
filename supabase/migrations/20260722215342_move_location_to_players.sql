-- profiles.locationは、storesがaddressを持つようになったことで
-- プレイヤー専用の概念になった。playersテーブルに移す。
alter table players add column location text;

update players
set location = profiles.location
from profiles
where players.id = profiles.id;

alter table profiles drop column location;