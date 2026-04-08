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

  const [
    { data: player, error: playerError },
    { data: memberships, error: membershipsError },
    { data: roleRow, error: roleError },
  ] = await Promise.all([
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

  let activeClubId: string | null = null;
  let finalMemberships = [...normalizedMemberships];

  if (isPowerUser) {
    if (cookieClubId) {
      const { data: selectedClub, error: selectedClubError } = await supabase
        .from("clubs")
        .select("id")
        .eq("id", cookieClubId)
        .maybeSingle<{ id: string }>();

      if (selectedClubError) {
        throw new Error(
          `Failed to validate active club for power user: ${selectedClubError.message}`
        );
      }

      if (selectedClub) {
        activeClubId = selectedClub.id;

        const alreadyInMemberships = finalMemberships.some(
          (membership) => membership.club_id === selectedClub.id
        );

        if (!alreadyInMemberships) {
          finalMemberships = [
            ...finalMemberships,
            {
              id: -1,
              club_id: selectedClub.id,
              user_id: user.id,
              role: "power_user",
            },
          ];
        }
      }
    }

    if (!activeClubId && finalMemberships.length > 0) {
      activeClubId = finalMemberships[0].club_id;
    }
  } else {
    const hasCookieMembership = cookieClubId
      ? finalMemberships.some((membership) => membership.club_id === cookieClubId)
      : false;

    if (hasCookieMembership) {
      activeClubId = cookieClubId;
    } else if (finalMemberships.length === 1) {
      activeClubId = finalMemberships[0].club_id;
    } else {
      activeClubId = null;
    }
  }

  return {
    user,
    player: (player as AuthPlayer | null) ?? null,
    memberships: finalMemberships,
    activeClubId,
    isPowerUser,
  };
}