import { NextRequest } from "next/server";
import { canManageClub } from "@/lib/auth/access";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { fail, ok } from "@/lib/session-detail/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) return fail("Ungültige Session-ID.", 400);

  const access = await requireSessionAccess(sessionId);
  if ("error" in access) return fail(access.error ?? "Unbekannter Fehler.", access.status);

  const { adminSupabase, clubId, session, currentUserEmail } = access;
  if (session.type !== "event") return ok({ isEvent: false, players: [], currentPlayerNominated: true });

  const selfPlayerPromise = currentUserEmail
    ? adminSupabase.from("players").select("id").eq("club_id", clubId).eq("email", currentUserEmail).maybeSingle()
    : Promise.resolve({ data: null as { id: number } | null, error: null });

  const [
    { data: players, error: playersError },
    { data: exclusions, error: exclusionsError },
    { data: selfPlayer, error: selfPlayerError },
  ] = await Promise.all([
    adminSupabase
      .from("players")
      .select("id, first_name, last_name, nickname")
      .eq("club_id", clubId)
      .eq("is_active", true)
      .or("is_guest.is.null,is_guest.eq.false")
      .order("first_name"),
    adminSupabase
      .from("session_event_exclusions")
      .select("player_id")
      .eq("club_id", clubId)
      .eq("session_id", sessionId),
    selfPlayerPromise,
  ]);

  if (playersError || exclusionsError || selfPlayerError) {
    return fail(`Event-Kader konnte nicht geladen werden: ${playersError?.message ?? exclusionsError?.message ?? selfPlayerError?.message}`, 500);
  }

  const excluded = new Set((exclusions ?? []).map((row) => Number(row.player_id)));
  const selfPlayerId = selfPlayer?.id ? Number(selfPlayer.id) : null;

  return ok({
    isEvent: true,
    currentPlayerNominated: selfPlayerId ? !excluded.has(selfPlayerId) : true,
    players: (players ?? []).map((player) => ({ ...player, nominated: !excluded.has(Number(player.id)) })),
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) return fail("Ungültige Session-ID.", 400);

  const access = await requireSessionAccess(sessionId);
  if ("error" in access) return fail(access.error ?? "Unbekannter Fehler.", access.status);

  const { adminSupabase, clubId, membership, session, isPowerUser } = access;
  const isAdmin = canManageClub({ isPowerUser, role: membership.role });
  if (!isAdmin) return fail("Nur Admins dürfen den Event-Kader festlegen.", 403);
  if (session.type !== "event") return fail("Ein Event-Kader kann nur bei Terminen gepflegt werden.", 400);

  const body = (await request.json().catch(() => null)) as { playerId?: number; nominated?: boolean } | null;
  const playerId = Number(body?.playerId);
  const nominated = body?.nominated === true;
  if (!Number.isFinite(playerId)) return fail("Ungültige Spieler-ID.", 400);

  const { data: player, error: playerError } = await adminSupabase
    .from("players")
    .select("id, club_id, is_active, is_guest")
    .eq("id", playerId)
    .eq("club_id", clubId)
    .maybeSingle();
  if (playerError) return fail(`Spieler konnte nicht geladen werden: ${playerError.message}`, 500);
  if (!player || player.is_active === false || player.is_guest === true) return fail("Spieler ist für den Event-Kader nicht verfügbar.", 400);

  if (nominated) {
    const { error } = await adminSupabase.from("session_event_exclusions").delete().eq("session_id", sessionId).eq("player_id", playerId).eq("club_id", clubId);
    if (error) return fail(`Event-Kader konnte nicht aktualisiert werden: ${error.message}`, 500);
    return ok({ message: "Spieler ist wieder im Event-Kader.", playerId, nominated: true });
  }

  const { error: exclusionError } = await adminSupabase.from("session_event_exclusions").upsert({ club_id: clubId, session_id: sessionId, player_id: playerId }, { onConflict: "session_id,player_id" });
  if (exclusionError) return fail(`Event-Kader konnte nicht aktualisiert werden: ${exclusionError.message}`, 500);

  const [{ error: presenceError }, { error: rsvpError }] = await Promise.all([
    adminSupabase.from("session_players").delete().eq("session_id", sessionId).eq("player_id", playerId),
    adminSupabase.from("session_rsvps").delete().eq("session_id", sessionId).eq("player_id", playerId),
  ]);
  if (presenceError || rsvpError) return fail(`Spieler wurde aus dem Event-Kader entfernt, aber die Rückmeldung konnte nicht vollständig bereinigt werden: ${presenceError?.message ?? rsvpError?.message}`, 500);

  return ok({ message: "Spieler ist nicht im Event-Kader.", playerId, nominated: false });
}
