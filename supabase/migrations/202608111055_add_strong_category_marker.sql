alter table public.club_categories
  add column if not exists is_strong boolean not null default false;

with ranked as (
  select id,
         row_number() over (
           partition by club_id
           order by is_active desc, sort_order asc nulls last, id asc
         ) as rn
  from public.club_categories
  where is_active = true
)
update public.club_categories c
set is_strong = true
from ranked r
where c.id = r.id
  and r.rn = 1
  and not exists (
    select 1
    from public.club_categories existing
    where existing.club_id = c.club_id
      and existing.is_strong = true
  );

create unique index if not exists club_categories_one_strong_per_club_idx
  on public.club_categories (club_id)
  where is_strong = true;
