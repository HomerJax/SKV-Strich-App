-- Hide administrative wheel odds and historic per-spin odds from regular clients.
-- The app's server-only service-role access remains unrestricted.
-- Existing team feed only needs the public spin fields below.
revoke select on table public.penalty_wheel_spins from anon, authenticated;
grant select (
  id, club_id, penalty_id, player_id, outcome, spun_by, spun_at,
  outcome_label, outcome_detail, outcome_icon
) on table public.penalty_wheel_spins to authenticated;
