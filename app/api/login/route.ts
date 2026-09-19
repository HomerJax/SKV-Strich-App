import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AUTH_ROUTES } from "@/lib/auth/routes";

type MembershipRow = {
  id: string;
  club_id: string;
  user_id: string;
  role: string | null;
};

function buildRedirect(request: NextRequest, path: string) {
  return new URL(path, request.url);
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
  return to;
}

function successResponse(
  request: NextRequest,
  cookieSource: NextResponse,
  path: string,
  native: boolean,
) {
  if (native) {
    return copyCookies(
      cookieSource,
      NextResponse.json({ ok: true, target: path }),
    );
  }

  return copyCookies(
    cookieSource,
    NextResponse.redirect(buildRedirect(request, path), { status: 303 }),
  );
}

function errorResponse(
  request: NextRequest,
  code: string,
  email: string,
  next: string,
  native: boolean,
) {
  if (native) {
    return NextResponse.json({ ok: false, error: code }, { status: 400 });
  }

  const nextQuery = next ? `&next=${encodeURIComponent(next)}` : "";
  return NextResponse.redirect(
    buildRedirect(
      request,
      `/login?error=${encodeURIComponent(code)}&email=${encodeURIComponent(email)}${nextQuery}`,
    ),
    { status: 303 },
  );
}

function normalizeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "").trim();

  if (!next) return "";
  if (!next.startsWith("/")) return "";
  if (next.startsWith("//")) return "";

  return next;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const next = normalizeNext(formData.get("next"));
  const native =
    String(formData.get("json") ?? "") === "1" ||
    request.headers.get("x-strikr-login-mode") === "json" ||
    request.headers.get("accept")?.includes("application/json") === true;

  if (!email || !password) {
    return errorResponse(request, "missing-fields", email, next, native);
  }

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError || !signInData.user) {
    return errorResponse(request, "invalid-credentials", email, next, native);
  }

  const user = signInData.user;

  if (next) {
    return successResponse(request, response, next, native);
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("club_memberships")
    .select("id, club_id, user_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    return errorResponse(
      request,
      `membership-load-failed:${membershipsError.message}`,
      email,
      next,
      native,
    );
  }

  const normalizedMemberships = (memberships ?? []) as MembershipRow[];

  if (!normalizedMemberships.length) {
    const { data: players, error: playerError } = await supabase
      .from("players")
      .select("id, user_id, club_id, first_name, last_name, nickname")
      .eq("user_id", user.id)
      .eq("is_guest", false);

    if (playerError) {
      return errorResponse(
        request,
        `player-load-failed:${playerError.message}`,
        email,
        next,
        native,
      );
    }

    const hasAnyPlayerProfile = (players ?? []).length > 0;

    return successResponse(
      request,
      response,
      hasAnyPlayerProfile
        ? AUTH_ROUTES.waitingForInvite
        : AUTH_ROUTES.onboarding,
      native,
    );
  }

  const existingActiveClubId =
    request.cookies.get("active_club_id")?.value ?? null;

  const hasExistingMembership = existingActiveClubId
    ? normalizedMemberships.some(
        (membership) => membership.club_id === existingActiveClubId
      )
    : false;

  let targetPath: string = AUTH_ROUTES.selectClub;

  if (normalizedMemberships.length === 1) {
    response.cookies.set("active_club_id", normalizedMemberships[0].club_id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
    });

    targetPath = AUTH_ROUTES.dashboard;
  } else if (hasExistingMembership && existingActiveClubId) {
    response.cookies.set("active_club_id", existingActiveClubId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
    });

    targetPath = AUTH_ROUTES.dashboard;
  }

  return successResponse(request, response, targetPath, native);
}