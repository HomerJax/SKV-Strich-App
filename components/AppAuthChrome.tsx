import AppBottomNav from "@/components/AppBottomNav";
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
      <NotificationToastCenter />
      <NativePushRegistration />
      <AppBottomNav isAdmin={isAdmin} />
    </>
  );
}
