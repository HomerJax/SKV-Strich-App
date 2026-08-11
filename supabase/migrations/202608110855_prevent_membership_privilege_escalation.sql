-- Membership rows are authorization state. Creating/updating them directly as
-- the logged-in user allowed arbitrary club joins and self-promotion to admin.
-- Current flows create memberships through trusted server code / SECURITY DEFINER RPCs.
drop policy if exists club_memberships_insert_own on public.club_memberships;
drop policy if exists club_memberships_update_own on public.club_memberships;
