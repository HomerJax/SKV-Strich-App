import { createClient } from "@/lib/supabase/server";
import { LineupShareData, SharePlayer } from "./types";
import { buildPlayerDisplayName, formatDate } from "./utils";
import { getBaseShareBranding } from "./brand";

type SessionRow = {
  id: number;
  date: string | null;
  club_id: number;
};

type ClubRow = {
  id: number;
  display_name: string | null;
  logo_path: string | null;
};

type SessionPlayerRow = {
  player_id: number;
};

type PlayerRow = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  is_active: boolean | null;
};

type ResultRow = {
  id: number;
  team_a_id: number | null;
  team_b_id: number | null;
};

type TeamPlayerRow = {
  team_id: number;
  player_id: number;
};

function splitPlayersIntoTwoTeams(players: SharePlayer[]) {
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name, "de"));

  const teamA: SharePlayer[] = [];
  const teamB: SharePlayer[] = [];

  sorted.forEach((player, index) => {
    if (index % 2 === 0) {
      teamA.push(player);
    } else {
      teamB.push(player);
    }
  });

  return { teamA, teamB };
}

export async function getLineupShareData(
  sessionIdRaw: string
): Promise<LineupShareData> {
  const sessionId = Number(sessionIdRaw);

  if (!Number.isFinite(sessionId)) {
    throw new Error("Ungültige Session-ID");
  }

  const supabase = await createClient();

  const [
    { data: sessionData, error: sessionError },
    { data: sessionPlayersData, error: sessionPlayersError },
    { data: resultData, error: resultError },
  ] = await Promise.all([
    supabase.from("sessions").select("id, date, club_id").eq("id", sessionId).single(),
    supabase.from("session_players").select("player_id").eq("session_id", sessionId),
    supabase
      .from("results")
      .select("id, team_a_id, team_b_id")
      .eq("session_id", sessionId)
      .maybeSingle(),
  ]);

  if (sessionError || !sessionData) {
    throw new Error("Session nicht gefunden");
  }

  if (sessionPlayersError) {
    throw new Error(
      `Session-Spieler konnten nicht geladen werden: ${sessionPlayersError.message}`
    );
  }

  if (resultError) {
    throw new Error(`Ergebnis konnte nicht geladen werden: ${resultError.message}`);
  }

  const session = sessionData as SessionRow;
  const sessionPlayers = (sessionPlayersData ?? []) as SessionPlayerRow[];
  const result = (resultData ?? null) as ResultRow | null;

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

  const presentIds = sessionPlayers.map((row) => row.player_id);

  if (presentIds.length === 0) {
    return {
      title: "Aufstellung",
      subtitle: "Noch keine anwesenden Spieler gespeichert",
      date: session.date ? formatDate(session.date) : "",
      teamA: {
        name: "Team A",
        players: [],
      },
      teamB: {
        name: "Team B",
        players: [],
      },
      branding,
    };
  }

  const { data: playersData, error: playersError } = await supabase
    .from("players")
    .select("id, name, first_name, last_name, nickname, is_active")
    .eq("club_id", session.club_id)
    .in("id", presentIds)
    .order("name");

  if (playersError) {
    throw new Error(`Spieler konnten nicht geladen werden: ${playersError.message}`);
  }

  const playerRows = ((playersData ?? []) as PlayerRow[]).filter(
    (player) => player.is_active !== false
  );

  const playersById = new Map<number, SharePlayer>();

  for (const player of playerRows) {
    playersById.set(player.id, {
      id: String(player.id),
      name: buildPlayerDisplayName(player),
    });
  }

  let teamAPlayers: SharePlayer[] = [];
  let teamBPlayers: SharePlayer[] = [];
  let subtitle = "balanced by strikr";

  const hasStoredTeams =
    result && (result.team_a_id !== null || result.team_b_id !== null);

  if (hasStoredTeams) {
    const teamIds = [result.team_a_id, result.team_b_id].filter(
      (value): value is number => value !== null
    );

    const { data: teamPlayersData, error: teamPlayersError } = await supabase
      .from("team_players")
      .select("team_id, player_id")
      .in("team_id", teamIds);

    if (teamPlayersError) {
      throw new Error(
        `Team-Zuordnungen konnten nicht geladen werden: ${teamPlayersError.message}`
      );
    }

    const teamPlayers = (teamPlayersData ?? []) as TeamPlayerRow[];

    for (const row of teamPlayers) {
      const mappedPlayer = playersById.get(row.player_id);

      if (!mappedPlayer) {
        continue;
      }

      if (row.team_id === result?.team_a_id) {
        teamAPlayers.push(mappedPlayer);
      }

      if (row.team_id === result?.team_b_id) {
        teamBPlayers.push(mappedPlayer);
      }
    }

    teamAPlayers = teamAPlayers.sort((a, b) => a.name.localeCompare(b.name, "de"));
    teamBPlayers = teamBPlayers.sort((a, b) => a.name.localeCompare(b.name, "de"));

    subtitle = "gespeicherte Teams aus der Session";
  } else {
    const presentPlayers = presentIds
      .map((id) => playersById.get(id))
      .filter((player): player is SharePlayer => Boolean(player));

    const split = splitPlayersIntoTwoTeams(presentPlayers);
    teamAPlayers = split.teamA;
    teamBPlayers = split.teamB;
  }

  return {
    title: "Aufstellung",
    subtitle,
    date: session.date ? formatDate(session.date) : "",
    teamA: {
      name: "Team A",
      players: teamAPlayers,
    },
    teamB: {
      name: "Team B",
      players: teamBPlayers,
    },
    branding,
  };
}