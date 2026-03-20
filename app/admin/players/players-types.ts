export type Membership = {
  user_id: string;
  club_id: string;
  role: string;
};

export type AgeGroup = "AH" | "Ü32" | null;
export type PreferredPosition = "defense" | "attack" | "goalkeeper" | null;

export type Player = {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  age_group: AgeGroup;
  preferred_position: PreferredPosition;
  strength: number | null;
  is_active: boolean | null;
  club_id?: string;
};