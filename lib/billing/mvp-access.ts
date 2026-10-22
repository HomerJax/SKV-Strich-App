import type { SupabaseClient } from "@supabase/supabase-js";
import { getClubBillingAccess } from "@/lib/billing/club-billing";

export const FREE_MVP_VOTING_LIMIT_PER_SEASON = 4;

export type MvpVotingAccess = {
  isPro: boolean;
  allowed: boolean;
  usedThisSeason: number;
  freeLimit: number;
  reason: "pro" | "free_available" | "free_limit_reached";
};

type GetMvpVotingAccessArgs = {
  supabase: SupabaseClient;
  clubId: string;
  sessionId: number;
  seasonId: number | null;
};

export async function getMvpVotingAccessForSession({
  supabase,
  clubId,
  sessionId,
  seasonId,
}: GetMvpVotingAccessArgs): Promise<MvpVotingAccess> {
  const billingAccess = await getClubBillingAccess(supabase, clubId);

  if (billingAccess.isPro) {
    return {
      isPro: true,
      allowed: true,
      usedThisSeason: 0,
      freeLimit: FREE_MVP_VOTING_LIMIT_PER_SEASON,
      reason: "pro",
    };
  }

  let query = supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .not("mvp_voting_finalized_at", "is", null)
    .neq("id", sessionId);

  if (seasonId === null) {
    query = query.is("season_id", null);
  } else {
    query = query.eq("season_id", seasonId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const usedThisSeason = count ?? 0;
  const allowed = usedThisSeason < FREE_MVP_VOTING_LIMIT_PER_SEASON;

  return {
    isPro: false,
    allowed,
    usedThisSeason,
    freeLimit: FREE_MVP_VOTING_LIMIT_PER_SEASON,
    reason: allowed ? "free_available" : "free_limit_reached",
  };
}
