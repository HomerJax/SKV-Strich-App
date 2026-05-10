alter table public.clubs
add column if not exists sport_type text not null default 'football';

alter table public.clubs
drop constraint if exists clubs_sport_type_check;

alter table public.clubs
add constraint clubs_sport_type_check
check (
  sport_type in (
    'football',
    'handball',
    'basketball',
    'volleyball',
    'ice_hockey',
    'tennis',
    'padel',
    'other'
  )
);

comment on column public.clubs.sport_type is
'Primary sport for this club. Used for onboarding, wording, setup defaults, and future sport-specific UX.';
