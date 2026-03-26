import { createClient } from "@/lib/supabase/server";
import { ResultShareData } from "./types";
import { formatDate } from "./utils";
import { getBaseShareBranding } from "./brand";

type SessionRow = {
  id: number;
  date: string | null;
  club_id: number;
  winner_photo_path: string | null;
};

type ClubRow = {
  id: number;
  display_name: string | null;
  logo_path: string | null;
};

type ResultRow = {
  id: number;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

export async function getResultShareData(
  sessionIdRaw: string
): Promise<ResultShareData> {
  const sessionId = Number(sessionIdRaw);

  if (!Number.isFinite(sessionId)) {
    throw new Error("Ungültige Session-ID");
  }

  const supabase = await createClient();

  const [
    { data: sessionData, error: sessionError },
    { data: resultData, error: resultError },
  ] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, date, club_id, winner_photo_path")
      .eq("id", sessionId)
      .single(),
    supabase
      .from("results")
      .select("id, team_a_id, team_b_id, goals_team_a, goals_team_b")
      .eq("session_id", sessionId)
      .maybeSingle(),
  ]);

  if (sessionError || !sessionData) {
    throw new Error("Session nicht gefunden");
  }

  if (resultError) {
    throw new Error(`Ergebnis konnte nicht geladen werden: ${resultError.message}`);
  }

  const session = sessionData as SessionRow;
  const result = (resultData ?? null) as ResultRow | null;

  if (!result) {
    throw new Error("Für diese Session gibt es noch kein Ergebnis");
  }

  const branding = await getBaseShareBranding();

  const { data: clubData } = await supabase
    .from("clubs")
    .select("id, display_name, logo_path")
    .eq("id", session.club_id)
    .maybeSingle();

  const club = (clubData ?? null) as ClubRow | null;

  if (club?.display_name) {
    branding.clubName = club.display_name;
  }

  if (club?.logo_path) {
    const { data: logoData } = supabase.storage
      .from("club-logos")
      .getPublicUrl(club.logo_path);

    branding.clubCrestUrl = logoData?.publicUrl ?? null;
  }

  const goalsA = result.goals_team_a ?? 0;
  const goalsB = result.goals_team_b ?? 0;

  let winnerLabel = "Unentschieden";

  if (goalsA > goalsB) {
    winnerLabel = "Team A gewinnt";
  } else if (goalsB > goalsA) {
    winnerLabel = "Team B gewinnt";
  }

  let winnerPhotoUrl: string | null = null;

  if (session.winner_photo_path) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from("session-photos")
      .createSignedUrl(session.winner_photo_path, 60 * 60);

    if (!signedError) {
      winnerPhotoUrl = signedData?.signedUrl ?? null;
    }
  }

  return {
    title: "Ergebnis",
    subtitle: "match result by strikr",
    date: session.date ? formatDate(session.date) : "",
    goalsA: String(goalsA),
    goalsB: String(goalsB),
    teamAName: "Team A",
    teamBName: "Team B",
    winnerLabel,
    winnerPhotoUrl,
    branding,
  };
}