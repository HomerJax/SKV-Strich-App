-- A normal club member must not be able to modify arbitrary player rows.
-- Keep the existing self-profile and club-admin update policies.
drop policy if exists players_update_own_club on public.players;
