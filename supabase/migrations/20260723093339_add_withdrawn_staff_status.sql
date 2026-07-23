alter table store_staff drop constraint store_staff_status_check;
alter table store_staff add constraint store_staff_status_check
  check (status in ('invited', 'active', 'declined', 'left', 'withdrawn'));