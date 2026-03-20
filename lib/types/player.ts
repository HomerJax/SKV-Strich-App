export type PlayerPosition =
  | "defense"
  | "attack"
  | "goalkeeper"
  | null;

export type PlayerAgeGroup = "AH" | "Ü32" | string | null;

export type PlayerCategoryKey = string | null;

export type PublicPlayer = {
  id: number;
  club_id: string;
  user_id: string | null;
  email: string | null;
  name: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  age_group: PlayerAgeGroup;
  preferred_position: PlayerPosition;
  category_key: PlayerCategoryKey;
  strength: number | null;
  is_active: boolean | null;
  is_guest: boolean | null;
  created_at?: string | null;
};

export type AdminPlayer = PublicPlayer & {
  created_at: string | null;
};