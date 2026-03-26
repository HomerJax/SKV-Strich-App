import { createClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/session-detail/response";

type SessionDetailSupabase = Awaited<ReturnType<typeof createClient>>;
type TeamMap = Record<number, "A" | "B" | null>;

function normalizeGoalValue(value: string | null | undefined) {
  const clean = String(value ?? "").trim();
  if (clean === "") return "";
  if (!/^\d+$/.test(clean)) return null;
  return clean;
}

type SaveResultInput = {
  supabase: SessionDetailSupabase;
  sessionId: number;
  clubId: string;
  goalsA: string;
  goalsB: string;
  manualTeamsRaw: string;
};

type PresentPlayerRow = {
  id: number;
};

type SessionPlayerRow = {
  player_id: number;
};

export async function handleSaveResult({
  supabase,
  sessionId,
  clubId,
  goalsA,
  goalsB,
  manualTeamsRaw,
}: SaveResultInput) {
  try {
    const cleanA = normalizeGoalValue(goalsA);
    const cleanB = normalizeGoalValue(goalsB);

    if (cleanA === null || cleanB === null) {
      return fail("Bitte ein gültiges Ergebnis eingeben.");
    }

    let manualTeams: TeamMap = {};
    try {
      manualTeams = JSON.parse(manualTeamsRaw) as TeamMap;
    } catch {
      return fail("Teamdaten konnten nicht gelesen werden.");
    }

    const { data: sessionPlayersData, error: sessionPlayersError } =
      await supabase
        .from("session_players")
        .select("player_id")
        .eq("session_id", sessionId);

    if (sessionPlayersError) {
      return fail(sessionPlayersError.message, 500);
    }

    const presentIds = ((sessionPlayersData ?? []) as SessionPlayerRow[])
      .map((row) => row.player_id)
      .filter(Number.isFinite);

    if (presentIds.length < 2) {
      return fail("Mindestens 2 anwesende Spieler sind erforderlich.");
    }

    const presentIdSet = new Set(presentIds);

    const assignedIds = Object.keys(manualTeams)
      .map((key) => Number(key))
      .filter(Number.isFinite);

    const invalidAssignedIds = assignedIds.filter((id) => !presentIdSet.has(id));

    if (invalidAssignedIds.length > 0) {
      return fail(
        "Es dürfen nur aktuell anwesende Spieler in den Teams verwendet werden."
      );
    }

    const missingAssignments = presentIds.filter((id) => {
      const side = manualTeams[id];
      return side !== "A" && side !== "B";
    });

    if (missingAssignments.length > 0) {
      return fail("Alle anwesenden Spieler müssen einem Team zugewiesen sein.");
    }

    const { data: presentPlayersData, error: presentPlayersError } =
      await supabase
        .from("players")
        .select("id")
        .eq("club_id", clubId)
        .in("id", presentIds);

    if (presentPlayersError) {
      return fail(presentPlayersError.message, 500);
    }

    const presentPlayers = (presentPlayersData ?? []) as PresentPlayerRow[];

    if (presentPlayers.length !== presentIds.length) {
      return fail(
        "Spielerdaten der anwesenden Spieler konnten nicht vollständig geladen werden."
      );
    }

    const teamA = presentPlayers.filter((player) => manualTeams[player.id] === "A");
    const teamB = presentPlayers.filter((player) => manualTeams[player.id] === "B");

    if (teamA.length === 0 || teamB.length === 0) {
      return fail("Beide Teams brauchen mindestens einen Spieler.");
    }

    if (teamA.length + teamB.length !== presentPlayers.length) {
      return fail(
        "Alle anwesenden Spieler müssen genau einem Team zugewiesen sein."
      );
    }

    if (Math.abs(teamA.length - teamB.length) > 1) {
      return fail("Teams dürfen höchstens 1 Spieler Unterschied haben.");
    }

    const { data: existingResult, error: existingResultError } = await supabase
      .from("results")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existingResultError) {
      return fail(existingResultError.message, 500);
    }

    async function ensureTeam(name: string) {
      const { data, error } = await supabase
        .from("teams")
        .select("id")
        .eq("session_id", sessionId)
        .eq("name", name)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (data?.id) {
        return data.id as number;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("teams")
        .insert({ session_id: sessionId, name })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      return inserted.id as number;
    }

    const teamAId = await ensureTeam("Team 1");
    const teamBId = await ensureTeam("Team 2");

    const { error: deleteTeamPlayersError } = await supabase
      .from("team_players")
      .delete()
      .in("team_id", [teamAId, teamBId]);

    if (deleteTeamPlayersError) {
      return fail(deleteTeamPlayersError.message, 500);
    }

    const teamPlayerRows = [
      ...teamA.map((player) => ({
        team_id: teamAId,
        player_id: player.id,
      })),
      ...teamB.map((player) => ({
        team_id: teamBId,
        player_id: player.id,
      })),
    ];

    if (teamPlayerRows.length > 0) {
      const { error: insertTeamPlayersError } = await supabase
        .from("team_players")
        .insert(teamPlayerRows);

      if (insertTeamPlayersError) {
        return fail(insertTeamPlayersError.message, 500);
      }
    }

    const payload = {
      session_id: sessionId,
      team_a_id: teamAId,
      team_b_id: teamBId,
      goals_team_a: cleanA === "" ? null : Number(cleanA),
      goals_team_b: cleanB === "" ? null : Number(cleanB),
      club_id: clubId,
    };

    if (existingResult?.id) {
      const { error } = await supabase
        .from("results")
        .update(payload)
        .eq("session_id", sessionId);

      if (error) {
        return fail(error.message, 500);
      }
    } else {
      const { error } = await supabase.from("results").insert(payload);

      if (error) {
        return fail(error.message, 500);
      }
    }

    return ok({
      message:
        "Ergebnis gespeichert. Aufstellungen & Anwesenheit sind ab jetzt gesperrt.",
      hasResult: true,
      goalsA: cleanA,
      goalsB: cleanB,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Ergebnis konnte nicht gespeichert werden.";

    return fail(message, 500);
  }
}