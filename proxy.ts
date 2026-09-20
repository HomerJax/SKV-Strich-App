import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const NATIVE_IOS_MARKER = "strikr-ios";
const LAST_NATIVE_PATH_COOKIE = "strikr_last_path";

function getSafeNativeRestorePath(rawValue: string | undefined) {
  if (!rawValue) return "/home";

  let decoded = rawValue;
  try {
    decoded = decodeURIComponent(rawValue);
  } catch {
    return "/home";
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/home";

  const pathname = decoded.split(/[?#]/, 1)[0] || "/";
  const blockedPrefixes = [
    "/login",
    "/signup",
    "/auth",
    "/join",
    "/forgot-password",
    "/reset-password",
  ];

  if (
    pathname === "/" ||
    blockedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return "/home";
  }

  return decoded;
}
const RESTORABLE_NATIVE_PREFIXES = [
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

function getRestorableNativePath(request: NextRequest) {
  const raw = request.cookies.get("strikr_last_path")?.value;
  if (!raw) return "/home";

  let pathname = "";
  try {
    pathname = decodeURIComponent(raw);
  } catch {
    return "/home";
  }

  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    return "/home";
  }

  return RESTORABLE_NATIVE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
    ? pathname
    : "/home";
}

export async function proxy(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";

  if (
    request.nextUrl.pathname === "/" &&
    userAgent.toLowerCase().includes(NATIVE_IOS_MARKER)
  ) {
    return NextResponse.redirect(
      new URL(getRestorableNativePath(request), request.url),
      307,
    );
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
