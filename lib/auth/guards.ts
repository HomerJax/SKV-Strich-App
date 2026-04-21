import { redirect } from "next/navigation";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { getAuthContext } from "@/lib/auth/context";

type GuardMembership = {
  club_id: string;
  role: string;
};

export async function requireUser() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect(AUTH_ROUTES.login);
  }

  return ctx.user;
}

export async function requirePlayer() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect(AUTH_ROUTES.login);
  }

  if (!ctx.memberships.length && !ctx.isPowerUser) {
    redirect(AUTH_ROUTES.onboarding);
  }

  if (!ctx.activeClubId && !ctx.isPowerUser) {
    redirect(AUTH_ROUTES.selectClub);
  }

  if (!ctx.player && !ctx.isPowerUser) {
    redirect(AUTH_ROUTES.onboarding);
  }

  return {
    user: ctx.user,
    player: ctx.player,
    isPowerUser: ctx.isPowerUser,
  };
}

export async function requireClub() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect(AUTH_ROUTES.login);
  }

  if (!ctx.memberships.length && !ctx.isPowerUser) {
    redirect(AUTH_ROUTES.selectClub);
  }

  if (!ctx.activeClubId) {
    redirect(AUTH_ROUTES.selectClub);
  }

  const membership =
    ctx.memberships.find((m) => m.club_id === ctx.activeClubId) ??
    (ctx.isPowerUser
      ? {
          club_id: ctx.activeClubId,
          role: "power_user",
        }
      : null);

  if (!membership) {
    redirect(AUTH_ROUTES.selectClub);
  }

  if (!ctx.player && !ctx.isPowerUser) {
    redirect(AUTH_ROUTES.onboarding);
  }

  return {
    user: ctx.user,
    player: ctx.player,
    clubId: ctx.activeClubId,
    membership: membership as GuardMembership,
    memberships: ctx.memberships,
    isPowerUser: ctx.isPowerUser,
  };
}