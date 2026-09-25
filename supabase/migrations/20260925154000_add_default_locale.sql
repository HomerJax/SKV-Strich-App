alter table public.club_settings
  add column if not exists default_locale text not null default 'auto';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_settings_default_locale_check'
  ) then
    alter table public.club_settings
      add constraint club_settings_default_locale_check
      check (default_locale in ('auto', 'de', 'en'));
  end if;
end
$$;
