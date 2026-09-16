import { NextRequest } from "next/server";
import { canManageClub } from "@/lib/auth/access";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { fail, ok } from "@/lib/session-detail/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminRsvpStatus = "out" | "open";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sessionId = Number(id);

  if (!Number.isFinite(sessionId)) {
    return fail("Ungültige Session-ID.", 400);
  }

  const access = await requireSessionAccess(sessionId);

  if ("error" in access) {
    return fail(access.error ?? "Unbekannter Fehler.", access.status);
  }

  const { adminSupabase, clubId, membership, isPowerUser } = access;
  const hasAdminAccess = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  if (!hasAdminAccess) {
    return fail("Nur Admins dürfen Rückmeldungen anderer Spieler ändern.", 403);
  }

  let payload: { playerId?: unknown; status?: unknown };

  try {
    payload = (await request.json()) as { playerId?: unknown; status?: unknown };
  } catch {
    return fail("Ungültige Anfrage.", 400);
  }

  const playerId = Number(payload.playerId);
  const status = String(payload.status ?? "") as AdminRsvpStatus;

  if (!Number.isFinite(playerId)) {
    return fail("Ungültige Spieler-ID.", 400);
  }

  if (status !== "out" && status !== "open") {
    return fail("Ungültiger Rückmeldestatus.", 400);
  }

  const [{ data: player, error: playerError }, { data: result, error: resultError }] =
    await Promise.all([
      adminSupabase
        .from("players")
        .select("id, name, first_name, last_name, nickname")
        .eq("id", playerId)
        .eq("club_id", clubId)
        .maybeSingle(),
      adminSupabase
        .from("results")
        .select("id")
        .eq("session_id", sessionId)
        .maybeSingle(),
    ]);

  if (playerError) {
    return fail(`Spieler konnte nicht geladen werden: ${playerError.message}`, 500);
  }

  if (!player) {
    return fail("Spieler gehört nicht zu diesem Team.", 404);
  }

  if (resultError) {
    return fail(`Ergebnisstatus konnte nicht geprüft werden: ${resultError.message}`, 500);
  }

  if (result) {
    return fail(
      "Rückmeldungen sind gesperrt, weil bereits ein Ergebnis gespeichert ist.",
      400,
    );
  }

  const { data: teams, error: teamsError } = await adminSupabase
    .from("teams")
    .select("id")
    .eq("session_id", sessionId)
    .eq("club_id", clubId);

  if (teamsError) {
    return fail(`Teams konnten nicht geladen werden: ${teamsError.message}`, 500);
  }

  const teamIds = (teams ?? [])
    .map((team) => Number(team.id))
    .filter((teamId) => Number.isFinite(teamId));

  if (teamIds.length > 0) {
    const { error: teamPlayerError } = await adminSupabase
      .from("team_players")
      .delete()
      .in("team_id", teamIds)
      .eq("player_id", playerId);

    if (teamPlayerError) {
      return fail(
        `Team-Zuordnung konnte nicht entfernt werden: ${teamPlayerError.message}`,
        500,
      );
    }
  }

  const { error: presenceError } = await adminSupabase
    .from("session_players")
    .delete()
    .eq("session_id", sessionId)
    .eq("player_id", playerId);

  if (presenceError) {
    return fail(`Anwesenheit konnte nicht aktualisiert werden: ${presenceError.message}`, 500);
  }

  if (status === "open") {
    const { error: clearError } = await adminSupabase
      .from("session_rsvps")
      .delete()
      .eq("session_id", sessionId)
      .eq("player_id", playerId)
      .eq("club_id", clubId);

    if (clearError) {
      return fail(`Absage konnte nicht aufgehoben werden: ${clearError.message}`, 500);
    }

    return ok({
      message: "Absage aufgehoben. Rückmeldung ist wieder offen.",
      playerId,
      status: "open",
    });
  }

  const { error: rsvpError } = await adminSupabase.from("session_rsvps").upsert(
    {
      club_id: clubId,
      session_id: sessionId,
      player_id: playerId,
      status: "out",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "session_id,player_id",
    },
  );

  if (rsvpError) {
    return fail(`Absage konnte nicht gespeichert werden: ${rsvpError.message}`, 500);
  }

  const playerName =
    player.nickname?.trim() ||
    [player.first_name?.trim(), player.last_name?.trim()].filter(Boolean).join(" ") ||
    player.name?.trim() ||
    "Spieler";

  return ok({
    message: `${playerName} wurde für diese Session abgesagt.`,
    playerId,
    status: "out",
  });
}
