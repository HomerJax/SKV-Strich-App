import { NextRequest, NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { canManageClub } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

// Deliberately separate from save_teams: never delete/recreate team assignments,
// games, results, RSVP rows, winner photos or player statistics.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const sessionId = Number((await context.params).id);
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
    return NextResponse.json({ error: "Ungültige Session." }, { status: 400 });
  }
  const access = await requireSessionAccess(sessionId);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!canManageClub({ isPowerUser: access.isPowerUser, role: access.membership.role }) && !access.canLeadTraining) {
    return NextResponse.json({ error: "Nur Admins oder Trainingsleiter dürfen abgeschlossene Teams korrigieren." }, { status: 403 });
  }
  if (access.session.session_mode === "tournament") {
    return NextResponse.json({ error: "Turnierzuordnungen bitte über die Turnierverwaltung korrigieren." }, { status: 409 });
  }

  const body = await request.json().catch(() => null) as {
    playerId?: number; expectedTeamId?: number; targetTeamId?: number; swapPlayerId?: number | null
  } | null;
  const playerId = Number(body?.playerId);
  const expectedTeamId = Number(body?.expectedTeamId);
  const targetTeamId = Number(body?.targetTeamId);
  const swapPlayerId = body?.swapPlayerId == null ? null : Number(body.swapPlayerId);
  if (![playerId, expectedTeamId, targetTeamId].every((value) => Number.isSafeInteger(value) && value > 0) ||
      (swapPlayerId !== null && (!Number.isSafeInteger(swapPlayerId) || swapPlayerId < 1)) ||
      expectedTeamId === targetTeamId) {
    return NextResponse.json({ error: "Bitte gültige Teams und Spieler auswählen." }, { status: 400 });
  }
  const { data, error } = await access.adminSupabase.rpc("correct_completed_session_team", {
    p_club_id: access.clubId,
    p_session_id: sessionId,
    p_player_id: playerId,
    p_expected_team_id: expectedTeamId,
    p_target_team_id: targetTeamId,
    p_swap_player_id: swapPlayerId,
    p_changed_by: access.currentUserId,
  });
  if (error) {
    console.error("Post-result team correction denied", { sessionId, code: error.code, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  return NextResponse.json({ ok: true, correction: data, message: "Teamkorrektur gespeichert. Ergebnis und Siegerfoto bleiben erhalten." });
}
