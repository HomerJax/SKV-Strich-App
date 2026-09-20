"use client";

import { Capacitor } from "@capacitor/core";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const COOKIE_NAME = "strikr_last_path";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function isRestorablePath(pathname: string) {
  if (!pathname || pathname === "/") return false;

  return ![
    "/login",
    "/signup",
    "/auth",
    "/join",
    "/forgot-password",
    "/reset-password",
  ].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function NativeLastPathTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
      return;
    }

    if (!isRestorablePath(pathname)) return;

    const target = `${pathname}${window.location.search}`;
    document.cookie = [
      `${COOKIE_NAME}=${encodeURIComponent(target)}`,
      "Path=/",
      `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
      "SameSite=Lax",
      "Secure",
    ].join("; ");
  }, [pathname]);

  return null;
}
