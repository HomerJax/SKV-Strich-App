import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AuthPlayer = {
  id: number;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
};

export type AuthMembership = {
  id: number;
  club_id: string;
  user_id: string;
  role: string | null;
};

export type AuthContext = {
  user: User | null;
  player: AuthPlayer | null;
  memberships: AuthMembership[];
  activeClubId: string | null;
  isPowerUser: boolean;
};

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      player: null,
      memberships: [],
      activeClubId: null,
      isPowerUser: false,
    };
  }

  const [{ data: player, error: playerError }, { data: memberships, error: membershipsError }, { data: roleRow, error: roleError }] =
    await Promise.all([
      supabase
        .from("players")
        .select("id, user_id, first_name, last_name, nickname")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("club_memberships")
        .select("id, club_id, user_id, role")
        .eq("user_id", user.id),
      supabase
        .from("user_roles")
        .select("is_power_user")
        .eq("user_id", user.id)
        .maybeSingle<{ is_power_user: boolean }>(),
    ]);

  if (playerError) {
    throw new Error(`Failed to load player: ${playerError.message}`);
  }

  if (membershipsError) {
    throw new Error(`Failed to load memberships: ${membershipsError.message}`);
  }

  if (roleError) {
    throw new Error(`Failed to load user role: ${roleError.message}`);
  }

  const normalizedMemberships = (memberships ?? []) as AuthMembership[];
  const cookieClubId = cookieStore.get("active_club_id")?.value ?? null;
  const isPowerUser = roleRow?.is_power_user === true;

  const hasCookieMembership = cookieClubId
    ? normalizedMemberships.some((membership) => membership.club_id === cookieClubId)
    : false;

  const activeClubId = isPowerUser
    ? cookieClubId
    : hasCookieMembership
      ? cookieClubId
      : normalizedMemberships.length === 1
        ? normalizedMemberships[0].club_id
        : null;

  return {
    user,
    player: (player as AuthPlayer | null) ?? null,
    memberships: normalizedMemberships,
    activeClubId,
    isPowerUser,
  };
}