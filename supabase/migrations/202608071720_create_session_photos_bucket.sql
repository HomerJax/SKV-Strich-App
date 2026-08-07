insert into storage.buckets (id, name, public)
values ('session-photos', 'session-photos', false)
on conflict (id) do update
set
  name = excluded.name,
  public = false;
