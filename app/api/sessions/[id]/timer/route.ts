import { NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/session-detail/access";
import {
  DEFAULT_GAME_TIMER_SETTINGS,
  normalizeHalftimeBehavior,
  normalizeTimerEndTime,
  type GameTimerAlarmSound,
  type GameTimerMode,
  type GameTimerSettings,
} from "@/lib/game-timer";
import { getServerI18n } from "@/lib/i18n/server";

export const runtime = "nodejs";

const TIMER_MODES = new Set(["duration", "end_time"]);
const ALARM_SOUNDS = new Set(["whistle", "horn", "buzzer"]);
const HALFTIME_BEHAVIORS = new Set(["pause", "signal"]);

type TimerPayload = {
  reset?: unknown;
  mode?: unknown;
  durationMinutes?: unknown;
  endTime?: unknown;
  halftimeEnabled?: unknown;
  halftimeBehavior?: unknown;
  alarmSound?: unknown;
};

type ClubTimerSettingsRow = {
  game_timer_enabled: boolean | null;
  game_timer_default_mode: string | null;
  game_timer_default_minutes: number | null;
  game_timer_default_end_time: string | null;
  game_timer_halftime_enabled: boolean | null;
  game_timer_halftime_behavior: string | null;
  game_timer_alarm_sound: string | null;
};

type SessionTimerSettingsRow = {
  timer_mode: string | null;
  timer_duration_minutes: number | null;
  timer_end_time: string | null;
  timer_halftime_enabled: boolean | null;
  timer_halftime_behavior: string | null;
  timer_alarm_sound: string | null;
};

function normalizeEndTime(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : "invalid";
}

function normalizeMode(value: string | null): GameTimerMode {
  return value === "end_time" ? "end_time" : "duration";
}

function normalizeAlarm(value: string | null): GameTimerAlarmSound {
  return value === "horn" || value === "buzzer" ? value : "whistle";
}

function clubDefaultSettings(row: ClubTimerSettingsRow | null): GameTimerSettings {
  return {
    mode: normalizeMode(row?.game_timer_default_mode ?? null),
    durationMinutes:
      row?.game_timer_default_minutes ?? DEFAULT_GAME_TIMER_SETTINGS.durationMinutes,
    endTime: normalizeTimerEndTime(row?.game_timer_default_end_time ?? null),
    halftimeEnabled:
      row?.game_timer_halftime_enabled ?? DEFAULT_GAME_TIMER_SETTINGS.halftimeEnabled,
    halftimeBehavior: normalizeHalftimeBehavior(
      row?.game_timer_halftime_behavior ?? DEFAULT_GAME_TIMER_SETTINGS.halftimeBehavior,
    ),
    alarmSound: normalizeAlarm(row?.game_timer_alarm_sound ?? null),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { t } = await getServerI18n();
  const { id } = await context.params;
  const sessionId = Number(id);

  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: t("sessionAction.invalidId") }, { status: 400 });
  }

  const access = await requireSessionAccess(sessionId);

  if ("error" in access) {
    return NextResponse.json(
      { error: access.error ?? t("timerApi.noAccess") },
      { status: access.status },
    );
  }

  if (access.session.type === "event") {
    return NextResponse.json({ ok: true, enabled: false });
  }

  const [clubResult, sessionResult] = await Promise.all([
    access.adminSupabase
      .from("club_settings")
      .select(
        "game_timer_enabled, game_timer_default_mode, game_timer_default_minutes, game_timer_default_end_time, game_timer_halftime_enabled, game_timer_halftime_behavior, game_timer_alarm_sound",
      )
      .eq("club_id", access.clubId)
      .maybeSingle<ClubTimerSettingsRow>(),
    access.adminSupabase
      .from("sessions")
      .select(
        "timer_mode, timer_duration_minutes, timer_end_time, timer_halftime_enabled, timer_halftime_behavior, timer_alarm_sound",
      )
      .eq("id", sessionId)
      .eq("club_id", access.clubId)
      .maybeSingle<SessionTimerSettingsRow>(),
  ]);

  if (clubResult.error) {
    return NextResponse.json(
      { error: t("timerApi.clubLoadFailed") },
      { status: 500 },
    );
  }

  if (sessionResult.error) {
    return NextResponse.json(
      { error: t("timerApi.sessionLoadFailed") },
      { status: 500 },
    );
  }

  const defaults = clubDefaultSettings(clubResult.data ?? null);
  const sessionSettings = sessionResult.data ?? null;
  const usesOverride = Boolean(
    sessionSettings &&
      (sessionSettings.timer_mode !== null ||
        sessionSettings.timer_duration_minutes !== null ||
        sessionSettings.timer_end_time !== null ||
        sessionSettings.timer_halftime_enabled !== null ||
        sessionSettings.timer_halftime_behavior !== null ||
        sessionSettings.timer_alarm_sound !== null),
  );

  const effectiveSettings: GameTimerSettings = usesOverride
    ? {
        mode: normalizeMode(sessionSettings?.timer_mode ?? defaults.mode),
        durationMinutes:
          sessionSettings?.timer_duration_minutes ?? defaults.durationMinutes,
        endTime:
          normalizeTimerEndTime(sessionSettings?.timer_end_time ?? null) ??
          defaults.endTime,
        halftimeEnabled:
          sessionSettings?.timer_halftime_enabled ?? defaults.halftimeEnabled,
        halftimeBehavior: normalizeHalftimeBehavior(
          sessionSettings?.timer_halftime_behavior ?? defaults.halftimeBehavior,
        ),
        alarmSound: normalizeAlarm(
          sessionSettings?.timer_alarm_sound ?? defaults.alarmSound,
        ),
      }
    : defaults;

  return NextResponse.json({
    ok: true,
    enabled: clubResult.data?.game_timer_enabled === true,
    clubDefaultSettings: defaults,
    settings: effectiveSettings,
    usesOverride,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { t } = await getServerI18n();
  const { id } = await context.params;
  const sessionId = Number(id);

  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: t("sessionAction.invalidId") }, { status: 400 });
  }

  const access = await requireSessionAccess(sessionId);

  if ("error" in access) {
    return NextResponse.json(
      { error: access.error ?? t("timerApi.noAccess") },
      { status: access.status },
    );
  }

  if (access.session.type === "event") {
    return NextResponse.json(
      { error: t("timerApi.trainingOnly") },
      { status: 400 },
    );
  }

  let payload: TimerPayload;

  try {
    payload = (await request.json()) as TimerPayload;
  } catch {
    return NextResponse.json({ error: t("timerApi.invalidRequest") }, { status: 400 });
  }

  if (payload.reset === true) {
    const { error } = await access.adminSupabase
      .from("sessions")
      .update({
        timer_mode: null,
        timer_duration_minutes: null,
        timer_end_time: null,
        timer_halftime_enabled: null,
        timer_halftime_behavior: null,
        timer_alarm_sound: null,
      })
      .eq("id", sessionId)
      .eq("club_id", access.clubId);

    if (error) {
      return NextResponse.json(
        { error: t("timerApi.resetFailed") },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, reset: true });
  }

  const mode = typeof payload.mode === "string" ? payload.mode : "";
  const durationMinutes = Number(payload.durationMinutes);
  const endTime = normalizeEndTime(payload.endTime);
  const halftimeEnabled = payload.halftimeEnabled === true;
  const halftimeBehavior =
    typeof payload.halftimeBehavior === "string" ? payload.halftimeBehavior : "pause";
  const alarmSound =
    typeof payload.alarmSound === "string" ? payload.alarmSound : "";

  if (!TIMER_MODES.has(mode)) {
    return NextResponse.json({ error: t("timerApi.invalidMode") }, { status: 400 });
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 300) {
    return NextResponse.json(
      { error: t("timerApi.durationInvalid") },
      { status: 400 },
    );
  }

  if (endTime === "invalid") {
    return NextResponse.json({ error: t("timerApi.invalidEndTime") }, { status: 400 });
  }

  if (mode === "end_time" && !endTime) {
    return NextResponse.json({ error: t("timerApi.endTimeRequired") }, { status: 400 });
  }

  if (!HALFTIME_BEHAVIORS.has(halftimeBehavior)) {
    return NextResponse.json({ error: t("timerApi.invalidHalftime") }, { status: 400 });
  }

  if (!ALARM_SOUNDS.has(alarmSound)) {
    return NextResponse.json({ error: t("timerApi.invalidAlarm") }, { status: 400 });
  }

  const { error } = await access.adminSupabase
    .from("sessions")
    .update({
      timer_mode: mode,
      timer_duration_minutes: durationMinutes,
      timer_end_time: endTime,
      timer_halftime_enabled: halftimeEnabled,
      timer_halftime_behavior: halftimeBehavior,
      timer_alarm_sound: alarmSound,
    })
    .eq("id", sessionId)
    .eq("club_id", access.clubId);

  if (error) {
    console.error("Saving session timer settings failed", error);
    return NextResponse.json(
      { error: t("timerApi.saveFailed") },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    settings: {
      mode,
      durationMinutes,
      endTime,
      halftimeEnabled,
      halftimeBehavior,
      alarmSound,
    },
  });
}
