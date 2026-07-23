create policy "store can delete own staff row"
on store_staff for delete
using (store_id = (select auth.uid()));