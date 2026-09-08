export type GameTimerMode = "duration" | "end_time";
export type GameTimerAlarmSound = "whistle" | "horn" | "buzzer";
export type GameTimerHalftimeBehavior = "pause" | "signal";

export type GameTimerSettings = {
  mode: GameTimerMode;
  durationMinutes: number;
  endTime: string | null;
  halftimeEnabled: boolean;
  halftimeBehavior: GameTimerHalftimeBehavior;
  alarmSound: GameTimerAlarmSound;
};

export const DEFAULT_GAME_TIMER_SETTINGS: GameTimerSettings = {
  mode: "duration",
  durationMinutes: 90,
  endTime: null,
  halftimeEnabled: true,
  halftimeBehavior: "pause",
  alarmSound: "whistle",
};

export const GAME_TIMER_ALARM_OPTIONS: Array<{
  value: GameTimerAlarmSound;
  label: string;
}> = [
  { value: "whistle", label: "Schiedsrichter-Pfeife" },
  { value: "horn", label: "Hupe" },
  { value: "buzzer", label: "Buzzer" },
];

export const GAME_TIMER_HALFTIME_BEHAVIOR_OPTIONS: Array<{
  value: GameTimerHalftimeBehavior;
  label: string;
  description: string;
}> = [
  {
    value: "pause",
    label: "Echte Halbzeitpause",
    description: "Alarm läuft, die Spieluhr stoppt und die 2. Halbzeit wird manuell gestartet.",
  },
  {
    value: "signal",
    label: "Nur Halbzeit-Signal",
    description: "10 Sekunden Alarm als Hinweis. Die Spieluhr läuft ohne Unterbrechung weiter.",
  },
];

export function normalizeTimerEndTime(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)/);
  return match ? `${match[1]}:${match[2]}` : null;
}

export function normalizeHalftimeBehavior(
  value: string | null | undefined,
): GameTimerHalftimeBehavior {
  return value === "signal" ? "signal" : "pause";
}
