create or replace function public.accept_club_invite(p_token text)
returns public.club_memberships
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_invite public.invites%rowtype;
  v_membership public.club_memberships%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Nicht eingeloggt.';
  end if;

  select * into v_invite
  from public.invites i
  where i.token = p_token
  limit 1;

  if v_invite.id is null then
    raise exception 'Einladung nicht gefunden.';
  end if;

  if not exists (
    select 1 from public.clubs c
    where c.id = v_invite.club_id and c.deleted_at is null
  ) then
    raise exception 'Dieser Club ist nicht mehr verfügbar.';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Einladung ist abgelaufen.';
  end if;

  insert into public.club_memberships (club_id, user_id, role)
  values (v_invite.club_id, v_user_id, v_invite.role)
  on conflict (club_id, user_id)
  do update set role = public.club_memberships.role
  returning * into v_membership;

  return v_membership;
end;
$function$;

create or replace function public.accept_club_invite(p_token uuid)
returns public.club_memberships
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid;
  v_invite public.club_invites%rowtype;
  v_membership public.club_memberships%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Nicht eingeloggt.';
  end if;

  select * into v_invite
  from public.club_invites i
  where i.token = p_token
  limit 1;

  if v_invite.id is null then
    raise exception 'Einladung nicht gefunden.';
  end if;

  if not exists (
    select 1 from public.clubs c
    where c.id = v_invite.club_id and c.deleted_at is null
  ) then
    raise exception 'Dieser Club ist nicht mehr verfügbar.';
  end if;

  if v_invite.is_active is not true then
    raise exception 'Einladung ist deaktiviert.';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Einladung ist abgelaufen.';
  end if;

  insert into public.club_memberships (club_id, user_id, role)
  values (v_invite.club_id, v_user_id, v_invite.role)
  on conflict (club_id, user_id)
  do update set role = public.club_memberships.role
  returning * into v_membership;

  return v_membership;
end;
$function$;

create or replace function public.get_invite_public(p_token text)
returns table(
  club_name text,
  role text,
  is_valid boolean,
  is_expired boolean,
  is_accepted boolean,
  expires_at timestamp with time zone
)
language sql
security definer
set search_path to 'public'
as $function$
  select
    c.name::text as club_name,
    i.role::text as role,
    (c.deleted_at is null and i.accepted_at is null and i.expires_at > now()) as is_valid,
    (i.expires_at <= now()) as is_expired,
    (i.accepted_at is not null) as is_accepted,
    i.expires_at
  from public.invites i
  join public.clubs c on c.id = i.club_id
  where i.token = p_token
  limit 1;
$function$;
