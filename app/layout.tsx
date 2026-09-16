import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import AppHeader from "@/components/AppHeader";
import AppAuthChrome from "@/components/AppAuthChrome";
import RouteAwareAppShell from "@/components/RouteAwareAppShell";
import HomeAchievementTeaser from "@/components/home/HomeAchievementTeaser";
import NativeDeepLinkHandler from "@/components/native/NativeDeepLinkHandler";
import GlobalActionFeedback from "@/components/ui/GlobalActionFeedback";
import PublicDemoLauncher from "@/components/demo/PublicDemoLauncher";

const marketingTitle = "strikr – Jedes Training zählt. | Training redefined.";
const marketingDescription =
  "Macht aus euren Trainingsspielen eine Saison: faire Teams, Ergebnisse, Tabelle, persönliche Stats, Vergleiche und Trophäen – automatisch mit strikr.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.strikr.team"),
  title: marketingTitle,
  description: marketingDescription,
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "strikr",
    title: marketingTitle,
    description: marketingDescription,
  },
  twitter: {
    card: "summary",
    title: marketingTitle,
    description: marketingDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

function HeaderFallback() {
  return (
    <header className="fixed inset-x-0 top-0 z-[350] w-full border-b border-slate-200 border-t-[3px] border-t-slate-950 bg-white pt-[env(safe-area-inset-top)] shadow-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-2.5 sm:h-[72px] sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-950 sm:h-11 sm:w-11" />
          <span className="lowercase text-[27px] font-black leading-none tracking-[-0.04em] text-slate-950 sm:text-[36px]">
            strikr
          </span>
        </div>
        <div className="h-9 w-20 animate-pulse rounded-full bg-slate-100" />
      </div>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-neutral-100 text-slate-950 antialiased">
        <NativeDeepLinkHandler />
        <GlobalActionFeedback />
        <PublicDemoLauncher />

        <RouteAwareAppShell
          header={
            <Suspense fallback={<HeaderFallback />}>
              <AppHeader />
            </Suspense>
          }
          achievementTeaser={<HomeAchievementTeaser />}
          authChrome={
            <Suspense fallback={null}>
              <AppAuthChrome />
            </Suspense>
          }
        >
          {children}
        </RouteAwareAppShell>

        <Analytics />
      </body>
    </html>
  );
}
