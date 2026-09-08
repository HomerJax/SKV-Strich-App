import { requireClub } from "@/lib/auth/guards";
import { getClubBillingAccess } from "@/lib/billing/club-billing";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import StandingsClient from "./StandingsClient";
import StandingsSortAccent from "./StandingsSortAccent";
import StandingsTop10Share from "./StandingsTop10Share";
import "./standings.css";

type ClubRow = {
  id: string;
  display_name: string | null;
  primary_color: string | null;
};

export default async function StandingsPage() {
  const { clubId } = await requireClub();
  const supabase = await createClient();

  const [{ data: clubData }, billingAccess, featureFlags] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, display_name, primary_color")
      .eq("id", clubId)
      .maybeSingle<ClubRow>(),
    getClubBillingAccess(supabase, clubId),
    getFeatureFlagsForClub(clubId),
  ]);

  const primaryColorKey = clubData?.primary_color ?? "black";
  const clubName = clubData?.display_name?.trim() || "dein Team";

  return (
    <>
      <StandingsClient
        initialClubId={clubId}
        initialPrimaryColor={primaryColorKey}
        isPro={billingAccess.isPro}
        clubName={clubName}
        hallOfFameEnabled={featureFlags.hall_of_fame_badges}
      />
      <StandingsTop10Share />
      <StandingsSortAccent />
    </>
  );
}
