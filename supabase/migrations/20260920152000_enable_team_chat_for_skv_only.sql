insert into public.club_feature_flags (
  club_id,
  feature_key,
  enabled,
  updated_at
)
select
  c.id,
  'team_chat',
  true,
  now()
from public.clubs c
where c.id = '108590d9-0877-4787-90a5-4679615b3b76'
on conflict (club_id, feature_key)
do update set
  enabled = excluded.enabled,
  updated_at = now();

update public.club_feature_flags
set enabled = false,
    updated_at = now()
where feature_key = 'team_chat'
  and club_id <> '108590d9-0877-4787-90a5-4679615b3b76';
