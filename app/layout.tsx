import "./globals.css";
import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import AppBottomNav from "@/components/AppBottomNav";

export const metadata: Metadata = {
  title: "strikr",
  description: "Fußball-Trainings organisieren mit strikr",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="bg-neutral-50 text-neutral-900">
        <AppHeader />
        <div className="min-h-[100dvh] pb-20">{children}</div>
        <AppBottomNav />
      </body>
    </html>
  );
}