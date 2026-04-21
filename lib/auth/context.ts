import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AuthPlayer = {
  id: number;
  user_id: string | null;
  club_id: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
};

export type AuthMembership = {
  id: string;
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

function isAdminLikeRole(role: string | null | undefined) {
  return role === "admin" || role === "power_user";
}

export function getActiveMembership(
  ctx: Pick<AuthContext, "memberships" | "activeClubId">
): AuthMembership | null {
  if (!ctx.activeClubId) return null;

  return (
    ctx.memberships.find(
      (membership) => membership.club_id === ctx.activeClubId
    ) ?? null
  );
}

export function isActiveClubAdmin(
  ctx: Pick<AuthContext, "memberships" | "activeClubId" | "isPowerUser">
): boolean {
  if (ctx.isPowerUser) return true;

  const activeMembership = getActiveMembership(ctx);
  return isAdminLikeRole(activeMembership?.role ?? null);
}

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
    { data: players, error: playersError },
    { data: memberships, error: membershipsError },
    { data: roleRow, error: roleError },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id, user_id, club_id, first_name, last_name, nickname")
      .eq("user_id", user.id)
      .eq("is_guest", false),
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

  if (playersError) {
    throw new Error(`Failed to load players: ${playersError.message}`);
  }

  if (membershipsError) {
    throw new Error(`Failed to load memberships: ${membershipsError.message}`);
  }

  if (roleError) {
    throw new Error(`Failed to load user role: ${roleError.message}`);
  }

  const normalizedPlayers = ((players ?? []) as AuthPlayer[]).filter(
    (player) => !!player.club_id
  );
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
              id: "__power_user__",
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

  let activePlayer: AuthPlayer | null = null;

  if (activeClubId) {
    activePlayer =
      normalizedPlayers.find((player) => player.club_id === activeClubId) ?? null;
  }

  if (
    !activePlayer &&
    normalizedMemberships.length === 1 &&
    normalizedPlayers.length === 1 &&
    normalizedPlayers[0].club_id === normalizedMemberships[0].club_id
  ) {
    activeClubId = normalizedMemberships[0].club_id;
    activePlayer = normalizedPlayers[0];
  }

  return {
    user,
    player: activePlayer,
    memberships: finalMemberships,
    activeClubId,
    isPowerUser,
  };
}