import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import WaitingForInviteContent from "@/components/onboarding/WaitingForInviteContent";

export default async function WaitingForInvitePage() {
  const ctx = await getAuthContext();

  if (!ctx.user) redirect(AUTH_ROUTES.login);
  if (!ctx.player) redirect(AUTH_ROUTES.onboarding);
  if (ctx.memberships.length > 0) {
    if (ctx.activeClubId) redirect(AUTH_ROUTES.dashboard);
    redirect(AUTH_ROUTES.selectClub);
  }

  return <WaitingForInviteContent />;
}
