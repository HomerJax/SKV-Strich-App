alter table public.club_settings
  add column if not exists cashbox_setup_completed boolean not null default false,
  add column if not exists cashbox_penalties_enabled boolean not null default false,
  add column if not exists cashbox_contributions_enabled boolean not null default false;

update public.club_settings cs
set
  cashbox_setup_completed = (
    exists (
      select 1
      from public.club_feature_flags cff
      where cff.club_id = cs.club_id
        and cff.feature_key = 'penalties'
        and cff.enabled = true
    )
    or cs.beerkasse_enabled = true
  ),
  cashbox_penalties_enabled = exists (
    select 1
    from public.club_feature_flags cff
    where cff.club_id = cs.club_id
      and cff.feature_key = 'penalties'
      and cff.enabled = true
  ),
  cashbox_contributions_enabled = exists (
    select 1
    from public.club_feature_flags cff
    where cff.club_id = cs.club_id
      and cff.feature_key = 'penalties'
      and cff.enabled = true
  );
