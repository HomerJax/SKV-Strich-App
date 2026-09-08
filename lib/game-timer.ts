export type GameTimerMode = "duration" | "end_time";
export type GameTimerAlarmSound = "whistle" | "horn" | "buzzer";

export type GameTimerSettings = {
  mode: GameTimerMode;
  durationMinutes: number;
  endTime: string | null;
  halftimeEnabled: boolean;
  alarmSound: GameTimerAlarmSound;
};

export const DEFAULT_GAME_TIMER_SETTINGS: GameTimerSettings = {
  mode: "duration",
  durationMinutes: 90,
  endTime: null,
  halftimeEnabled: true,
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

export function normalizeTimerEndTime(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)/);
  return match ? `${match[1]}:${match[2]}` : null;
}
