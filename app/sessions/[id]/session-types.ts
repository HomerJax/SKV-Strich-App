export type SessionType = "training" | "event";

export type Player = {
  id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  age_group: "AH" | "Ü32" | null;
  preferred_position: "defense" | "attack" | "goalkeeper" | null;
  strength: number | null;
  is_active: boolean | null;
  is_guest?: boolean;
  mvp_count?: number | null;
};

export type SessionRow = {
  id: number;
  date: string;
  notes: string | null;
  type?: SessionType | null;
  winner_photo_path?: string | null;
};

export type TeamSide = "A" | "B";
export type TeamMap = Record<number, TeamSide | null>;