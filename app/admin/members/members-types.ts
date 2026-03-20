export type MemberRow = {
  user_id: string;
  email: string;
  full_name: string;
  role: "admin" | "member";
};

export type InviteRow = {
  id: string;
  token: string;
  role: "admin" | "member";
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
};

export type PlayerRow = {
  id: number;
  user_id: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  is_active: boolean | null;
};

export type MemberWithPlayer = MemberRow & {
  linkedPlayerId: number | null;
  linkedPlayerName: string | null;
};