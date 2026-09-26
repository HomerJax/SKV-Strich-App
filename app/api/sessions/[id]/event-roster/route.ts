import { NextRequest } from "next/server";
import { canManageClub } from "@/lib/auth/access";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { fail, ok } from "@/lib/session-detail/response";
import { getServerI18n } from "@/lib/i18n/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { t } = await getServerI18n();
  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) return fail(t("sessionAction.invalidId"), 400);

  const access = await requireSessionAccess(sessionId);
  if ("error" in access) return fail(access.error ?? t("sessionCommon.unknownError"), access.status);

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
    return fail(t("eventRoster.loadFailed", { error: playersError?.message ?? exclusionsError?.message ?? selfPlayerError?.message ?? "" }), 500);
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
  const { t } = await getServerI18n();
  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) return fail(t("sessionAction.invalidId"), 400);

  const access = await requireSessionAccess(sessionId);
  if ("error" in access) return fail(access.error ?? t("sessionCommon.unknownError"), access.status);

  const { adminSupabase, clubId, membership, session, isPowerUser } = access;
  const isAdmin = canManageClub({ isPowerUser, role: membership.role });
  if (!isAdmin) return fail(t("eventRoster.adminOnly"), 403);
  if (session.type !== "event") return fail(t("eventRoster.eventOnly"), 400);

  const body = (await request.json().catch(() => null)) as { playerId?: number; nominated?: boolean } | null;
  const playerId = Number(body?.playerId);
  const nominated = body?.nominated === true;
  if (!Number.isFinite(playerId)) return fail(t("eventRoster.invalidPlayerId"), 400);

  const { data: player, error: playerError } = await adminSupabase
    .from("players")
    .select("id, club_id, is_active, is_guest")
    .eq("id", playerId)
    .eq("club_id", clubId)
    .maybeSingle();
  if (playerError) return fail(t("eventRoster.playerLoadFailed", { error: playerError.message }), 500);
  if (!player || player.is_active === false || player.is_guest === true) return fail(t("eventRoster.playerUnavailable"), 400);

  if (nominated) {
    const { error } = await adminSupabase.from("session_event_exclusions").delete().eq("session_id", sessionId).eq("player_id", playerId).eq("club_id", clubId);
    if (error) return fail(t("eventRoster.updateFailed", { error: error.message }), 500);
    return ok({ message: t("eventRoster.restored"), playerId, nominated: true });
  }

  const { error: exclusionError } = await adminSupabase.from("session_event_exclusions").upsert({ club_id: clubId, session_id: sessionId, player_id: playerId }, { onConflict: "session_id,player_id" });
  if (exclusionError) return fail(t("eventRoster.updateFailed", { error: exclusionError.message }), 500);

  const [{ error: presenceError }, { error: rsvpError }] = await Promise.all([
    adminSupabase.from("session_players").delete().eq("session_id", sessionId).eq("player_id", playerId),
    adminSupabase.from("session_rsvps").delete().eq("session_id", sessionId).eq("player_id", playerId),
  ]);
  if (presenceError || rsvpError) return fail(t("eventRoster.cleanupFailed", { error: presenceError?.message ?? rsvpError?.message ?? "" }), 500);

  return ok({ message: t("eventRoster.removed"), playerId, nominated: false });
}
