import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { requireClub } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_WHEEL_SEGMENTS, parseWheelSegments, pickWheelSegment, type WheelSegment } from "@/lib/cashbox/wheel-config";
import type { PublicWheelSegment } from "@/lib/cashbox/wheel-public";

// Do not transmit server-side weights to ordinary players, even through the API.
// The spin is weighted on the server, while the visual wheel is neutral.
function playerWheelSegments(segments: WheelSegment[]): PublicWheelSegment[] {
  return segments.map(({ id, icon, label, description, category }) => ({
    id, icon, label, description, category,
  }));
}

export const dynamic = "force-dynamic";

// Only these two explicitly marked demonstration penalties can be reset.
// A normal penalty can NEVER be re-spun by this endpoint.
const resettableTestKeys: Record<number, string> = {
  9: "test:wheel:marcus:20261023",
  10: "test:wheel:rollo:20261023",
};
function mayResetTestWheel(clubId: string, penalty: {
  id: number; source_key: string | null;
}): boolean {
  return clubId === "108590d9-0877-4787-90a5-4679615b3b76" &&
    resettableTestKeys[penalty.id] === penalty.source_key;
}


async function activeSegments(db: ReturnType<typeof createAdminClient>, clubId: string): Promise<WheelSegment[]> {
  const { data, error } = await db.from("penalty_wheel_settings")
    .select("segments").eq("club_id", clubId).maybeSingle();
  if (error) throw new Error(error.message);
  return parseWheelSegments(data?.segments) ?? DEFAULT_WHEEL_SEGMENTS;
}

type SpinRow = {
  outcome: string;
  outcome_label: string | null;
  outcome_detail: string | null;
  outcome_icon: string | null;
  segments_snapshot: unknown;
};

function spinPayload(spin: SpinRow, fallback: WheelSegment[], canResetForTest = false) {
  const segments = parseWheelSegments(spin.segments_snapshot) ?? fallback;
  const selected = segments.find((segment) => segment.id === spin.outcome);
  return {
    outcome: spin.outcome,
    label: spin.outcome_label || selected?.label || "Dein Rad-Ergebnis",
    detail: spin.outcome_detail ?? selected?.description ?? "",
    icon: spin.outcome_icon || selected?.icon || "🎡",
    segments: playerWheelSegments(segments),
    alreadySpun: true,
    canResetForTest,
  };
}

export async function GET(request: NextRequest) {
  const { clubId, player } = await requireClub();
  const penaltyId = Number(request.nextUrl.searchParams.get("penaltyId"));
  if (!player?.id || !Number.isSafeInteger(penaltyId) || penaltyId < 1) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  const db = createAdminClient();
  const { data: penalty, error: penaltyError } = await db.from("penalties")
    .select("id,source_key").eq("club_id", clubId).eq("player_id", player.id).eq("id", penaltyId).maybeSingle();
  if (penaltyError) return NextResponse.json({ error: "Strafe konnte nicht geladen werden." }, { status: 500 });
  if (!penalty) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  const canResetForTest = mayResetTestWheel(clubId, penalty);

  const [{ data: spin, error: spinError }, segments] = await Promise.all([
    db.from("penalty_wheel_spins")
      .select("outcome,outcome_label,outcome_detail,outcome_icon,segments_snapshot")
      .eq("club_id", clubId).eq("penalty_id", penaltyId).maybeSingle(),
    activeSegments(db, clubId),
  ]);
  if (spinError) return NextResponse.json({ error: "Drehung konnte nicht geladen werden." }, { status: 500 });
  return NextResponse.json(spin
    ? spinPayload(spin as SpinRow, segments, canResetForTest)
    : { outcome: null, label: null, detail: null, segments: playerWheelSegments(segments), canResetForTest });
}

export async function POST(request: NextRequest) {
  const { clubId, user, player } = await requireClub();
  const body = await request.json().catch(() => null) as { penaltyId?: number } | null;
  const penaltyId = Number(body?.penaltyId);
  if (!player?.id || !Number.isSafeInteger(penaltyId) || penaltyId < 1) {
    return NextResponse.json({ error: "Kein gültiger Spieler oder Strafe." }, { status: 400 });
  }
  const db = createAdminClient();
  const { data: penalty, error: penaltyError } = await db.from("penalties")
    .select("id,player_id,resolved_at,source_key")
    .eq("club_id", clubId).eq("id", penaltyId).eq("player_id", player.id).maybeSingle();
  if (penaltyError) return NextResponse.json({ error: "Strafe konnte nicht geladen werden." }, { status: 500 });
  if (!penalty) return NextResponse.json({ error: "Strafe nicht gefunden." }, { status: 404 });
  const canResetForTest = mayResetTestWheel(clubId, penalty);

  const { data: existing } = await db.from("penalty_wheel_spins")
    .select("outcome,outcome_label,outcome_detail,outcome_icon,segments_snapshot")
    .eq("club_id", clubId).eq("penalty_id", penaltyId).maybeSingle();
  const segments = await activeSegments(db, clubId);
  if (existing) return NextResponse.json(spinPayload(existing as SpinRow, segments, canResetForTest));
  if (penalty.resolved_at) {
    return NextResponse.json({ error: "Nur offene Strafen haben einen Dreh." }, { status: 409 });
  }

  // Cryptographically secure weighted draw. One immutable result per penalty.
  const choice = pickWheelSegment(segments, randomInt(100));
  const { error: saveError } = await db.from("penalty_wheel_spins").insert({
    club_id: clubId,
    penalty_id: penaltyId,
    player_id: player.id,
    spun_by: user.id,
    outcome: choice.id,
    outcome_label: choice.label,
    outcome_detail: choice.description,
    outcome_icon: choice.icon,
    segments_snapshot: segments,
  });
  if (saveError) {
    const { data: saved } = await db.from("penalty_wheel_spins")
      .select("outcome,outcome_label,outcome_detail,outcome_icon,segments_snapshot")
      .eq("club_id", clubId).eq("penalty_id", penaltyId).maybeSingle();
    if (saved) return NextResponse.json(spinPayload(saved as SpinRow, segments, canResetForTest));
    console.error("Penalty wheel spin saving failed", saveError.code);
    return NextResponse.json({ error: "Das Ergebnis konnte nicht gespeichert werden." }, { status: 500 });
  }
  // Explicitly do not change penalties, payments, beer, or cash transactions.
  return NextResponse.json({
    outcome: choice.id,
    label: choice.label,
    detail: choice.description,
    icon: choice.icon,
    segments: playerWheelSegments(segments),
    alreadySpun: false,
    canResetForTest,
  });
}

// DELETE is intentionally limited to Marcus's and Rollo's two test penalties.
// The club and current player's ownership are validated *before* using the
// service-role client to remove any stored wheel result.
export async function DELETE(request: NextRequest) {
  const { clubId, player } = await requireClub();
  const body = await request.json().catch(() => null) as { penaltyId?: number } | null;
  const penaltyId = Number(body?.penaltyId);
  if (!player?.id || !Number.isSafeInteger(penaltyId) || penaltyId < 1) {
    return NextResponse.json({ error: "Ungültige Teststrafe." }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: penalty, error: penaltyError } = await db.from("penalties")
    .select("id,source_key,resolved_at")
    .eq("club_id", clubId)
    .eq("player_id", player.id)
    .eq("id", penaltyId)
    .maybeSingle();
  if (penaltyError) {
    return NextResponse.json({ error: "Teststrafe konnte nicht geprüft werden." }, { status: 500 });
  }
  if (!penalty || !mayResetTestWheel(clubId, penalty)) {
    return NextResponse.json({ error: "Nur deine ausdrücklich freigegebene Teststrafe kann zurückgesetzt werden." }, { status: 403 });
  }
  if (penalty.resolved_at) {
    return NextResponse.json({ error: "Eine erledigte Strafe kann nicht erneut gedreht werden." }, { status: 409 });
  }

  const { error } = await db.from("penalty_wheel_spins")
    .delete()
    .eq("club_id", clubId)
    .eq("penalty_id", penaltyId)
    .eq("player_id", player.id);
  if (error) {
    console.error("Wheel test reset failed", { penaltyId, code: error.code });
    return NextResponse.json({ error: "Testdreh konnte nicht zurückgesetzt werden." }, { status: 500 });
  }
  const segments = await activeSegments(db, clubId);
  return NextResponse.json({
    outcome: null,
    label: null,
    detail: null,
    icon: null,
    segments: playerWheelSegments(segments),
    canResetForTest: true,
    message: "Nur der Testdreh wurde zurückgesetzt. Du kannst erneut drehen.",
  });
}

