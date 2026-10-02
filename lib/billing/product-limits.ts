import type { SupabaseClient } from "@supabase/supabase-js";
import { getClubBillingAccess } from "@/lib/billing/club-billing";

export const FREE_FIXED_PLAYER_LIMIT = 25;
export const FREE_GUESTS_PER_SESSION_LIMIT = 1;
export const FREE_ACTIVE_CATEGORY_LIMIT = 2;
export const FREE_BALANCE_GROUP_LIMIT = 1;
export const FREE_CONTRIBUTION_TYPE_LIMIT = 1;
export const FREE_TRANSACTION_HISTORY_LIMIT = 5;
export const FREE_RSVP_DEADLINE_MINUTES = 30;
export const FREE_FORM_GAMES = 3;

export async function getProductLimits(
  supabase: SupabaseClient,
  clubId: string,
) {
  const billing = await getClubBillingAccess(supabase, clubId);

  return {
    billing,
    isPro: billing.isPro,
    fixedPlayers: billing.isPro ? null : FREE_FIXED_PLAYER_LIMIT,
    guestsPerSession: billing.isPro ? null : FREE_GUESTS_PER_SESSION_LIMIT,
    activeCategories: billing.isPro ? null : FREE_ACTIVE_CATEGORY_LIMIT,
    balanceGroups: billing.isPro ? null : FREE_BALANCE_GROUP_LIMIT,
    contributionTypes: billing.isPro ? null : FREE_CONTRIBUTION_TYPE_LIMIT,
    transactionHistory: billing.isPro ? null : FREE_TRANSACTION_HISTORY_LIMIT,
    rsvpDeadlineMinutes: billing.isPro ? null : FREE_RSVP_DEADLINE_MINUTES,
    formGames: billing.isPro ? null : FREE_FORM_GAMES,
  };
}

export async function canAddFixedPlayer(
  supabase: SupabaseClient,
  clubId: string,
) {
  const limits = await getProductLimits(supabase, clubId);
  if (limits.fixedPlayers === null) return true;

  const { count, error } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("is_guest", false);

  if (error) throw new Error(error.message);
  return (count ?? 0) < limits.fixedPlayers;
}

export async function canAddGuestToSession(
  supabase: SupabaseClient,
  clubId: string,
  sessionId: number,
) {
  const limits = await getProductLimits(supabase, clubId);
  if (limits.guestsPerSession === null) return true;

  const { data, error } = await supabase
    .from("session_players")
    .select("player_id, players!inner(is_guest, club_id)")
    .eq("session_id", sessionId)
    .eq("players.club_id", clubId)
    .eq("players.is_guest", true);

  if (error) throw new Error(error.message);
  return (data ?? []).length < limits.guestsPerSession;
}
