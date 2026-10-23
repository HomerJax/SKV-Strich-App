-- Editable club-level entertainment wheel; monetary penalties remain independent.
create table if not exists public.penalty_wheel_settings (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  segments jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.penalty_wheel_settings enable row level security;
revoke all on public.penalty_wheel_settings from anon, authenticated;
-- Only server-side service role reads/writes configuration after membership checks.

alter table public.penalty_wheel_spins
  add column if not exists outcome_label text,
  add column if not exists outcome_detail text,
  add column if not exists outcome_icon text,
  add column if not exists segments_snapshot jsonb;

-- Preserve meaning of spins made with the original fixed wheel, even after admins edit it.
update public.penalty_wheel_spins set
  outcome_label = case outcome
    when 'lucky' then 'Joker'
    when 'usual' then 'Bleibt'
    when 'confession' then 'Beichte'
    when 'challenge' then 'Challenge'
    else outcome end,
  outcome_detail = case outcome
    when 'lucky' then 'Heute keine Kabinensprüche'
    when 'usual' then 'Keine Zusatzaufgabe'
    when 'confession' then 'Erzähl deine beste Ausrede'
    when 'challenge' then 'Du machst das Aufwärmen'
    else '' end,
  outcome_icon = case outcome
    when 'lucky' then '🍀'
    when 'usual' then '😎'
    when 'confession' then '🎤'
    when 'challenge' then '🔥'
    else '🎡' end,
  segments_snapshot = '[
    {"id":"lucky","icon":"🍀","label":"Joker","description":"Heute keine Kabinensprüche","weight":10},
    {"id":"usual","icon":"😎","label":"Bleibt","description":"Keine Zusatzaufgabe","weight":70},
    {"id":"confession","icon":"🎤","label":"Beichte","description":"Erzähl deine beste Ausrede","weight":15},
    {"id":"challenge","icon":"🔥","label":"Challenge","description":"Du machst das Aufwärmen","weight":5}
  ]'::jsonb
where segments_snapshot is null;

-- Configured segment IDs are not limited to the four original names.
alter table public.penalty_wheel_spins
  drop constraint if exists penalty_wheel_spins_outcome_check;
