import { NextRequest, NextResponse } from "next/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_WHEEL_SEGMENTS, parseWheelSegments } from "@/lib/cashbox/wheel-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const { clubId, isPowerUser, membership } = await requireClub();
  if (!canManageClub({ isPowerUser, role: membership.role })) {
    return NextResponse.json({ error: "Nur Vereinsadmins dürfen das Rad konfigurieren." }, { status: 403 });
  }
  const db = createAdminClient();
  const { data, error } = await db.from("penalty_wheel_settings")
    .select("segments,updated_at").eq("club_id", clubId).maybeSingle();
  if (error) return NextResponse.json({ error: "Einstellungen konnten nicht geladen werden." }, { status: 500 });
  return NextResponse.json({ segments: parseWheelSegments(data?.segments) ?? DEFAULT_WHEEL_SEGMENTS, updatedAt: data?.updated_at ?? null });
}

export async function PUT(request: NextRequest) {
  const { clubId, user, isPowerUser, membership } = await requireClub();
  if (!canManageClub({ isPowerUser, role: membership.role })) {
    return NextResponse.json({ error: "Nur Vereinsadmins dürfen das Rad konfigurieren." }, { status: 403 });
  }
  const payload = await request.json().catch(() => null) as { segments?: unknown } | null;
  const segments = parseWheelSegments(payload?.segments);
  if (!segments) {
    return NextResponse.json({
      error: "Erlaubt sind 2 bis 10 Felder mit eindeutiger ID, Symbol, Namen und 1–99 % Chance. Die Summe muss 100 % sein.",
    }, { status: 400 });
  }
  const db = createAdminClient();
  const { error } = await db.from("penalty_wheel_settings").upsert({
    club_id: clubId,
    segments,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "club_id" });
  if (error) {
    console.error("Wheel settings persistence failed", error.code);
    return NextResponse.json({ error: "Rad-Einstellungen konnten nicht gespeichert werden." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, segments, message: "Das neue Schicksalsrad ist für deinen Verein gespeichert." });
}
