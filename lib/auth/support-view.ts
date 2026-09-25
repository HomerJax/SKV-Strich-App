import "server-only";

import { cache } from "react";
import type { AuthContext, AuthPlayer } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

type SupportMembershipRow = {
  user_id: string;
  role: string | null;
};

export type SupportViewPlayer = {
  player: AuthPlayer;
  role: string;
  label: string;
};

function displayPlayerName(player: AuthPlayer) {
  const nickname = player.nickname?.trim();
  if (nickname) return nickname;

  const fullName = [player.first_name, player.last_name]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Admin";
}

const loadSupportViewPlayer = cache(
  async (clubId: string): Promise<SupportViewPlayer | null> => {
    const admin = createAdminClient();

    const { data: memberships, error: membershipError } = await admin
      .from("club_memberships")
      .select("user_id, role")
      .eq("club_id", clubId)
      .in("role", ["owner", "admin"]);

    if (membershipError) {
      throw new Error(
        `Support-Admin konnte nicht geladen werden: ${membershipError.message}`,
      );
    }

    const rows = (memberships ?? []) as SupportMembershipRow[];
    const orderedMemberships = [...rows].sort((a, b) => {
      const roleWeight = (role: string | null) =>
        role === "owner" ? 0 : role === "admin" ? 1 : 2;
      return roleWeight(a.role) - roleWeight(b.role);
    });
    const userIds = orderedMemberships
      .map((membership) => membership.user_id)
      .filter(Boolean);

    if (userIds.length > 0) {
      const { data: players, error: playerError } = await admin
        .from("players")
        .select("id, user_id, club_id, first_name, last_name, nickname")
        .eq("club_id", clubId)
        .eq("is_guest", false)
        .in("user_id", userIds);

      if (playerError) {
        throw new Error(
          `Support-Spieler konnte nicht geladen werden: ${playerError.message}`,
        );
      }

      const playerRows = (players ?? []) as AuthPlayer[];

      for (const membership of orderedMemberships) {
        const player = playerRows.find(
          (candidate) => candidate.user_id === membership.user_id,
        );
        if (!player) continue;

        return {
          player,
          role: membership.role ?? "admin",
          label: displayPlayerName(player),
        };
      }
    }

    const { data: fallbackPlayer, error: fallbackError } = await admin
      .from("players")
      .select("id, user_id, club_id, first_name, last_name, nickname")
      .eq("club_id", clubId)
      .eq("is_guest", false)
      .not("user_id", "is", null)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle<AuthPlayer>();

    if (fallbackError) {
      throw new Error(
        `Support-Fallbackspieler konnte nicht geladen werden: ${fallbackError.message}`,
      );
    }

    if (!fallbackPlayer) return null;

    return {
      player: fallbackPlayer,
      role: "member",
      label: displayPlayerName(fallbackPlayer),
    };
  },
);

export async function getSupportViewPlayer(
  ctx: Pick<AuthContext, "isPowerUser" | "activeClubId" | "player">,
): Promise<SupportViewPlayer | null> {
  if (!ctx.isPowerUser || !ctx.activeClubId || ctx.player) {
    return null;
  }

  return loadSupportViewPlayer(ctx.activeClubId);
}
