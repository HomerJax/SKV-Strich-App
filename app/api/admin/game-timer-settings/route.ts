import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const TIMER_MODES = new Set(["duration", "end_time"]);
const ALARM_SOUNDS = new Set(["whistle", "horn", "buzzer"]);
const HALFTIME_BEHAVIORS = new Set(["pause", "signal"]);

type TimerSettingsPayload = {
  enabled?: unknown;
  mode?: unknown;
  durationMinutes?: unknown;
  endTime?: unknown;
  halftimeEnabled?: unknown;
  halftimeBehavior?: unknown;
  alarmSound?: unknown;
};

function normalizeEndTime(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : "invalid";
}

export async function POST(request: Request) {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  if (!ctx.activeClubId) {
    return NextResponse.json({ error: "Kein aktiver Club gewählt." }, { status: 400 });
  }

  const membership =
    ctx.memberships.find((item) => item.club_id === ctx.activeClubId) ?? null;

  const hasAdminAccess = canManageClub({
    isPowerUser: ctx.isPowerUser,
    role: membership?.role ?? null,
  });

  if (!hasAdminAccess) {
    return NextResponse.json({ error: "Nur Admins dürfen die Spieluhr konfigurieren." }, { status: 403 });
  }

  let payload: TimerSettingsPayload;

  try {
    payload = (await request.json()) as TimerSettingsPayload;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const enabled = payload.enabled === true;
  const mode = typeof payload.mode === "string" ? payload.mode : "";
  const durationMinutes = Number(payload.durationMinutes);
  const endTime = normalizeEndTime(payload.endTime);
  const halftimeEnabled = payload.halftimeEnabled === true;
  const halftimeBehavior =
    typeof payload.halftimeBehavior === "string" ? payload.halftimeBehavior : "pause";
  const alarmSound =
    typeof payload.alarmSound === "string" ? payload.alarmSound : "";

  if (!TIMER_MODES.has(mode)) {
    return NextResponse.json({ error: "Ungültiger Timer-Modus." }, { status: 400 });
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 300) {
    return NextResponse.json(
      { error: "Die Standard-Spielzeit muss zwischen 1 und 300 Minuten liegen." },
      { status: 400 },
    );
  }

  if (endTime === "invalid") {
    return NextResponse.json({ error: "Ungültige Endzeit." }, { status: 400 });
  }

  if (mode === "end_time" && !endTime) {
    return NextResponse.json(
      { error: "Bitte eine Standard-Endzeit wählen." },
      { status: 400 },
    );
  }

  if (!HALFTIME_BEHAVIORS.has(halftimeBehavior)) {
    return NextResponse.json({ error: "Ungültiger Halbzeit-Modus." }, { status: 400 });
  }

  if (!ALARM_SOUNDS.has(alarmSound)) {
    return NextResponse.json({ error: "Ungültiger Alarmton." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("club_settings").upsert(
    {
      club_id: ctx.activeClubId,
      game_timer_enabled: enabled,
      game_timer_default_mode: mode,
      game_timer_default_minutes: durationMinutes,
      game_timer_default_end_time: endTime,
      game_timer_halftime_enabled: halftimeEnabled,
      game_timer_halftime_behavior: halftimeBehavior,
      game_timer_alarm_sound: alarmSound,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "club_id" },
  );

  if (error) {
    console.error("Saving game timer settings failed", error);
    return NextResponse.json(
      { error: "Spieluhr-Einstellungen konnten nicht gespeichert werden." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    settings: {
      enabled,
      mode,
      durationMinutes,
      endTime,
      halftimeEnabled,
      halftimeBehavior,
      alarmSound,
    },
  });
}
