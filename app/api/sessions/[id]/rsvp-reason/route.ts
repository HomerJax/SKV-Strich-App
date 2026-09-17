import { NextRequest } from "next/server";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { fail, ok } from "@/lib/session-detail/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) return fail("Ungültige Session-ID.", 400);

  const access = await requireSessionAccess(sessionId);
  if ("error" in access) return fail(access.error ?? "Unbekannter Fehler.", access.status);

  const { adminSupabase, clubId, currentUserEmail } = access;
  if (!currentUserEmail) return fail("Benutzer konnte nicht aufgelöst werden.", 401);

  const body = (await request.json().catch(() => null)) as { reason?: string } | null;
  const reason = String(body?.reason ?? "").trim().slice(0, 80) || null;

  const { data: player, error: playerError } = await adminSupabase
    .from("players")
    .select("id")
    .eq("club_id", clubId)
    .eq("email", currentUserEmail)
    .maybeSingle();
  if (playerError || !player) return fail("Spielerprofil konnte nicht gefunden werden.", 404);

  const { data: rsvp, error: rsvpLoadError } = await adminSupabase
    .from("session_rsvps")
    .select("status")
    .eq("session_id", sessionId)
    .eq("player_id", player.id)
    .maybeSingle();
  if (rsvpLoadError) return fail(`Rückmeldung konnte nicht geladen werden: ${rsvpLoadError.message}`, 500);
  if (rsvp?.status !== "out") return fail("Ein Absagegrund kann nur zu einer Absage gespeichert werden.", 400);

  const { error } = await adminSupabase
    .from("session_rsvps")
    .update({ reason, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("player_id", player.id)
    .eq("club_id", clubId);
  if (error) return fail(`Absagegrund konnte nicht gespeichert werden: ${error.message}`, 500);

  return ok({ reason });
}
