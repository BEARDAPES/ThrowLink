-- 金額を自由記述ではなく数値(円)で統一。既存のテストデータに
-- "15,000円" のような非数値文字が混じっていても、数字だけ抽出して変換する。
alter table event_offers alter column proposed_price type integer
using nullif(regexp_replace(coalesce(proposed_price, ''), '[^0-9]', '', 'g'), '')::integer;

-- キャンセル済みイベントは物理削除できるようにする。
create policy "store can delete a cancelled event"
on events for delete
using (store_id = (select auth.uid()) and status = 'cancelled');