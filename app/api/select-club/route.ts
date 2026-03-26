import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";

function buildRedirect(request: Request, path: string) {
  return new URL(path, request.url);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const clubId = String(formData.get("club_id") ?? "").trim();

  const ctx = await getAuthContext();

  if (!ctx.user) {
    return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.login), {
      status: 303,
    });
  }

  if (!ctx.player) {
    return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.onboarding), {
      status: 303,
    });
  }

  if (!clubId) {
    return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.selectClub), {
      status: 303,
    });
  }

  const membership = ctx.memberships.find((m) => m.club_id === clubId);

  if (!membership) {
    return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.selectClub), {
      status: 303,
    });
  }

  const cookieStore = await cookies();
  cookieStore.set("active_club_id", clubId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.dashboard), {
    status: 303,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clubId = url.searchParams.get("clubId") ?? "";

  const ctx = await getAuthContext();

  if (!ctx.user) {
    return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.login), {
      status: 303,
    });
  }

  if (!ctx.player) {
    return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.onboarding), {
      status: 303,
    });
  }

  if (!clubId) {
    return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.selectClub), {
      status: 303,
    });
  }

  const membership = ctx.memberships.find((m) => m.club_id === clubId);

  if (!membership) {
    return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.selectClub), {
      status: 303,
    });
  }

  const cookieStore = await cookies();
  cookieStore.set("active_club_id", clubId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.redirect(buildRedirect(request, AUTH_ROUTES.dashboard), {
    status: 303,
  });
}