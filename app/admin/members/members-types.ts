export type MemberRole = "admin" | "member";

export type MemberRow = {
  user_id: string;
  role: MemberRole | string | null;
  email: string;
  full_name: string;
};

export type InviteRow = {
  id: string;
  token: string;
  role: "admin" | "member" | null;
  created_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
};