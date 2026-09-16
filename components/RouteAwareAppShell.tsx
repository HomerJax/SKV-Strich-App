"use client";

import { usePathname } from "next/navigation";

type RouteAwareAppShellProps = {
  children: React.ReactNode;
  header: React.ReactNode;
  achievementTeaser: React.ReactNode;
  authChrome: React.ReactNode;
};

export default function RouteAwareAppShell({
  children,
  header,
  achievementTeaser,
  authChrome,
}: RouteAwareAppShellProps) {
  const pathname = usePathname();
  const isMarketingLanding = pathname === "/";

  if (isMarketingLanding) {
    return <>{children}</>;
  }

  return (
    <>
      {header}

      <div className="min-h-[100dvh] w-full min-w-0 overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top)+3px)] sm:pt-[calc(4.5rem+env(safe-area-inset-top)+3px)]">
        {achievementTeaser}
        {children}
      </div>

      {authChrome}
    </>
  );
}
