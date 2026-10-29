-- SKV Rutesheim AH: wheel only from 29 Oct 2026, 20:30 Europe/Berlin
-- and exclusively for penalties created on/after 29 Oct 2026, 18:30.
-- This supplements the previous emergency production pause (already applied).
create table if not exists public.penalty_wheel_pauses (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  paused_until timestamptz not null,
  reason text not null default '',
  session_id bigint references public.sessions(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.penalty_wheel_pauses
  add column if not exists eligible_penalties_from timestamptz;
alter table public.penalty_wheel_pauses enable row level security;
revoke all on public.penalty_wheel_pauses from public,anon,authenticated;
grant all on public.penalty_wheel_pauses to service_role;
insert into public.penalty_wheel_pauses
 (club_id,paused_until,eligible_penalties_from,reason,session_id,updated_at)
values
 ('108590d9-0877-4787-90a5-4679615b3b76'::uuid,
  '2026-10-29 20:30:00+01'::timestamptz,
  '2026-10-29 18:30:00+01'::timestamptz,
  'SKV: Glücksrad ab 29.10.2026 20:30; nur für ab 18:30 neu angelegte Strafen',
  960,now())
on conflict (club_id) do update set
  paused_until=excluded.paused_until,
  eligible_penalties_from=excluded.eligible_penalties_from,
  reason=excluded.reason,
  session_id=excluded.session_id,
  updated_at=now();

create or replace function public.guard_penalty_wheel_pause()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
  v_until timestamptz;
  v_from timestamptz;
  v_created timestamptz;
begin
  select p.paused_until,p.eligible_penalties_from
  into v_until,v_from from public.penalty_wheel_pauses p
  where p.club_id=new.club_id;
  if v_until is not null and statement_timestamp()<v_until then
    raise exception 'wheel_paused_until_%',
      to_char(v_until at time zone 'Europe/Berlin','YYYY-MM-DD_HH24:MI')
      using errcode='P0001';
  end if;
  if v_from is not null then
    select created_at into v_created from public.penalties
    where id=new.penalty_id and club_id=new.club_id;
    if v_created is null or v_created<v_from then
      raise exception 'wheel_penalty_too_old_since_%',
        to_char(v_from at time zone 'Europe/Berlin','YYYY-MM-DD_HH24:MI')
        using errcode='P0001';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_penalty_wheel_pause() from public,anon,authenticated;
drop trigger if exists trg_guard_penalty_wheel_pause on public.penalty_wheel_spins;
create trigger trg_guard_penalty_wheel_pause
 before insert on public.penalty_wheel_spins
 for each row execute function public.guard_penalty_wheel_pause();
