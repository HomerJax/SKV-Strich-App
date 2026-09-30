"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SKIP_PREFIXES = ["/login","/signup","/join","/onboarding","/datenschutz","/impressum","/power-user","/api"];

export function trackProductEvent(event: string, metadata?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event, path: window.location.pathname, metadata }),
    keepalive: true,
  }).catch(() => undefined);
}

export default function ProductAnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (SKIP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) return;

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
