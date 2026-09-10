-- Karriere-Badges Launch: alte Badge-Start/Freischalt-Meldungen bündeln und
-- jedem aktuellen Club-Mitglied genau eine bildschirmfüllende Launch-Meldung geben.

update public.user_notifications
set seen_at = coalesce(seen_at, now())
where seen_at is null
  and type in ('badge_launch', 'badge_unlocked');

insert into public.user_notifications (
  user_id,
  club_id,
  type,
  title,
  body,
  cta_href,
  cta_label,
  secondary_cta_href,
  secondary_cta_label,
  payload,
  dedupe_key,
  created_at
)
select
  membership.user_id,
  membership.club_id,
  'career_badges_launch',
  'Karriere-Badges sind da',
  'Ab sofort sind die Karriere-Badges verfügbar. Bereits sammeln konntest du in deiner Karriere folgende Badges.',
  '/badges',
  'Karriere-Badges ansehen',
  null,
  null,
  jsonb_build_object('version', 'career-launch-2026-09-10'),
  'career_badges_launch:2026-09-10:' || membership.user_id::text,
  now()
from (
  select distinct on (user_id) user_id, club_id
  from public.club_memberships
  where user_id is not null
  order by user_id, club_id::text
) as membership
on conflict (dedupe_key) do nothing;
