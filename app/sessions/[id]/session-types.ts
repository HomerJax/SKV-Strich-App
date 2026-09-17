import type { GameTimerAlarmSound, GameTimerMode } from "@/lib/game-timer";

export type SessionType = "training" | "event";

export type Player = {
  id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  photo_path?: string | null;
  photo_url?: string | null;
  photo_position_x?: number | null;
  photo_position_y?: number | null;
  photo_zoom?: number | null;
  age_group: "AH" | "Ü32" | null;
  category_key?: string | null;
  category_label?: string | null;
  balance_group?: string | null;
  roster_role?: "player" | "staff" | null;
  preferred_position: "defense" | "attack" | "goalkeeper" | null;
  strength: number | null;
  is_active: boolean | null;
  is_guest?: boolean;
  rsvp_status?: "in" | "out" | null;
};

export type SessionRow = {
  id: number;
  date: string;
  notes: string | null;
  type?: SessionType | null;
  winner_photo_path?: string | null;
  start_time?: string | null;
  timer_mode?: GameTimerMode | null;
  timer_duration_minutes?: number | null;
  timer_end_time?: string | null;
  timer_halftime_enabled?: boolean | null;
  timer_alarm_sound?: GameTimerAlarmSound | null;
};

export type TeamSide = "A" | "B";
export type TeamMap = Record<number, TeamSide | null>;
