"use client";

import { Capacitor } from "@capacitor/core";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const RESTORABLE_PREFIXES = [
  "/home",
  "/sessions",
  "/stats",
  "/standings",
  "/profile",
  "/mannschaftskasse",
  "/chat",
  "/admin",
  "/hall-of-fame",
];

export default function NativeLastRouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
      return;
    }

    if (!RESTORABLE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return;
    }

    document.cookie = `strikr_last_path=${encodeURIComponent(pathname)}; Path=/; Max-Age=604800; SameSite=Lax; Secure`;
  }, [pathname]);

  return null;
}
