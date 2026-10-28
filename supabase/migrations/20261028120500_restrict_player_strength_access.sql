-- P1 #57: protect individual player strength against direct PostgREST/Data API reads.
-- RLS continues to decide which rows belong to the user's club.
-- Column grants decide which attributes anon/authenticated can access.
-- Admin endpoints obtain strength with service_role AFTER server authorization.
--
-- Table-level SELECT/UPDATE would override a column-specific REVOKE.
-- In one transaction revoke those broad privileges and grant all ordinary
-- profile columns except the sensitive 'strength'.
REVOKE SELECT, UPDATE ON TABLE public.players FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, name, preferred_position, is_active, created_at, age_group, club_id, user_id, first_name, last_name, nickname, is_guest, category_key, email, mvp_count, badge_level, balance_group, roster_role, selected_badge_key, birth_date, jersey_number, photo_path, photo_position_x, photo_position_y, photo_zoom, can_lead_training) ON TABLE public.players TO anon, authenticated;
GRANT UPDATE (id, name, preferred_position, is_active, created_at, age_group, club_id, user_id, first_name, last_name, nickname, is_guest, category_key, email, mvp_count, badge_level, balance_group, roster_role, selected_badge_key, birth_date, jersey_number, photo_path, photo_position_x, photo_position_y, photo_zoom, can_lead_training) ON TABLE public.players TO anon, authenticated;

-- INSERT, DELETE, existing RLS policies and service_role remain unchanged.
-- New player columns must be reviewed and explicitly granted in the future.
