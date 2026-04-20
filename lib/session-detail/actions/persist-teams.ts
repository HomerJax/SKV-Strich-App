import { createClient } from "@/lib/supabase/server";

type SessionDetailSupabase = Awaited<ReturnType<typeof createClient>>;
type TeamSide = "A" | "B" | null;
type TeamMap = Record<number, TeamSide>;

type SessionPlayerRow = {
  player_id: number;
};

type PlayerRow = {
  id: number;
};

type TeamRow = {
  id: number;
};

type PersistSessionTeamsInput = {
  supabase: SessionDetailSupabase;
  sessionId: number;
  clubId: string;
  manualTeamsRaw: string;
  requireComplete: boolean;
};

function parseManualTeams(raw: string): TeamMap {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Teamdaten konnten nicht gelesen werden.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Teamdaten sind ungültig.");
  }

  const next: TeamMap = {};

  for (const [key, value] of Object.entries(parsed)) {
    const playerId = Number(key);

    if (!Number.isFinite(playerId)) {
      continue;
    }

    next[playerId] = value === "A" || value === "B" ? value : null;
  }

  return next;
}

async function ensureTeam(
  supabase: SessionDetailSupabase,
  sessionId: number,
  clubId: string,
  name: string
) {
  const { data, error } = await supabase
    .from("teams")
    .select("id")
    .eq("session_id", sessionId)
    .eq("club_id", clubId)
    .eq("name", name)
    .maybeSingle<TeamRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.id) {
    return data.id;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("teams")
    .insert({
      session_id: sessionId,
      club_id: clubId,
      name,
    })
    .select("id")
    .single<TeamRow>();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return inserted.id;
}

export async function persistSessionTeams({
  supabase,
  sessionId,
  clubId,
  manualTeamsRaw,
  requireComplete,
}: PersistSessionTeamsInput) {
  const manualTeams = parseManualTeams(manualTeamsRaw);

  const { data: sessionPlayersData, error: sessionPlayersError } = await supabase
    .from("session_players")
    .select("player_id")
    .eq("session_id", sessionId);

  if (sessionPlayersError) {
    throw new Error(sessionPlayersError.message);
  }

  const presentIds = ((sessionPlayersData ?? []) as SessionPlayerRow[])
    .map((row) => row.player_id)
    .filter(Number.isFinite);

  const presentIdSet = new Set(presentIds);

  const assignedIds = Object.keys(manualTeams)
    .map((key) => Number(key))
    .filter(Number.isFinite)
    .filter((id) => manualTeams[id] === "A" || manualTeams[id] === "B");

  const invalidAssignedIds = assignedIds.filter((id) => !presentIdSet.has(id));

  if (requireComplete && invalidAssignedIds.length > 0) {
    throw new Error(
      "Es dürfen nur aktuell anwesende Spieler in den Teams verwendet werden."
    );
  }

  const relevantAssignedIds = assignedIds.filter((id) => presentIdSet.has(id));

  const { data: presentPlayersData, error: presentPlayersError } = await supabase
    .from("players")
    .select("id")
    .eq("club_id", clubId)
    .in("id", presentIds.length > 0 ? presentIds : [-1]);

  if (presentPlayersError) {
    throw new Error(presentPlayersError.message);
  }

  const presentPlayers = (presentPlayersData ?? []) as PlayerRow[];
  const existingPresentPlayerIds = new Set(presentPlayers.map((player) => player.id));

  if (requireComplete && presentPlayers.length !== presentIds.length) {
    throw new Error(
      "Spielerdaten der anwesenden Spieler konnten nicht vollständig geladen werden."
    );
  }

  const teamAIds = relevantAssignedIds.filter(
    (playerId) => manualTeams[playerId] === "A" && existingPresentPlayerIds.has(playerId)
  );
  const teamBIds = relevantAssignedIds.filter(
    (playerId) => manualTeams[playerId] === "B" && existingPresentPlayerIds.has(playerId)
  );

  if (requireComplete) {
    if (presentIds.length < 2) {
      throw new Error("Mindestens 2 anwesende Spieler sind erforderlich.");
    }

    const missingAssignments = presentIds.filter((id) => {
      const side = manualTeams[id];
      return side !== "A" && side !== "B";
    });

    if (missingAssignments.length > 0) {
      throw new Error("Alle anwesenden Spieler müssen einem Team zugewiesen sein.");
    }

    if (teamAIds.length === 0 || teamBIds.length === 0) {
      throw new Error("Beide Teams brauchen mindestens einen Spieler.");
    }

    if (teamAIds.length + teamBIds.length !== presentIds.length) {
      throw new Error(
        "Alle anwesenden Spieler müssen genau einem Team zugewiesen sein."
      );
    }

    if (Math.abs(teamAIds.length - teamBIds.length) > 1) {
      throw new Error("Teams dürfen höchstens 1 Spieler Unterschied haben.");
    }
  }

  const teamAId = await ensureTeam(supabase, sessionId, clubId, "Team 1");
  const teamBId = await ensureTeam(supabase, sessionId, clubId, "Team 2");

  const { error: deleteTeamPlayersError } = await supabase
    .from("team_players")
    .delete()
    .in("team_id", [teamAId, teamBId]);

  if (deleteTeamPlayersError) {
    throw new Error(deleteTeamPlayersError.message);
  }

  const teamPlayerRows = [
    ...teamAIds.map((playerId) => ({
      team_id: teamAId,
      player_id: playerId,
    })),
    ...teamBIds.map((playerId) => ({
      team_id: teamBId,
      player_id: playerId,
    })),
  ];

  if (teamPlayerRows.length > 0) {
    const { error: insertTeamPlayersError } = await supabase
      .from("team_players")
      .insert(teamPlayerRows);

    if (insertTeamPlayersError) {
      throw new Error(insertTeamPlayersError.message);
    }
  }

  return {
    teamAId,
    teamBId,
    assignedCount: teamPlayerRows.length,
  };
}