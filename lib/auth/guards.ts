import { redirect } from "next/navigation";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { getAuthContext } from "@/lib/auth/context";

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

  if (!ctx.player && !ctx.isPowerUser) {
    redirect(AUTH_ROUTES.onboarding);
  }

  if (!ctx.memberships.length || !ctx.activeClubId) {
    redirect(AUTH_ROUTES.selectClub);
  }

  const membership =
    ctx.memberships.find((m) => m.club_id === ctx.activeClubId) ?? null;

  if (!membership) {
    redirect(AUTH_ROUTES.selectClub);
  }

  return {
    user: ctx.user,
    player: ctx.player,
    clubId: ctx.activeClubId,
    membership,
    memberships: ctx.memberships,
    isPowerUser: ctx.isPowerUser,
  };
}