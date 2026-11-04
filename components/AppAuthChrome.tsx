import FirstRunTour from "@/components/onboarding/FirstRunTour";\nimport AppBottomNav from "@/components/AppBottomNav";
import BigUpdateLaunchModal from "@/components/notifications/BigUpdateLaunchModal";
import CareerBadgeLaunchModal from "@/components/notifications/CareerBadgeLaunchModal";
import { NotificationToastCenter } from "@/components/notifications/NotificationToastCenter";
import NativePushRegistration from "@/components/native/NativePushRegistration";
import { getAuthContext } from "@/lib/auth/context";
import { isAdminRole } from "@/lib/auth/access";

export default async function AppAuthChrome() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return null;
  }

  const activeMembership = ctx.activeClubId
    ? (ctx.memberships.find(
        (membership) => membership.club_id === ctx.activeClubId
      ) ?? null)
    : null;

  const isAdmin =
    ctx.isPowerUser || isAdminRole(activeMembership?.role ?? null);

  return (
    <>
      <BigUpdateLaunchModal />
      <CareerBadgeLaunchModal />
      {ctx.activeClubId && ctx.user.created_at && new Date(ctx.user.created_at).getTime() >= Date.parse("2026-11-04T00:00:00Z") ? (\n        <FirstRunTour userId={ctx.user.id} role={isAdmin ? "admin" : "player"} />\n      ) : null}\n      <NotificationToastCenter />
      <NativePushRegistration />
      <AppBottomNav isAdmin={isAdmin} />
    </>
  );
}
