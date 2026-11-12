-- Optional per-club player who must be placed on the larger team by automatic generation.
ALTER TABLE public.club_settings
  ADD COLUMN IF NOT EXISTS protected_player_id bigint NULL;

-- One receipt per authenticated user and feature release.
CREATE TABLE IF NOT EXISTS public.admin_feature_announcement_receipts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  release_key text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, release_key)
);
ALTER TABLE public.admin_feature_announcement_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own announcement receipts read" ON public.admin_feature_announcement_receipts;
CREATE POLICY "own announcement receipts read"
  ON public.admin_feature_announcement_receipts FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "own announcement receipts insert" ON public.admin_feature_announcement_receipts;
CREATE POLICY "own announcement receipts insert"
  ON public.admin_feature_announcement_receipts FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
GRANT SELECT, INSERT ON public.admin_feature_announcement_receipts TO authenticated;
