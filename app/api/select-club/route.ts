import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clubId = url.searchParams.get("clubId");

  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect(AUTH_ROUTES.login);
  }

  if (!ctx.player) {
    redirect(AUTH_ROUTES.onboarding);
  }

  if (!clubId) {
    redirect(AUTH_ROUTES.selectClub);
  }

  const membership = ctx.memberships.find((m) => m.club_id === clubId);

  if (!membership) {
    redirect(AUTH_ROUTES.selectClub);
  }

  const cookieStore = await cookies();

  cookieStore.set("active_club_id", clubId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });

  redirect(AUTH_ROUTES.dashboard);
}