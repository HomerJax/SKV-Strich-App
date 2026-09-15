alter table public.penalties add column if not exists source_key text;
create unique index if not exists penalties_club_player_source_key_unique on public.penalties(club_id, player_id, source_key) where source_key is not null;

create table if not exists public.penalty_rules (
  club_id uuid not null references public.clubs(id) on delete cascade,
  rule_key text not null,
  label text not null,
  reason text not null,
  type text not null check (type in ('beer','money','custom')),
  value text not null,
  escalation_after_days integer,
  escalation_value text,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (club_id, rule_key)
);

alter table public.penalty_rules enable row level security;

drop policy if exists penalties_select_member on public.penalties;
drop policy if exists penalties_insert_member on public.penalties;
drop policy if exists penalties_update_admin on public.penalties;
drop policy if exists penalties_delete_admin on public.penalties;
create policy penalties_select_member on public.penalties for select using (public.is_member_of_club(club_id));
create policy penalties_insert_member on public.penalties for insert with check (public.is_member_of_club(club_id));
create policy penalties_update_admin on public.penalties for update using (public.is_admin_of_club(club_id)) with check (public.is_admin_of_club(club_id));
create policy penalties_delete_admin on public.penalties for delete using (public.is_admin_of_club(club_id));

drop policy if exists penalty_rules_select_member on public.penalty_rules;
drop policy if exists penalty_rules_insert_admin on public.penalty_rules;
drop policy if exists penalty_rules_update_admin on public.penalty_rules;
drop policy if exists penalty_rules_delete_admin on public.penalty_rules;
create policy penalty_rules_select_member on public.penalty_rules for select using (public.is_member_of_club(club_id));
create policy penalty_rules_insert_admin on public.penalty_rules for insert with check (public.is_admin_of_club(club_id));
create policy penalty_rules_update_admin on public.penalty_rules for update using (public.is_admin_of_club(club_id)) with check (public.is_admin_of_club(club_id));
create policy penalty_rules_delete_admin on public.penalty_rules for delete using (public.is_admin_of_club(club_id));

insert into public.penalty_rules (club_id,rule_key,label,reason,type,value,escalation_after_days,escalation_value,sort_order)
select c.id, r.rule_key, r.label, r.reason, r.type, r.value, r.days, r.escalation, r.sort_order
from public.clubs c
cross join (values
 ('missed_penalty','⚽ Elfer verschossen','Elfmeter verschossen','beer','1 Kiste Bier',28,'+ 1 Sechserträger',10),
 ('birthday','🎂 Geburtstag','Geburtstag','beer','1 Kiste Bier',28,'+ 1 Sechserträger',20),
 ('no_show','👻 Zugesagt, nicht gekommen','Zugesagt, aber nicht gekommen','beer','1 Kiste Bier',28,'+ 1 Sechserträger',30),
 ('late','⏰ Zu spät','Zugesagt, aber zu spät gekommen','money','0,50 €',null,null,40),
 ('walk_in','🥷 Nicht zugesagt, trotzdem gekommen','Nicht zugesagt, aber trotzdem gekommen','money','0,50 €',null,null,50)
) as r(rule_key,label,reason,type,value,days,escalation,sort_order)
on conflict (club_id,rule_key) do nothing;

create or replace function public.create_daily_birthday_penalties()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
  berlin_today date := (now() at time zone 'Europe/Berlin')::date;
begin
  insert into public.penalties (club_id,player_id,reason,type,value,due_date,escalation_after_days,escalation_value,source_key,notes)
  select p.club_id,p.id,r.reason,r.type,r.value,
         case when r.escalation_after_days is not null then berlin_today + r.escalation_after_days else null end,
         r.escalation_after_days,r.escalation_value,'birthday:' || extract(year from berlin_today)::int::text,'Automatisch aus Geburtstag im Spielerpass'
  from public.players p
  join public.penalty_rules r on r.club_id=p.club_id and r.rule_key='birthday' and r.enabled=true
  join public.club_feature_flags f on f.club_id=p.club_id and f.feature_key='penalties' and f.enabled=true
  where p.is_active=true and coalesce(p.is_guest,false)=false and p.birth_date is not null
    and extract(month from p.birth_date)=extract(month from berlin_today)
    and extract(day from p.birth_date)=extract(day from berlin_today)
  on conflict (club_id,player_id,source_key) where source_key is not null do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
revoke all on function public.create_daily_birthday_penalties() from public;

create extension if not exists pg_cron with schema extensions;
do $$
begin
  if not exists (select 1 from cron.job where jobname='strikr_daily_birthday_penalties') then
    perform cron.schedule('strikr_daily_birthday_penalties','5 5 * * *','select public.create_daily_birthday_penalties();');
  end if;
end $$;