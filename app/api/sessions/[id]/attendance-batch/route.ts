import { NextRequest, NextResponse } from "next/server";
import { canManageClub } from "@/lib/auth/access";
import { requireSessionAccess } from "@/lib/session-detail/access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Isolated to the 1. FC Strikr 2026 training wizard. Other clubs keep their
// established attendance endpoint and behavior.
const PILOT_CLUB_ID = "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const sessionId = Number((await context.params).id);
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) return fail("Ungültiger Termin.");

  const access = await requireSessionAccess(sessionId);
  if ("error" in access) return fail(access.error ?? "Kein Zugriff.", access.status);
  if (access.clubId !== PILOT_CLUB_ID || access.session.type === "event") return fail("Nicht verfügbar.", 403);
  if (!canManageClub({ isPowerUser: access.isPowerUser, role: access.membership?.role }) && !access.canLeadTraining) {
    return fail("Keine Berechtigung zur Trainingsleitung.", 403);
  }

  const payload = await request.json().catch(() => null) as { presentIds?: unknown } | null;
  if (!payload || !Array.isArray(payload.presentIds) ||
      payload.presentIds.length > 250 ||
      payload.presentIds.some(id => !Number.isSafeInteger(id) || id < 1) ||
      new Set(payload.presentIds).size !== payload.presentIds.length) {
    return fail("Ungültige Teilnehmerliste.");
  }
  const desired = payload.presentIds as number[];
  const db = access.adminSupabase;

  const [resultResponse, presenceResponse, playersResponse] = await Promise.all([
    db.from("results").select("id").eq("session_id", sessionId).limit(1).maybeSingle(),
    db.from("session_players").select("player_id").eq("session_id", sessionId),
    desired.length
      ? db.from("players").select("id").eq("club_id", access.clubId).in("id", desired)
      : Promise.resolve({ data: [] as { id: number }[], error: null }),
  ]);
  if (resultResponse.error || presenceResponse.error || playersResponse.error) {
    return fail("Anwesenheit konnte nicht geprüft werden.", 500);
  }
  if (resultResponse.data?.id) {
    return fail("Anwesenheit ist gesperrt, weil bereits ein Ergebnis gespeichert ist.", 409);
  }
  if ((playersResponse.data ?? []).length !== desired.length) {
    return fail("Ein ausgewählter Spieler gehört nicht zum Verein.", 400);
  }

  const actual = new Set((presenceResponse.data ?? []).map(row => row.player_id));
  const requested = new Set(desired);
  const toRemove = [...actual].filter(id => !requested.has(id));
  const toAdd = desired.filter(id => !actual.has(id));

  // Save physical attendance only. RSVP commitments, timestamps and first-in
  // history MUST NOT be overwritten: the closing check needs them to detect
  // late cancellations and no-shows correctly.
  if (toRemove.length > 0) {
    const { error } = await db.from("session_players").delete()
      .eq("session_id", sessionId).in("player_id", toRemove);
    if (error) {
      return fail("Abwesende Spieler konnten nicht gespeichert werden. Bitte erneut versuchen.", 500);
    }
  }

  if (toAdd.length > 0) {
    const { error } = await db.from("session_players").upsert(
      toAdd.map(playerId => ({ session_id: sessionId, player_id: playerId })),
      { onConflict: "session_id,player_id" },
    );
    if (error) {
      return fail("Anwesende Spieler konnten nicht gespeichert werden. Bitte erneut versuchen.", 500);
    }
  }

  return NextResponse.json({ ok: true, presentIds: desired, changed: toRemove.length + toAdd.length });
}
