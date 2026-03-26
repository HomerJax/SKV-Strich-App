import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { AUTH_ROUTES } from "@/lib/auth/routes";

type MembershipRow = {
  id: number;
  club_id: string;
  user_id: string;
  role: string | null;
};

function buildRedirect(request: NextRequest, path: string) {
  return new URL(path, request.url);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    const url = buildRedirect(
      request,
      `/login?error=missing-fields&email=${encodeURIComponent(email)}`
    );
    return NextResponse.redirect(url, { status: 303 });
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
    const url = buildRedirect(
      request,
      `/login?error=invalid-credentials&email=${encodeURIComponent(email)}`
    );
    return NextResponse.redirect(url, { status: 303 });
  }

  const user = signInData.user;

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, user_id, first_name, last_name, nickname")
    .eq("user_id", user.id)
    .maybeSingle();

  if (playerError) {
    const url = buildRedirect(
      request,
      `/login?error=${encodeURIComponent(
        `player-load-failed:${playerError.message}`
      )}&email=${encodeURIComponent(email)}`
    );
    return NextResponse.redirect(url, { status: 303 });
  }

  if (!player) {
    const redirectResponse = NextResponse.redirect(
      buildRedirect(request, AUTH_ROUTES.onboarding),
      { status: 303 }
    );

    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }

    return redirectResponse;
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("club_memberships")
    .select("id, club_id, user_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    const url = buildRedirect(
      request,
      `/login?error=${encodeURIComponent(
        `membership-load-failed:${membershipsError.message}`
      )}&email=${encodeURIComponent(email)}`
    );
    return NextResponse.redirect(url, { status: 303 });
  }

  const normalizedMemberships = (memberships ?? []) as MembershipRow[];

  if (!normalizedMemberships.length) {
    const redirectResponse = NextResponse.redirect(
      buildRedirect(request, AUTH_ROUTES.waitingForInvite),
      { status: 303 }
    );

    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }

    return redirectResponse;
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

  const redirectResponse = NextResponse.redirect(
    buildRedirect(request, targetPath),
    { status: 303 }
  );

  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }

  return redirectResponse;
}