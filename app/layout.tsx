import "./globals.css";
import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import AppBottomNav from "@/components/AppBottomNav";
import InAppNotificationCenter from "@/components/InAppNotificationCenter";
import { getAuthContext } from "@/lib/auth/context";

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
    ? ctx.memberships.find(
        (membership) => membership.club_id === ctx.activeClubId
      ) ?? null
    : null;

  const isAdmin = ctx.isPowerUser || activeMembership?.role === "admin";

  return (
    <html lang="de">
      <body className="min-h-screen bg-neutral-100 text-slate-950 antialiased">
        <AppHeader />
        {ctx.user ? <InAppNotificationCenter /> : null}
        <div className="min-h-[100dvh] pb-20">{children}</div>
        <AppBottomNav isAdmin={isAdmin} />
      </body>
    </html>
  );
}