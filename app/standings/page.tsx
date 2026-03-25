import { requireClub } from "@/lib/auth/guards";
import StandingsClient from "./StandingsClient";

export default async function StandingsPage() {
  const { clubId } = await requireClub();

  return <StandingsClient initialClubId={clubId} />;
}