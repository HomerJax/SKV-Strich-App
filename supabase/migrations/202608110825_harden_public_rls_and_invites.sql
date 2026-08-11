-- Close tables in the exposed public schema that previously had RLS disabled.

alter table public.user_roles enable row level security;
alter table public.club_categories enable row level security;
alter table public.player_badges enable row level security;
alter table public.club_invites enable row level security;

-- user_roles is authorization data: users may only read their own role row.
drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

-- Categories are readable only inside the user's clubs, plus by strikr power users.
drop policy if exists club_categories_select_member_or_power_user on public.club_categories;
create policy club_categories_select_member_or_power_user
on public.club_categories
for select
to authenticated
using (
  public.is_member_of_club(club_id)
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.is_power_user = true
  )
);

-- Badge data follows the same club visibility rule. Writes stay server-side/service-role only.
drop policy if exists player_badges_select_member_or_power_user on public.player_badges;
create policy player_badges_select_member_or_power_user
on public.player_badges
for select
to authenticated
using (
  public.is_member_of_club(club_id)
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.is_power_user = true
  )
);

-- club_invites is legacy/server-only. RLS stays enabled with no client policies.

-- The current invites table had legacy permissive policies that allowed every
-- authenticated user to read and mutate every invite, including admin invites.
-- Keep the existing club-admin-specific policies and remove the broad ones.
drop policy if exists "allow all invites" on public.invites;
drop policy if exists "allow select invites for authenticated" on public.invites;
