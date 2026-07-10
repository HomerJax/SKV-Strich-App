import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import AppBottomNav from "@/components/AppBottomNav";
import { NotificationToastCenter } from "@/components/notifications/NotificationToastCenter";
import WhatsNewModal from "@/components/WhatsNewModal";
import { getAuthContext } from "@/lib/auth/context";
import { isAdminRole } from "@/lib/auth/access";
import NativePushRegistration from "@/components/native/NativePushRegistration";

export const metadata: Metadata = {
  title: "strikr",
  description: "Trainings, Teams und Ergebnisse an einem Ort.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ctx = await getAuthContext();

  const activeMembership = ctx.activeClubId
    ? (ctx.memberships.find(
        (membership) => membership.club_id === ctx.activeClubId,
      ) ?? null)
    : null;

  const isAdmin =
    ctx.isPowerUser || isAdminRole(activeMembership?.role ?? null);

  return (
    <html lang="de">
      <body className="min-h-screen bg-neutral-100 text-slate-950 antialiased">
        <AppHeader />

        {ctx.user ? (
          <>
            <WhatsNewModal version="v1.0" />
            <NotificationToastCenter />
            <NativePushRegistration />
          </>
        ) : null}

        <div className="min-h-[100dvh] pb-20">{children}</div>

        {ctx.user ? <AppBottomNav isAdmin={isAdmin} /> : null}
        <Analytics />
      </body>
    </html>
  );
}
