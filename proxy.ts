import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const NATIVE_IOS_MARKER = "strikr-ios";

const PUBLIC_SEO_LOCALES: Record<string, "de" | "en"> = {
  "/": "de",
  "/en": "en",
  "/faire-fussballteams": "de",
  "/training-organisieren": "de",
  "/mannschaftskasse-app": "de",
  "/freizeitmannschaft-organisieren": "de",
  "/tabelle-freizeitfussball": "de",
  "/en/faire-fussballteams": "en",
  "/en/training-organisieren": "en",
  "/en/mannschaftskasse-app": "en",
  "/en/freizeitmannschaft-organisieren": "en",
  "/en/tabelle-freizeitfussball": "en",
};
// Native iOS cold starts must land on Home, not the previous visited path.
// Protected live games are restored by NativeHomeOnResume after hydration.

export async function proxy(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";

  if (
    request.nextUrl.pathname === "/" &&
    userAgent.toLowerCase().includes(NATIVE_IOS_MARKER)
  ) {
    return NextResponse.redirect(
      new URL("/home", request.url),
      307,
    );
  }

  const requestHeaders = new Headers(request.headers);
  const publicSeoLocale = PUBLIC_SEO_LOCALES[request.nextUrl.pathname];
  if (publicSeoLocale) {
    requestHeaders.set("x-strikr-public-locale", publicSeoLocale);
  }

  return updateSession(request, requestHeaders);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
