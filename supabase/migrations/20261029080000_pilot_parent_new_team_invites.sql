-- Pilot-only parent club invitations to create an entirely new team.
-- The bearer token is never stored as plaintext; only its SHA-256 hash.
create table if not exists public.pilot_parent_new_team_invites (
  id uuid primary key default gen_random_uuid(),
  owner_club_id uuid not null references public.pilot_parent_clubs(owner_club_id) on delete cascade,
  source_club_id uuid not null references public.clubs(id),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  name_hint text not null default '',
  planned_team_id text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  status text not null default 'pending' check (status in ('pending','revoked','consumed')),
  consumed_by uuid references auth.users(id),
  consumed_at timestamptz,
  created_club_id uuid unique references public.clubs(id) on delete cascade,
  constraint pilot_new_team_test_owner check (
    owner_club_id = '12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60'::uuid
    and source_club_id = owner_club_id
  ),
  constraint pilot_new_team_consistent check (
    (status='consumed' and consumed_by is not null and consumed_at is not null and created_club_id is not null)
    or (status<>'consumed' and consumed_by is null and consumed_at is null and created_club_id is null)
  ),
  constraint pilot_new_team_expiry check (expires_at > created_at)
);
create unique index if not exists pilot_parent_invites_one_pending_planned
on public.pilot_parent_new_team_invites(owner_club_id,planned_team_id)
where status='pending' and planned_team_id is not null;
alter table public.pilot_parent_new_team_invites enable row level security;
revoke all on public.pilot_parent_new_team_invites from public,anon,authenticated;
grant all on public.pilot_parent_new_team_invites to service_role;

-- This function is invoked only by an authenticated, server-side action using
-- the service-role client. One database transaction makes retries safe.
-- SECURITY INVOKER avoids a public SECURITY DEFINER privilege escalation.
create or replace function public.redeem_pilot_parent_new_team_invite(
 p_token_hash text,
 p_user_id uuid,
 p_team_name text,
 p_sport_type text,
 p_first_name text,
 p_last_name text
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
 v_invite public.pilot_parent_new_team_invites%rowtype;
 v_club uuid;
 v_source public.clubs%rowtype;
 v_email text;
 v_first text := btrim(coalesce(p_first_name,''));
 v_last text := btrim(coalesce(p_last_name,''));
 v_name text := btrim(coalesce(p_team_name,''));
begin
 if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_user_id is null or char_length(v_name) not between 2 and 80
    or char_length(v_first) not between 1 and 80 or char_length(v_last) > 80
    or p_sport_type not in ('football','handball','basketball','volleyball','ice_hockey','tennis','padel','other')
 then
   raise exception 'invalid_form' using errcode = 'P0001';
 end if;

 -- Locks one invite for the whole transaction. A racing second redemption
 -- cannot create a second club or hijack the previously redeemed invite.
 select * into v_invite from public.pilot_parent_new_team_invites
 where token_hash = p_token_hash for update;
 if not found or v_invite.status <> 'pending' or v_invite.expires_at <= now() then
   raise exception 'invite_unavailable' using errcode = 'P0001';
 end if;
 if v_invite.owner_club_id <> '12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60'::uuid then
   raise exception 'not_pilot' using errcode = 'P0001';
 end if;
 if not exists (
  select 1 from public.pilot_parent_clubs
  where owner_club_id=v_invite.owner_club_id
 ) then
   raise exception 'missing_parent' using errcode='P0001';
 end if;
 if v_invite.planned_team_id is not null and not exists (
  select 1 from public.pilot_parent_clubs p,
    lateral jsonb_array_elements(p.teams) t(item)
  where p.owner_club_id=v_invite.owner_club_id
    and t.item->>'id'=v_invite.planned_team_id
    and t.item->>'status'='planned'
 ) then
   raise exception 'planned_team_changed' using errcode='P0001';
 end if;

 select email into v_email from auth.users where id=p_user_id;
 if not found then raise exception 'user_unavailable' using errcode='P0001'; end if;
 select * into v_source from public.clubs
 where id=v_invite.source_club_id and deleted_at is null;
 if not found then raise exception 'source_unavailable' using errcode='P0001'; end if;

 -- New club gets its own logo file in the follow-up storage copy;
 -- never reference the source's storage path across clubs.
 insert into public.clubs(name,display_name,sport_type,primary_color)
 values (v_name,v_name,p_sport_type,coalesce(v_source.primary_color,'black'))
 returning id into v_club;

 insert into public.club_memberships(club_id,user_id,role)
 values(v_club,p_user_id,'admin');

 insert into public.players(club_id,user_id,name,first_name,last_name,email,is_guest,is_active)
 values(v_club,p_user_id,btrim(v_first||' '||v_last),v_first,nullif(v_last,''),v_email,false,true);

 -- Always a fresh independent Free subscription; founder/Stripe rights
 -- NEVER propagate from the parent club.
 insert into public.club_billing(club_id,plan_key,status,billing_note)
 values(v_club,'free','active','Neu per Dachverein-Einladung als Free-Team angelegt.');

 insert into public.club_settings(club_id) values(v_club);
 -- Only harmless operational defaults. Never copy finance, badge activation,
 -- subscriptions, roster, admin, access flags, deadlines/fines already owed.
 update public.club_settings dest set
   use_strength=src.use_strength,
   strength_default=src.strength_default,
   use_categories=src.use_categories,
   category_label=src.category_label,
   position_label=src.position_label,
   attack_label=src.attack_label,
   defense_label=src.defense_label,
   goalkeeper_label=src.goalkeeper_label,
   season_start_month=src.season_start_month,
   season_start_day=src.season_start_day,
   season_end_month=src.season_end_month,
   season_end_day=src.season_end_day,
   season_year_mode=src.season_year_mode,
   rsvp_deadline_minutes_before=src.rsvp_deadline_minutes_before,
   require_rsvp_reason_on_absence=src.require_rsvp_reason_on_absence,
   game_timer_enabled=src.game_timer_enabled,
   game_timer_default_mode=src.game_timer_default_mode,
   game_timer_default_minutes=src.game_timer_default_minutes,
   game_timer_default_end_time=src.game_timer_default_end_time,
   game_timer_halftime_enabled=src.game_timer_halftime_enabled,
   game_timer_alarm_sound=src.game_timer_alarm_sound,
   game_timer_halftime_behavior=src.game_timer_halftime_behavior,
   home_team_feed_enabled=src.home_team_feed_enabled,
   default_locale=src.default_locale,
   updated_at=now()
 from public.club_settings src
 where dest.club_id=v_club and src.club_id=v_invite.source_club_id;

 -- Preserve category LABELS/strength setup, never any actual player ratings.
 insert into public.club_categories(club_id,key,label,sort_order,is_active,generator_base,is_strong)
 select v_club,key,label,sort_order,is_active,generator_base,is_strong
 from public.club_categories where club_id=v_invite.source_club_id;

 insert into public.seasons(club_id,name,start_date,end_date)
 values(v_club,'Saison '||to_char(current_date,'YYYY')||'/'||to_char(current_date+365,'YY'),
        current_date,current_date+365);

 insert into public.pilot_parent_club_team_links(
   owner_club_id,target_club_id,status,requested_by,decided_by,requested_at,decided_at
 ) values(v_invite.owner_club_id,v_club,'linked',v_invite.created_by,p_user_id,now(),now());

 -- Convert a manually planned label (e.g. Walking Football) into the real
 -- linked-team row, rather than showing the same team twice.
 if v_invite.planned_team_id is not null then
   update public.pilot_parent_clubs
   set teams=coalesce((
     select jsonb_agg(item)
     from jsonb_array_elements(teams) e(item)
     where item->>'id' <> v_invite.planned_team_id
   ),'[]'::jsonb), updated_at=now()
   where owner_club_id=v_invite.owner_club_id;
 end if;

 update public.pilot_parent_new_team_invites
 set status='consumed',consumed_by=p_user_id,consumed_at=now(),created_club_id=v_club
 where id=v_invite.id;
 return v_club;
end;
$$;
revoke all on function public.redeem_pilot_parent_new_team_invite(text,uuid,text,text,text,text)
from public,anon,authenticated;
grant execute on function public.redeem_pilot_parent_new_team_invite(text,uuid,text,text,text,text)
to service_role;

comment on table public.pilot_parent_new_team_invites is
'Pilot-only 14-day bearer invitation. Only SHA-256 token hashes stored. Accepted atomically. No sensitive club data copied.';
