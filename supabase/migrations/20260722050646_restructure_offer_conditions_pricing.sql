-- 自由記述の単価(文字列)を、単価タイプ(イベント単位/時間単価)と
-- 数値金額に分離。時間単価の場合、オファー送信時に参加時間から
-- 自動計算できるようにするための変更。
alter table pro_offer_conditions drop column unit_price;
alter table pro_offer_conditions add column pricing_type text check (pricing_type in ('per_event', 'per_hour'));
alter table pro_offer_conditions add column unit_price_amount integer check (unit_price_amount >= 0);