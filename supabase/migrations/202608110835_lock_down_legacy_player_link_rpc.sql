-- This legacy SECURITY DEFINER RPC accepts an arbitrary user id and email and
-- performs a privileged player update without checking auth.uid(). It is not
-- used by the current signup flow with this signature, so keep it server-only.
revoke execute on function public.link_existing_player_by_email(uuid, text) from public;
revoke execute on function public.link_existing_player_by_email(uuid, text) from anon;
revoke execute on function public.link_existing_player_by_email(uuid, text) from authenticated;
grant execute on function public.link_existing_player_by_email(uuid, text) to service_role;
