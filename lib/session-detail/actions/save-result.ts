import { createClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/session-detail/response";
import { persistSessionTeams } from "./persist-teams";

type SessionDetailSupabase = Awaited<ReturnType<typeof createClient>>;

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

    const { data: existingResult, error: existingResultError } = await supabase
      .from("results")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existingResultError) {
      return fail(existingResultError.message, 500);
    }

    const { teamAId, teamBId } = await persistSessionTeams({
      supabase,
      sessionId,
      clubId,
      manualTeamsRaw,
      requireComplete: true,
    });

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