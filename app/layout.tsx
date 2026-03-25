import "./globals.css";
import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import AppBottomNav from "@/components/AppBottomNav";
import { getAuthContext } from "@/lib/auth/context";

export const metadata: Metadata = {
  title: "strikr",
  description: "Fußball-Trainings organisieren mit strikr",
};

function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ctx = await getAuthContext();

  const activeMembership =
    ctx.activeClubId && ctx.memberships.length
      ? ctx.memberships.find((membership) => membership.club_id === ctx.activeClubId) ?? null
      : null;

  const isAdmin = isAdminRole(activeMembership?.role);

  return (
    <html lang="de">
      <body className="bg-neutral-50 text-neutral-900">
        <AppHeader />
        <div className="min-h-[100dvh] pb-20">{children}</div>
        <AppBottomNav isAdmin={isAdmin} />
      </body>
    </html>
  );
}