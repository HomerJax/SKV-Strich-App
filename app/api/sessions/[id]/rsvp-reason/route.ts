import { NextRequest } from "next/server";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { fail, ok } from "@/lib/session-detail/response";
import { getServerI18n } from "@/lib/i18n/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const { adminSupabase, clubId, currentUserEmail } = access;
  if (!currentUserEmail) return fail(t("rsvpReason.userResolveFailed"), 401);

  const body = (await request.json().catch(() => null)) as { reason?: string } | null;
  const reason = String(body?.reason ?? "").trim().slice(0, 80) || null;

  const { data: player, error: playerError } = await adminSupabase
    .from("players")
    .select("id")
    .eq("club_id", clubId)
    .eq("email", currentUserEmail)
    .maybeSingle();
  if (playerError || !player) return fail(t("rsvpReason.playerProfileMissing"), 404);

  const { data: rsvp, error: rsvpLoadError } = await adminSupabase
    .from("session_rsvps")
    .select("status")
    .eq("session_id", sessionId)
    .eq("player_id", player.id)
    .maybeSingle();
  if (rsvpLoadError) return fail(t("rsvpReason.loadFailed", { error: rsvpLoadError.message }), 500);
  if (rsvp?.status !== "out") return fail(t("rsvpReason.outOnly"), 400);

  const { error } = await adminSupabase
    .from("session_rsvps")
    .update({ reason, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("player_id", player.id)
    .eq("club_id", clubId);
  if (error) return fail(t("rsvpReason.saveFailed", { error: error.message }), 500);

  return ok({ reason });
}
