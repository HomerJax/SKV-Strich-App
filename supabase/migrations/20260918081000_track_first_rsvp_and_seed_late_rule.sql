create table if not exists public.session_rsvp_first_ins (
  club_id uuid not null references public.clubs(id) on delete cascade,
  session_id bigint not null references public.sessions(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  first_in_at timestamptz not null default now(),
  primary key (session_id, player_id)
);

alter table public.session_rsvp_first_ins enable row level security;

drop policy if exists session_rsvp_first_ins_select_member on public.session_rsvp_first_ins;
create policy session_rsvp_first_ins_select_member
on public.session_rsvp_first_ins
for select
using (public.is_member_of_club(club_id));

insert into public.session_rsvp_first_ins (club_id, session_id, player_id, first_in_at)
select r.club_id, r.session_id, r.player_id, coalesce(r.created_at, r.updated_at, now())
from public.session_rsvps r
where r.status = 'in'
on conflict (session_id, player_id) do nothing;

create or replace function public.seed_late_rsvp_rule_for_new_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass('public.penalty_rules') is not null then
    execute $sql$
      insert into public.penalty_rules (
        club_id, rule_key, label, reason, type, value,
        escalation_after_days, escalation_value, enabled, sort_order
      )
      values ($1, 'late_rsvp', '⏰ Verspätete Anmeldung',
              'Nach Anmeldeschluss zugesagt', 'money', '0,50 €',
              null, null, true, 45)
      on conflict (club_id, rule_key) do nothing
    $sql$ using new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists seed_late_rsvp_rule_after_club_insert on public.clubs;
create trigger seed_late_rsvp_rule_after_club_insert
after insert on public.clubs
for each row execute function public.seed_late_rsvp_rule_for_new_club();
