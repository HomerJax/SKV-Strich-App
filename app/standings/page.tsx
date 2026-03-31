import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import StandingsClient from "./StandingsClient";

type ClubRow = {
  id: string;
  primary_color: string | null;
};

export default async function StandingsPage() {
  const { clubId } = await requireClub();
  const supabase = await createClient();

  const { data: clubData } = await supabase
    .from("clubs")
    .select("id, primary_color")
    .eq("id", clubId)
    .maybeSingle<ClubRow>();

  return (
    <StandingsClient
      initialClubId={clubId}
      initialPrimaryColor={clubData?.primary_color ?? "black"}
    />
  );
}