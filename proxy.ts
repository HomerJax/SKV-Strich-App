import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const NATIVE_IOS_MARKER = "strikr-ios";

export async function proxy(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";

  if (
    request.nextUrl.pathname === "/" &&
    userAgent.toLowerCase().includes(NATIVE_IOS_MARKER)
  ) {
    return NextResponse.redirect(new URL("/home", request.url), 307);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
