-- event_offers/offer_thread_items作成時にGRANTを付与し忘れていたための追加対応。
grant select on table event_offers to anon, authenticated;
grant insert, update, delete on table event_offers to authenticated;

grant select, insert on table offer_thread_items to authenticated;