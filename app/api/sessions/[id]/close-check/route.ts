import { NextRequest, NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { canManageClub } from "@/lib/auth/access";

export const dynamic = "force-dynamic";
const PILOT_CLUB_ID = "12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60";
const ALLOWED_KEYS = ["late", "missed_penalty", "walk_in"] as const;

async function getAuthorizedSession(context: { params: Promise<{ id: string }> }) {
  const sessionId = Number((await context.params).id);
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) return { error: "Ungültiges Training.", status: 400 as const };
  const access = await requireSessionAccess(sessionId);
  if ("error" in access) return access;
  if (access.clubId !== PILOT_CLUB_ID || access.session.type !== "training") {
    return { error: "Diese Funktion ist nur im Trainings-Pilot verfügbar.", status: 403 as const };
  }
  if (!canManageClub({ isPowerUser: access.isPowerUser, role: access.membership?.role }) && !access.canLeadTraining) {
    return { error: "Nur Admin oder Trainingsleitung.", status: 403 as const };
  }
  return access;
}

type Payload = { playerId?: number; ruleKey?: string; note?: string; requestId?: string };

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await getAuthorizedSession(context);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const db = access.adminSupabase;
  const [{ data: settings, error: settingsError }, { data: rules, error: rulesError }, { data: penalties, error: penaltiesError }] = await Promise.all([
    db.from("club_settings").select("cashbox_penalties_enabled,cashbox_setup_completed").eq("club_id", access.clubId).maybeSingle(),
    db.from("penalty_rules").select("rule_key,label,reason,type,value").eq("club_id", access.clubId).eq("enabled", true).in("rule_key", [...ALLOWED_KEYS]),
    db.from("penalties").select("id,player_id,reason,value,type,created_at,source_key").eq("club_id", access.clubId).eq("session_id", access.session.id).like("source_key", "session-close:%").order("created_at", { ascending: false }).limit(30),
  ]);
  if (settingsError || rulesError || penaltiesError) return NextResponse.json({ error: "Abschlussdaten konnten nicht geladen werden." }, { status: 500 });
  const enabled = settings?.cashbox_penalties_enabled === true && settings?.cashbox_setup_completed === true;
  return NextResponse.json({ enabled, rules: enabled ? rules ?? [] : [], incidents: penalties ?? [] });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const access = await getAuthorizedSession(context);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null) as Payload | null;
  const playerId = Number(body?.playerId);
  const ruleKey = body?.ruleKey;
  const requestId = body?.requestId;
  if (!Number.isSafeInteger(playerId) || playerId < 1 || !ALLOWED_KEYS.some(key => key === ruleKey) ||
      typeof requestId !== "string" || !/^[a-zA-Z0-9-]{12,70}$/.test(requestId)) {
    return NextResponse.json({ error: "Bitte Spieler und Vorfall auswählen." }, { status: 400 });
  }
  const db = access.adminSupabase;
  const { data: settings } = await db.from("club_settings").select("cashbox_setup_completed,cashbox_penalties_enabled").eq("club_id", access.clubId).maybeSingle();
  if (!settings || settings.cashbox_setup_completed !== true || settings.cashbox_penalties_enabled !== true) {
    return NextResponse.json({ error: "Die Mannschaftskasse ist nicht aktiviert." }, { status: 409 });
  }

  const [{ data: player }, { data: attendee }, { data: rule }] = await Promise.all([
    db.from("players").select("id").eq("id", playerId).eq("club_id", access.clubId).eq("is_active", true).maybeSingle(),
    db.from("session_players").select("player_id").eq("session_id", access.session.id).eq("player_id", playerId).maybeSingle(),
    db.from("penalty_rules").select("reason,type,value,escalation_after_days,escalation_value").eq("club_id", access.clubId).eq("rule_key", ruleKey).eq("enabled", true).maybeSingle(),
  ]);
  if (!player || !attendee) return NextResponse.json({ error: "Spieler ist nicht als anwesend erfasst." }, { status: 409 });
  if (!rule || !rule.reason || !rule.value || !["beer", "money", "custom"].includes(rule.type)) {
    return NextResponse.json({ error: "Diese Strafregel ist nicht aktiv." }, { status: 409 });
  }

  const sourceKey = `session-close:${access.session.id}:${playerId}:${ruleKey}:${requestId}`;
  const { data: existing } = await db.from("penalties").select("id").eq("club_id", access.clubId).eq("source_key", sourceKey).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, penaltyId: existing.id, duplicate: true });
  const days = typeof rule.escalation_after_days === "number" && rule.escalation_after_days > 0 ? rule.escalation_after_days : null;
  const dueDate = days ? new Date(Date.now() + days * 86400000).toISOString().slice(0, 10) : null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) : "";
  const { data: inserted, error } = await db.from("penalties").insert({
    club_id: access.clubId,
    session_id: access.session.id,
    player_id: playerId,
    source_key: sourceKey,
    reason: rule.reason,
    type: rule.type,
    value: rule.value,
    notes: note ? `Trainingsabschluss: ${note}` : "Beim Trainingsabschluss bestätigt",
    escalation_after_days: days,
    escalation_value: rule.escalation_value,
    due_date: dueDate,
  }).select("id").single();
  if (error) {
    const { data: concurrent } = await db.from("penalties").select("id").eq("club_id", access.clubId).eq("source_key", sourceKey).maybeSingle();
    if (concurrent) return NextResponse.json({ ok: true, penaltyId: concurrent.id, duplicate: true });
    return NextResponse.json({ error: "Vorfall konnte nicht gespeichert werden." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, penaltyId: inserted.id });
}
