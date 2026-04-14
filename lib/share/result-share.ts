import { createClient } from "@/lib/supabase/server";
import { ResultShareData } from "./types";
import { formatDate } from "./utils";
import { getBaseShareBranding } from "./brand";

type SessionRow = {
  id: number;
  date: string | null;
  club_id: string;
  winner_photo_path: string | null;
};

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
  primary_color: string | null;
};

type ResultRow = {
  id: number;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

export type ResultSharePayload = ResultShareData & {
  sessionId: number;
  clubName?: string | null;
  clubLogoUrl?: string | null;
  strikrLogoUrl?: string | null;
  clubPrimaryColor?: string | null;
  winnerWasShorthanded?: boolean;
  upsetWin?: boolean;
  dramaticFinish?: boolean;
};

function buildWinnerLabel(goalsA: number, goalsB: number) {
  if (goalsA === goalsB) {
    return "Remis";
  }

  return goalsA > goalsB ? "Team A gewinnt" : "Team B gewinnt";
}

async function toDataUrlFromSignedUrl(url: string) {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Siegerfoto konnte nicht geladen werden (HTTP ${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return `data:${contentType};base64,${base64}`;
}

async function getWinnerPhotoUrl(
  winnerPhotoPath: string | null,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  if (!winnerPhotoPath) {
    return null;
  }

  try {
    const { data, error } = await supabase.storage
      .from("session-photos")
      .createSignedUrl(winnerPhotoPath, 60 * 60);

    if (error || !data?.signedUrl) {
      return null;
    }

    return await toDataUrlFromSignedUrl(data.signedUrl);
  } catch (error) {
    console.error("Failed to prepare winner photo for result share:", error);
    return null;
  }
}

async function getClubShareData(
  clubId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data } = await supabase
    .from("clubs")
    .select("id, display_name, logo_path, primary_color")
    .eq("id", clubId)
    .maybeSingle();

  const club = (data ?? null) as ClubRow | null;

  let clubLogoUrl: string | null = null;

  if (club?.logo_path) {
    const { data: logoData } = supabase.storage
      .from("club-logos")
      .getPublicUrl(club.logo_path);

    clubLogoUrl = logoData?.publicUrl ?? null;
  }

  return {
    club,
    clubLogoUrl,
  };
}

function buildStoryFlags(goalsA: number, goalsB: number) {
  const goalDiff = Math.abs(goalsA - goalsB);

  return {
    winnerWasShorthanded: false,
    upsetWin: false,
    dramaticFinish: goalDiff <= 1,
  };
}

export async function getResultShareData(
  sessionIdRaw: string
): Promise<ResultSharePayload> {
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
    throw new Error(
      `Ergebnis konnte nicht geladen werden: ${resultError.message}`
    );
  }

  const session = sessionData as SessionRow;
  const result = (resultData ?? null) as ResultRow | null;

  if (!result) {
    throw new Error("Für diese Session gibt es noch kein Ergebnis");
  }

  const branding = await getBaseShareBranding();
  const [{ club, clubLogoUrl }, winnerPhotoUrl] = await Promise.all([
    getClubShareData(session.club_id, supabase),
    getWinnerPhotoUrl(session.winner_photo_path, supabase),
  ]);

  if (club?.display_name) {
    branding.clubName = club.display_name;
  }

  if (clubLogoUrl) {
    branding.clubCrestUrl = clubLogoUrl;
  }

  const goalsA = result.goals_team_a ?? 0;
  const goalsB = result.goals_team_b ?? 0;
  const storyFlags = buildStoryFlags(goalsA, goalsB);

  return {
    sessionId: session.id,
    title: "Ergebnis",
    subtitle: "match result by strikr",
    date: session.date ? formatDate(session.date) : "",
    goalsA: String(goalsA),
    goalsB: String(goalsB),

    teamAName: "",
    teamBName: "",

    winnerLabel: buildWinnerLabel(goalsA, goalsB),
    winnerPhotoUrl,
    branding,

    clubName: club?.display_name ?? branding.clubName ?? null,
    clubLogoUrl,
    strikrLogoUrl: branding.appLogoUrl ?? null,
    clubPrimaryColor: club?.primary_color ?? null,

    winnerWasShorthanded: storyFlags.winnerWasShorthanded,
    upsetWin: storyFlags.upsetWin,
    dramaticFinish: storyFlags.dramaticFinish,
  };
}