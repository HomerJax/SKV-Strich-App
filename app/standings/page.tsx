import { requireClub } from "@/lib/auth/guards";
import { getClubBillingAccess } from "@/lib/billing/club-billing";
import { createClient } from "@/lib/supabase/server";
import StandingsClient from "./StandingsClient";

type ClubRow = {
  id: string;
  display_name: string | null;
  primary_color: string | null;
};

export default async function StandingsPage() {
  const { clubId } = await requireClub();
  const supabase = await createClient();

  const { data: clubData } = await supabase
    .from("clubs")
    .select("id, display_name, primary_color")
    .eq("id", clubId)
    .maybeSingle<ClubRow>();

  const primaryColorKey = clubData?.primary_color ?? "black";
  const clubName = clubData?.display_name?.trim() || "dein Team";
  const billingAccess = await getClubBillingAccess(supabase, clubId);

  return (
    <StandingsClient
      initialClubId={clubId}
      initialPrimaryColor={primaryColorKey}
      isPro={billingAccess.isPro}
      clubName={clubName}
    />
  );
}
