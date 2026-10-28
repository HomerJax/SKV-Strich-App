import { NextRequest, NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { isAdminRole } from "@/lib/auth/access";
import { hasGuidedTrainingAssistant } from "@/lib/training-wizard-pilots";
import { syncClubAchievements } from "@/lib/badges/engine";

function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// Intentionally admin-only: changing an already scored team's roster changes
// the historical win/loss statistics. This is NOT the regular team generator.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const sessionId = Number((await context.params).id);
  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) return json({ error: "Ungültiges Training." }, 400);
  const access = await requireSessionAccess(sessionId);
  if ("error" in access) return json({ error: access.error }, access.status);
  if (!(access.isPowerUser || isAdminRole(access.membership.role))) {
    return json({ error: "Nachträgliche Teamkorrekturen dürfen nur Vereinsadmins durchführen." }, 403);
  }
  if (!hasGuidedTrainingAssistant(access.clubId) || access.session.type !== "training"
    || access.session.session_mode === "tournament") {
    return json({ error: "Diese Teamkorrektur ist für das Training nicht verfügbar." }, 400);
  }
  const raw = await request.text();
  if (raw.length > 1500) return json({ error: "Ungültige Anfrage." }, 413);
  let input: Record<string, unknown>;
  try { input = JSON.parse(raw) as Record<string, unknown>; }
  catch { return json({ error: "Ungültige Anfrage." }, 400); }
  const playerId = input.playerId;
  const swapPlayerId = input.swapPlayerId;
  const expectedSide = input.expectedSide;
  if (!Number.isSafeInteger(playerId) || !Number.isSafeInteger(swapPlayerId)
    || (playerId as number) <= 0 || (swapPlayerId as number) <= 0
    || playerId === swapPlayerId || (expectedSide !== "A" && expectedSide !== "B")) {
    return json({ error: "Bitte zwei unterschiedliche Spieler aus den gegenüberliegenden Teams wählen." }, 400);
  }
  const { data: result, error: resultError } = await access.adminSupabase.from("results")
    .select("team_a_id,team_b_id,goals_team_a,goals_team_b")
    .eq("club_id", access.clubId).eq("session_id", sessionId).eq("game_no", 1).maybeSingle();
  if (resultError) return json({ error: "Ergebnis konnte nicht geprüft werden." }, 500);
  if (!result || result.team_a_id == null || result.team_b_id == null
    || result.goals_team_a == null || result.goals_team_b == null) {
    return json({ error: "Ein gültiges abgeschlossenes Ergebnis ist erforderlich." }, 409);
  }
  const fromId = expectedSide === "A" ? result.team_a_id : result.team_b_id;
  const toId = expectedSide === "A" ? result.team_b_id : result.team_a_id;
  if (fromId === toId) return json({ error: "Ungültige Teams." }, 409);

  // Existing DB function uses transaction advisory lock, validates current
  // assignments, swaps atomically and inserts an audit row.
  const { error } = await access.adminSupabase.rpc("correct_completed_session_team", {
    p_club_id: access.clubId,
    p_session_id: sessionId,
    p_player_id: playerId as number,
    p_expected_team_id: fromId,
    p_target_team_id: toId,
    p_swap_player_id: swapPlayerId as number,
    p_changed_by: access.currentUserId,
  });
  if (error) {
    return json({ error: error.message.includes("inzwischen") ? "Aufstellung wurde inzwischen geändert. Bitte neu laden." : "Korrektur konnte nicht gespeichert werden." }, 409);
  }
  try { await syncClubAchievements(access.clubId); }
  catch (error) { console.error("Badge sync after audited team correction failed", error); }
  return json({ ok: true, message: "Spielertausch gespeichert und protokolliert. Statistiken verwenden die korrigierte Aufstellung." });
}
