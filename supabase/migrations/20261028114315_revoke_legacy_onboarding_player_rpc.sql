-- P1 #57 follow-up: eliminate a legacy SECURITY DEFINER RPC bypass.
-- The legacy complete_my_onboarding function RETURNS public.players, so it
-- can expose the private strength field even after column privileges were
-- revoked from anon/authenticated.
--
-- The current application onboarding uses Next.js server routes/actions;
-- there are no callers of this legacy RPC in application source.
-- Keep the function definition/data unchanged, but make it inaccessible to
-- ordinary Data API roles. Existing service code is unaffected.
REVOKE EXECUTE ON FUNCTION public.complete_my_onboarding(text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
