import { NextRequest, NextResponse } from "next/server";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_WHEEL_SEGMENTS, parseWheelSegments } from "@/lib/cashbox/wheel-config";
import { isCashboxPilotClub } from "@/lib/cashbox/pilot-structure";

export const dynamic = "force-dynamic";

export async function GET() {
  const { clubId, isPowerUser, membership, isSupportView } = await requireClub();
  if (isSupportView || !canManageClub({ isPowerUser, role: membership.role })) {
    return NextResponse.json({ error: "Nur Vereinsadmins dürfen das Rad konfigurieren." }, { status: 403 });
  }
  const db = createAdminClient();
  const { data, error } = await db.from("penalty_wheel_settings")
    .select("segments,updated_at").eq("club_id", clubId).maybeSingle();
  if (error) return NextResponse.json({ error: "Einstellungen konnten nicht geladen werden." }, { status: 500 });
  return NextResponse.json({ segments: parseWheelSegments(data?.segments) ?? DEFAULT_WHEEL_SEGMENTS, updatedAt: data?.updated_at ?? null });
}

export async function PUT(request: NextRequest) {
  const { clubId, user, isPowerUser, membership, isSupportView } = await requireClub();
  if (isSupportView || !canManageClub({ isPowerUser, role: membership.role })) {
    return NextResponse.json({ error: "Nur Vereinsadmins dürfen das Rad konfigurieren." }, { status: 403 });
  }
  const payload = await request.json().catch(() => null) as { segments?: unknown; scopeKey?: unknown } | null;
  const segments = parseWheelSegments(payload?.segments);
  if (!segments || ![4, 6, 8].includes(segments.length)) {
    return NextResponse.json({
      error: "Erlaubt sind genau 4, 6 oder 8 Felder mit Name, Symbol, Glück/Pech-Kategorie und 1–99 % Chance. Die Summe muss 100 % sein.",
    }, { status: 400 });
  }
  const db = createAdminClient();
  const scopeKey=typeof payload?.scopeKey==="string"?payload.scopeKey:"";
  if(scopeKey) {
    if(!isCashboxPilotClub(clubId) || !/^(penalty:[0-9]{1,18}|rule:[a-zA-Z0-9_-]{1,100})$/.test(scopeKey))
      return NextResponse.json({error:"Ungültiger Rad-Geltungsbereich."},{status:400});
    const [kind,key]=scopeKey.split(":");
    const {data:source}=kind==="penalty"
      ?await db.from("penalties").select("id").eq("club_id",clubId).eq("id",Number(key)).maybeSingle()
      :await db.from("penalty_rules").select("rule_key").eq("club_id",clubId).eq("rule_key",key).maybeSingle();
    if(!source)return NextResponse.json({error:"Strafe oder Katalogeintrag nicht gefunden."},{status:404});
    const {error:scopeError}=await db.from("pilot_wheel_scoped_configs").upsert({
      club_id:clubId,scope_key:scopeKey,segments,updated_by:user.id,updated_at:new Date().toISOString(),
    },{onConflict:"club_id,scope_key"});
    if(scopeError)return NextResponse.json({error:"Individuelles Rad konnte nicht gespeichert werden."},{status:500});
    return NextResponse.json({ok:true,segments,message:"Individuelles Rad samt Wirkung gespeichert."});
  }
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
