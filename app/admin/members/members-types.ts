export type MemberRole = "owner" | "admin" | "member";

export type MemberRow = {
  user_id: string;
  email: string;
  full_name: string;
  role: MemberRole;
};

export type InviteRow = {
  id: string;
  token: string;
  role: "admin" | "member";
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
};