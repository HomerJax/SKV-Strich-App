alter table public.clubs
  add column if not exists deleted_at timestamp with time zone,
  add column if not exists purge_after timestamp with time zone,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists clubs_deleted_at_idx on public.clubs (deleted_at);
create index if not exists clubs_purge_after_idx on public.clubs (purge_after) where deleted_at is not null;

alter table public.clubs
  add constraint clubs_soft_delete_dates_check
  check (
    (deleted_at is null and purge_after is null)
    or
    (deleted_at is not null and purge_after is not null and purge_after > deleted_at)
  ) not valid;

alter table public.clubs validate constraint clubs_soft_delete_dates_check;
